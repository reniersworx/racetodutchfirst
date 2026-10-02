"""Race to Dutch First – fetcher.

Reads guilds.toml, calls the Raider.IO API, and writes site/data/race.json.
All UI text in this project is in Dutch.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import httpx
import tomli

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BASE = Path(__file__).resolve().parent.parent.parent  # project root
GUILDS_TOML = BASE / "guilds.toml"
OUTPUT = BASE / "site" / "data" / "race.json"
RAIDER_IO = "https://raider.io/api/v1"
USER_AGENT = "RaceToDutchFirst (https://github.com/reniersworx/racetodutchfirst)"
REQUEST_DELAY = 0.3  # seconds between requests


def load_guilds() -> list[dict]:
    """Load guild config from guilds.toml."""
    with open(GUILDS_TOML, "rb") as f:
        cfg = tomli.load(f)
    return cfg["guilds"]


def tier_config(cfg: dict) -> dict:
    """Return the tier section (with defaults)."""
    tier = cfg.get("tier", {})
    if "ce_boss" not in tier:
        # Last boss of last raid is Cutting Edge by default.
        raids = tier["raids"]
        last_raid = raids[-1]
        tier["ce_boss"] = last_raid["bosses"][-1]["slug"]
    return tier


def _profile_url(guild: dict) -> str:
    name = urllib.parse.quote_plus(guild["name"])
    return (
        f"{RAIDER_IO}/guilds/profile"
        f"?region=eu&realm={guild['realm'].lower()}&name={name}"
        "&fields=raid_progression,raid_rankings"
    )


def _boss_kill_url(guild: dict, raid_slug: str, boss_slug: str) -> str:
    name = urllib.parse.quote_plus(guild["name"])
    return (
        f"{RAIDER_IO}/guilds/boss-kill"
        f"?region=eu&realm={guild['realm'].lower()}&guild={name}"
        f"&raid={raid_slug}&boss={boss_slug}&difficulty=mythic"
    )


def _boss_progress_url(guild: dict, raid_slug: str, boss_slug: str) -> str:
    name = urllib.parse.quote_plus(guild["name"])
    return (
        f"{RAIDER_IO}/live-tracking/guild/boss-progress"
        f"?raid={raid_slug}&difficulty=mythic&boss={boss_slug}"
        f"&period=until_kill&region=eu&realm={guild['realm'].lower()}"
        f"&guild={name}"
    )


def _boss_pulls_url(guild: dict, raid_slug: str, boss_slug: str) -> str:
    name = urllib.parse.quote_plus(guild["name"])
    return (
        f"{RAIDER_IO}/live-tracking/guild/boss-pulls"
        f"?raid={raid_slug}&difficulty=mythic&boss={boss_slug}"
        f"&period=until_kill&region=eu&realm={guild['realm'].lower()}"
        f"&guild={name}"
    )


def _get(client: httpx.Client, url: str) -> dict:
    """GET a JSON response; returns {} on error."""
    resp = client.get(url, headers={"User-Agent": USER_AGENT})
    if resp.status_code != 200:
        print(f"  WARN: {url} → {resp.status_code}", file=sys.stderr)
        return {}
    return resp.json()


def _parse_iso(s: str | None) -> str | None:
    if not s:
        return None
    return s


def fetch_guild(client: httpx.Client, guild: dict, tier_cfg: dict) -> dict:
    """Fetch all data for one guild."""
    realm_slug = guild["realm"].lower()

    # 1. Profile → raid_progression + raid_rankings
    profile = _get(client, _profile_url(guild))
    progression = profile.get("raid_progression", {})
    rankings = profile.get("raid_rankings", {})

    va_prog = progression.get("the-venomous-abyss", {})
    tg_prog = progression.get("the-tidebound-grotto", {})

    # 2. Determine VA boss progress (current boss)
    #    Get the latest boss-progress for "latest" to find current boss
    va_latest = _get(client, _boss_progress_url(guild, "the-venomous-abyss", "latest"))
    va_boss_slug = None
    va_best_percent = 100.0
    va_pull_count = 0
    va_is_defeated = False
    va_boss_name = ""

    if va_latest:
        va_boss_slug = va_latest.get("boss", {}).get("slug")
        va_best_percent = va_latest.get("bestPercent", 100.0)
        va_pull_count = va_latest.get("pullCount", 0)
        va_is_defeated = va_latest.get("isDefeated", False)
        va_boss_name = va_latest.get("boss", {}).get("name", "")

    # 3. Boss pulls for current VA boss (for the curve)
    boss_pulls: list[dict] = []
    if va_boss_slug and not va_is_defeated:
        pulls_data = _get(client, _boss_pulls_url(guild, "the-venomous-abyss", va_boss_slug))
        boss_pulls = pulls_data.get("pulls", [])

    # 4. Boss kills for timeline (defeatedAt dates)
    mythic_va_kills = va_prog.get("mythic_bosses_killed", 0)
    boss_kill_dates: list[dict] = []

    # Only ask for bosses the guild has killed (VA bosses in order)
    va_raid = next((r for r in tier_cfg["raids"] if r["slug"] == "the-venomous-abyss"), None)
    va_bosses = [b["slug"] for b in (va_raid.get("bosses", []) if va_raid else [])]

    # Get kills for each VA boss up to the current one
    killed_count = 0
    for boss in va_bosses:
        if killed_count >= mythic_va_kills:
            break
        kill_data = _get(client, _boss_kill_url(guild, "the-venomous-abyss", boss))
        if kill_data and kill_data.get("kill"):
            kill_info = kill_data["kill"]
            boss_kill_dates.append({
                "boss": boss,
                "defeatedAt": _parse_iso(kill_info.get("defeatedAt")),
                "pulledAt": _parse_iso(kill_info.get("pulledAt")),
                "durationMs": kill_info.get("durationMs"),
            })
            killed_count += 1

    # Also get Tidebound Grotto kills if any
    mythic_tg_kills = tg_prog.get("mythic_bosses_killed", 0)
    tg_raid = next((r for r in tier_cfg["raids"] if r["slug"] == "the-tidebound-grotto"), None)
    tg_bosses = [b["slug"] for b in (tg_raid.get("bosses", []) if tg_raid else [])]
    for boss in tg_bosses:
        kill_data = _get(client, _boss_kill_url(guild, "the-tidebound-grotto", boss))
        if kill_data and kill_data.get("kill"):
            kill_info = kill_data["kill"]
            boss_kill_dates.append({
                "boss": f"the-tidebound-grotto:{boss}",
                "defeatedAt": _parse_iso(kill_info.get("defeatedAt")),
                "pulledAt": _parse_iso(kill_info.get("pulledAt")),
                "durationMs": kill_info.get("durationMs"),
            })

    # 5. Calculate race position
    total_mythic = mythic_va_kills + mythic_tg_kills
    # Progress on current VA boss: (100 - bestPercent) / 100
    if va_is_defeated:
        va_progress = 1.0  # fully killed
    elif va_boss_slug and va_pull_count > 0:
        va_progress = (100 - va_best_percent) / 100
    else:
        va_progress = 0.0

    race_position = total_mythic + va_progress

    return {
        "name": guild["name"],
        "realm": guild["realm"],
        "colour": guild["colour"],
        "rankings": rankings,
        "progression": {
            "the-venomous-abyss": {
                "mythic_bosses_killed": mythic_va_kills,
                "heroic_bosses_killed": va_prog.get("heroic_bosses_killed", 0),
                "total_bosses": va_prog.get("total_bosses", 9),
                "summary": va_prog.get("summary", []),
            },
            "the-tidebound-grotto": {
                "mythic_bosses_killed": mythic_tg_kills,
                "heroic_bosses_killed": tg_prog.get("heroic_bosses_killed", 0),
                "total_bosses": tg_prog.get("total_bosses", 1),
                "summary": tg_prog.get("summary", []),
            },
        },
        "current_boss": {
            "raid": "the-venomous-abyss",
            "boss": va_boss_slug or "",
            "bossName": va_boss_name,
            "bestPercent": round(va_best_percent, 2),
            "pullCount": va_pull_count,
            "isDefeated": va_is_defeated,
        },
        "race_position": round(race_position, 4),
        "boss_kill_dates": boss_kill_dates,
        "boss_pulls": boss_pulls,
    }


def rank_guilds(guild_data: list[dict]) -> list[dict]:
    """Rank guilds by the rules:
    1. Most Mythic kills (descending)
    2. Lowest best % on current VA boss (ascending = closer to kill)
    3. Latest kill first (earlier defeatedAt wins)
    4. Most Heroic kills (descending)
    """
    def sort_key(g: dict) -> tuple:
        va = g["progression"]["the-venomous-abyss"]
        tg = g["progression"]["the-tidebound-grotto"]
        total_mythic = va["mythic_bosses_killed"] + tg["mythic_bosses_killed"]
        total_heroic = va["heroic_bosses_killed"] + tg["heroic_bosses_killed"]

        # Latest kill date (earlier = better); use a far future date if none
        dates = [d["defeatedAt"] for d in g["boss_kill_dates"] if d.get("defeatedAt")]
        latest_kill = min(dates) if dates else "9999-12-31T23:59:59Z"

        # Best percent on current VA boss (lower = better); 100 if none
        cb = g["current_boss"]
        best_pct = cb["bestPercent"] if cb.get("boss") and not cb["isDefeated"] else 0.0
        if cb["isDefeated"]:
            best_pct = -1.0  # winner gets priority

        return (
            -total_mythic,       # most mythic first
            best_pct,            # lowest best % first
            latest_kill,         # earliest latest kill first
            -total_heroic,       # most heroic first
        )

    ranked = sorted(guild_data, key=sort_key)
    for i, g in enumerate(ranked):
        g["rank"] = i + 1
    return ranked


def main() -> None:
    """Fetch all guild data and write race.json."""
    print("Loading guild config…")
    cfg = tomli.load(open(GUILDS_TOML, "rb"))
    guilds = cfg["guilds"]
    tier_cfg = tier_config(cfg)

    print(f"Found {len(guilds)} guild(s). Fetching from Raider.IO…")
    client = httpx.Client(timeout=30.0)

    guild_data: list[dict] = []
    for i, guild in enumerate(guilds):
        print(f"  [{i+1}/{len(guilds)}] {guild['name']} ({guild['realm']})…")
        data = fetch_guild(client, guild, tier_cfg)
        guild_data.append(data)
        if i < len(guilds) - 1:
            time.sleep(REQUEST_DELAY)

    client.close()

    # Rank them
    ranked = rank_guilds(guild_data)

    now = datetime.now(timezone.utc).isoformat()
    output = {
        "generatedAt": now,
        "guilds": ranked,
        "tier": {
            "raids": [
                {
                    "slug": r["slug"],
                    "name": r["name"],
                    "bosses": [b["slug"] for b in r["bosses"]],
                }
                for r in tier_cfg["raids"]
            ],
            "ce_boss": tier_cfg["ce_boss"],
        },
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {OUTPUT}")
    for g in ranked:
        print(f"  #{g['rank']} {g['name']} – position {g['race_position']:.2f}")


if __name__ == "__main__":
    main()
