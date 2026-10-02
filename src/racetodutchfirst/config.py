"""guilds.toml: the guilds in the race and the raid tier they race through."""

from __future__ import annotations

import re
import tomllib
from dataclasses import dataclass
from pathlib import Path

_HEX_COLOUR = re.compile(r"^#[0-9a-fA-F]{6}$")


class ConfigError(ValueError):
    """guilds.toml is missing something or contradicts itself."""


@dataclass(frozen=True)
class Guild:
    name: str
    realm: str
    colour: str
    region: str = "eu"

    @property
    def realm_slug(self) -> str:
        # Raider.IO realm slugs: lower case, spaces become dashes, apostrophes go.
        return self.realm.lower().replace("'", "").replace(" ", "-")


@dataclass(frozen=True)
class Boss:
    raid: str
    slug: str
    name: str

    @property
    def key(self) -> str:
        return f"{self.raid}/{self.slug}"


@dataclass(frozen=True)
class Raid:
    slug: str
    name: str
    bosses: tuple[Boss, ...]


@dataclass(frozen=True)
class Tier:
    start: str
    raids: tuple[Raid, ...]
    ce_raid: str
    ce_boss: str

    @property
    def main_raid(self) -> Raid:
        """The raid whose current boss sets the fractional race position."""
        return self.raids[0]

    @property
    def total_bosses(self) -> int:
        return sum(len(r.bosses) for r in self.raids)

    def boss(self, raid: str, slug: str) -> Boss:
        for r in self.raids:
            if r.slug == raid:
                for b in r.bosses:
                    if b.slug == slug:
                        return b
        raise KeyError(f"{raid}/{slug}")


@dataclass(frozen=True)
class Config:
    guilds: tuple[Guild, ...]
    tier: Tier


def _title(slug: str) -> str:
    return " ".join(w.capitalize() for w in slug.split("-"))


def parse_config(data: dict) -> Config:
    guilds = []
    for g in data.get("guilds", []):
        try:
            guild = Guild(
                name=g["name"], realm=g["realm"], colour=g["colour"],
                region=g.get("region", "eu").lower(),
            )
        except KeyError as exc:
            raise ConfigError(f"guild entry {g!r} is missing {exc}") from exc
        if not _HEX_COLOUR.match(guild.colour):
            raise ConfigError(f"{guild.name}: colour must look like #12abef, got {guild.colour!r}")
        guilds.append(guild)
    if not guilds:
        raise ConfigError("guilds.toml lists no guilds")
    keys = [(g.region, g.realm_slug, g.name.casefold()) for g in guilds]
    if len(set(keys)) != len(keys):
        raise ConfigError("a guild is listed twice")

    t = data.get("tier") or {}
    raids = []
    for r in t.get("raids", []):
        bosses = tuple(
            Boss(raid=r["slug"], slug=b["slug"], name=b.get("name") or _title(b["slug"]))
            for b in r.get("bosses", [])
        )
        if not bosses:
            raise ConfigError(f"raid {r['slug']} has no bosses")
        raids.append(Raid(slug=r["slug"], name=r.get("name") or _title(r["slug"]), bosses=bosses))
    if not raids:
        raise ConfigError("tier.raids is empty")

    ce = t.get("ce_boss") or {}
    ce_raid = ce.get("raid", raids[0].slug)
    ce_slug = ce.get("boss", raids[0].bosses[-1].slug)
    tier = Tier(start=str(t["start"]), raids=tuple(raids), ce_raid=ce_raid, ce_boss=ce_slug)
    try:
        tier.boss(ce_raid, ce_slug)
    except KeyError as exc:
        raise ConfigError(f"tier.ce_boss {ce_raid}/{ce_slug} is not one of the tier's bosses") from exc
    return Config(guilds=tuple(guilds), tier=tier)


def load_config(path: Path) -> Config:
    with open(path, "rb") as f:
        return parse_config(tomllib.load(f))
