"""guilds.toml: the guilds in the race and the raid tier they race through."""

from __future__ import annotations

import re
import tomllib
from dataclasses import dataclass
from pathlib import Path

_HEX_COLOUR = re.compile(r"^#[0-9a-fA-F]{6}$")
_TWITCH_LOGIN = re.compile(r"^[a-z0-9_]{3,25}$")
_SEASON_ID = re.compile(r"^[a-z0-9-]{1,20}$")
_SEASON_FILE = re.compile(r"^data/[a-z0-9-]+\.json$")


class ConfigError(ValueError):
    """guilds.toml is missing something or contradicts itself."""


@dataclass(frozen=True)
class Guild:
    name: str
    realm: str
    colour: str
    region: str = "eu"
    wcl_id: int | None = None

    @property
    def realm_slug(self) -> str:
        # Raider.IO realm slugs: lower case, spaces become dashes, apostrophes go.
        return self.realm.lower().replace("'", "").replace(" ", "-")


@dataclass(frozen=True)
class Boss:
    raid: str
    slug: str
    name: str
    encounter: int | None = None  # Blizzard encounter ID (= WCL encounterID)

    @property
    def key(self) -> str:
        return f"{self.raid}/{self.slug}"


@dataclass(frozen=True)
class Raid:
    slug: str
    name: str
    bosses: tuple[Boss, ...]
    wcl_zone: int | None = None
    counts: bool = True  # False: shown, but its kills don't count for the race (race = false)


@dataclass(frozen=True)
class Tier:
    start: str
    raids: tuple[Raid, ...]
    ce_raid: str
    ce_boss: str
    id: str = "now"
    label: str | None = None
    end: str | None = None  # set on an archived season: the day it closed

    @property
    def main_raid(self) -> Raid:
        """The raid whose current boss sets the fractional race position."""
        return self.raids[0]

    @property
    def wcl_zones(self) -> tuple[int, ...]:
        return tuple(dict.fromkeys(r.wcl_zone for r in self.raids if r.wcl_zone))

    @property
    def race_raids(self) -> tuple[Raid, ...]:
        """The raids whose kills count for the race."""
        return tuple(r for r in self.raids if r.counts)

    @property
    def total_bosses(self) -> int:
        return sum(len(r.bosses) for r in self.race_raids)

    def boss(self, raid: str, slug: str) -> Boss:
        for r in self.raids:
            if r.slug == raid:
                for b in r.bosses:
                    if b.slug == slug:
                        return b
        raise KeyError(f"{raid}/{slug}")


@dataclass(frozen=True)
class Channel:
    twitch: str
    guild: str | None = None


@dataclass(frozen=True)
class Streams:
    channels: tuple[Channel, ...] = ()
    game: str | None = None


@dataclass(frozen=True)
class Season:
    """An earlier season, kept as a finished race.json-shaped file next to the site."""
    id: str
    label: str
    file: str  # path under site/, e.g. data/season-1.json


@dataclass(frozen=True)
class Config:
    guilds: tuple[Guild, ...]
    tier: Tier
    streams: Streams = Streams()
    seasons: tuple[Season, ...] = ()


def _title(slug: str) -> str:
    return " ".join(w.capitalize() for w in slug.split("-"))


def parse_config(data: dict) -> Config:
    guilds = []
    for g in data.get("guilds", []):
        try:
            guild = Guild(
                name=g["name"], realm=g["realm"], colour=g["colour"],
                region=g.get("region", "eu").lower(), wcl_id=g.get("wcl_id"),
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

    tier = parse_tier(data.get("tier") or {})
    return Config(guilds=tuple(guilds), tier=tier, streams=_streams(data.get("streams") or {}, guilds),
                  seasons=_seasons(data.get("seasons") or [], tier))


def parse_tier(t: dict) -> Tier:
    raids = []
    for r in t.get("raids", []):
        bosses = tuple(
            Boss(raid=r["slug"], slug=b["slug"], name=b.get("name") or _title(b["slug"]),
                 encounter=b.get("encounter"))
            for b in r.get("bosses", [])
        )
        if not bosses:
            raise ConfigError(f"raid {r['slug']} has no bosses")
        counts = r.get("race", True)
        if not isinstance(counts, bool):
            raise ConfigError(f"raid {r['slug']}: race must be true or false")
        raids.append(Raid(slug=r["slug"], name=r.get("name") or _title(r["slug"]), bosses=bosses,
                          wcl_zone=r.get("warcraft_logs_zone"), counts=counts))
    if not raids:
        raise ConfigError("tier.raids is empty")
    if not raids[0].counts:
        raise ConfigError(f"the first raid ({raids[0].slug}) is the main raid: it must count")

    ce = t.get("ce_boss") or {}
    ce_raid = ce.get("raid", raids[0].slug)
    ce_slug = ce.get("boss", raids[0].bosses[-1].slug)
    tid = str(t.get("id", "now"))
    if not _SEASON_ID.match(tid):
        raise ConfigError(f"tier.id must be a short slug like s2, got {tid!r}")
    tier = Tier(start=str(t["start"]), raids=tuple(raids), ce_raid=ce_raid, ce_boss=ce_slug,
                id=tid, label=t.get("label"), end=str(t["end"]) if t.get("end") else None)
    try:
        tier.boss(ce_raid, ce_slug)
    except KeyError as exc:
        raise ConfigError(f"tier.ce_boss {ce_raid}/{ce_slug} is not one of the tier's bosses") from exc
    if not next(r for r in raids if r.slug == ce_raid).counts:
        raise ConfigError(f"tier.ce_boss {ce_raid}/{ce_slug} is in a raid that doesn't count")
    return tier


def _seasons(data: list, tier: Tier) -> tuple[Season, ...]:
    out = []
    for s in data:
        try:
            season = Season(id=str(s["id"]), label=str(s["label"]), file=str(s["file"]))
        except KeyError as exc:
            raise ConfigError(f"seasons entry {s!r} is missing {exc}") from exc
        if not _SEASON_ID.match(season.id):
            raise ConfigError(f"seasons: id must be a short slug like s1, got {season.id!r}")
        if not _SEASON_FILE.match(season.file) or season.file == "data/race.json":
            raise ConfigError(f"seasons: {season.id}'s file must look like data/season-1.json")
        out.append(season)
    ids = [tier.id] + [s.id for s in out]
    if len(set(ids)) != len(ids):
        raise ConfigError("seasons: an id is used twice (the current tier's id counts too)")
    return tuple(out)


def _streams(data: dict, guilds: list[Guild]) -> Streams:
    names = {g.name for g in guilds}
    channels = []
    for c in data.get("channels", []):
        login = str(c.get("twitch", "")).strip().lower()
        if not _TWITCH_LOGIN.match(login):
            raise ConfigError(f"streams: {c.get('twitch')!r} is not a Twitch login")
        if c.get("guild") is not None and c["guild"] not in names:
            raise ConfigError(f"streams: {login}'s guild {c['guild']!r} isn't one of the guilds")
        channels.append(Channel(twitch=login, guild=c.get("guild")))
    if len({c.twitch for c in channels}) != len(channels):
        raise ConfigError("streams: a Twitch channel is listed twice")
    return Streams(channels=tuple(channels), game=data.get("game") or None)


def load_config(path: Path) -> Config:
    with open(path, "rb") as f:
        return parse_config(tomllib.load(f))


def load_tier(path: Path) -> Tier:
    """An archived season's file: only a [tier] table, in the same shape as guilds.toml's."""
    with open(path, "rb") as f:
        data = tomllib.load(f)
    if "tier" not in data:
        raise ConfigError(f"{path.name} has no [tier] table")
    return parse_tier(data["tier"])
