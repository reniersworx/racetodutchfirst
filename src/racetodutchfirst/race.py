"""Turns Raider.IO responses into the race: per-guild state, position, ranking, winner.

Traps found in the live data (2026-10-02), each covered by a test:
- Kill order isn't linear. Guilds skip bosses (RoyalTeam and Lelijkerds are 2/8
  with Entombed Sentinels still alive), so "the n-th boss" means nothing.
- boss-progress?boss=latest can be a boss that's already dead. Counting it as the
  current boss adds a phantom kill.
- Live tracking misses kills: Lelijkerds killed The Lost Explorers on 2026-09-24,
  but boss-progress still says isDefeated=false at 8.57%. boss-kill decides what
  is dead; live tracking only gives pull counts and best %.
- boss-kill answers {} (HTTP 200) for a boss that isn't killed.
- Warcraft Logs (optional) sees pulls live tracking misses (Kameraden: 64 pulls on
  Sszorak vs 41), but only what a guild logs: Lelijkerds' first logged Mythic kills
  are a week after their real ones. So per boss: earliest kill, most pulls up to
  that kill, lowest best %. Never "WCL wins".
- boss-pulls lists resets (is_reset, ~0 s long) that pullCount doesn't count.
- The profile also lists older raids (tier-mn-1, sporefall): read only our slugs.
"""

from __future__ import annotations

import sys
from datetime import UTC, datetime

from .config import Boss, Config, Guild, Tier
from .raiderio import RaiderIO
from .wcl import WarcraftLogs, WCLError

NO_PROGRESS = 100.0  # best % used for ranking when a guild has no pull on its current boss


def _warn(msg: str) -> None:
    print(f"waarschuwing: {msg}", file=sys.stderr)


def _int(value: object) -> int:
    return value if isinstance(value, int) and value > 0 else 0


def _pct(value: object) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return round(min(max(float(value), 0.0), 100.0), 2)
    return None


def _live_state(resp: dict) -> dict:
    """pullCount / bestPercent / isDefeated from a boss-progress answer; error → empty."""
    if not resp or resp.get("error"):
        return {"pullCount": 0, "bestPercent": None, "isDefeated": False, "name": None}
    pulls = _int(resp.get("pullCount"))
    return {
        "pullCount": pulls,
        "bestPercent": _pct(resp.get("bestPercent")) if pulls else None,
        "isDefeated": resp.get("isDefeated") is True,
        "name": (resp.get("boss") or {}).get("name"),
    }


def _find_kills(rio: RaiderIO, guild: Guild, bosses: tuple[Boss, ...], live: dict,
                expected: int) -> dict[str, dict]:
    """Ask boss-kill until the profile's kill count is found.

    Bosses live tracking calls dead go first, then ones with pulls, then the rest:
    with a linear order that asks only for killed bosses; with skipped bosses it
    costs an {} answer or two.
    """
    if expected <= 0:
        return {}
    order = sorted(
        range(len(bosses)),
        key=lambda i: (not live[bosses[i].slug]["isDefeated"],
                       live[bosses[i].slug]["pullCount"] == 0, i),
    )
    kills: dict[str, dict] = {}
    for i in order:
        if len(kills) >= expected:
            break
        boss = bosses[i]
        kill = rio.boss_kill(guild, boss.raid, boss.slug).get("kill") or {}
        if kill.get("defeatedAt"):
            kills[boss.slug] = kill
    if len(kills) != expected:
        _warn(f"{guild.name}: profiel zegt {expected} kills in {bosses[0].raid}, "
              f"boss-kill vond er {len(kills)}")
    return kills


def _pick_current(tier: Tier, states: dict[str, dict], latest: dict) -> Boss | None:
    """The boss the guild is working on: Raider.IO's latest boss if it's still alive,
    else the living boss of the main raid with the lowest best %, else the first
    living one. After a full main-raid clear the other raids get the same treatment."""
    latest_slug = (latest.get("boss") or {}).get("slug") if not latest.get("error") else None
    for raid in tier.raids:
        alive = [b for b in raid.bosses if states[b.key]["state"] != "killed"]
        if not alive:
            continue
        if raid is tier.main_raid and latest_slug and not latest.get("isDefeated"):
            for b in alive:
                if b.slug == latest_slug and states[b.key]["pullCount"]:
                    return b
        tried = [b for b in alive if states[b.key]["bestPercent"] is not None]
        if tried:
            return min(tried, key=lambda b: states[b.key]["bestPercent"])
        return alive[0]
    return None


def _pulls(resp: dict) -> list[dict]:
    out = []
    for p in resp.get("pulls") or []:
        d = p.get("details") or {}
        # A reset (boss reset within a second, no deaths) isn't a pull: Raider.IO's
        # own pullCount leaves it out too.
        if not d.get("pull_started_at") or d.get("is_reset"):
            continue
        health = (d.get("encounter_health") or {}).get("overall_percent")
        out.append({
            "at": d["pull_started_at"],
            "percent": _pct(health * 100) if isinstance(health, (int, float)) else None,
            "success": d.get("is_success") is True,
            "durationMs": d.get("duration_ms") if isinstance(d.get("duration_ms"), int) else None,
        })
    out.sort(key=lambda p: p["at"])
    return out


def _iso(ms: float) -> str:
    return datetime.fromtimestamp(ms / 1000, UTC).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z")


def merge_wcl(states: dict[str, dict], tier: Tier, fights: list[dict]) -> None:
    """Fold Warcraft Logs fights into the Raider.IO boss states, per boss."""
    by_enc: dict[int, list[dict]] = {}
    for f in sorted(fights, key=lambda f: f["start"]):
        by_enc.setdefault(f["encounter"], []).append(f)
    for raid in tier.raids:
        for b in raid.bosses:
            fs = by_enc.get(b.encounter) if b.encounter else None
            if not fs:
                continue
            st = states[b.key]
            rio_ms = _ts(st["defeatedAt"]).timestamp() * 1000 if st["defeatedAt"] else None
            wcl_kill = next((f for f in fs if f["kill"]), None)
            kill_ms = min(t for t in (rio_ms, wcl_kill and wcl_kill["end"]) if t) if (
                rio_ms or wcl_kill) else None
            # Up to and including the first kill: a reclear isn't progress.
            before = [f for f in fs if kill_ms is None or f["start"] < kill_ms]
            st["_wcl"] = before
            if len(before) > (st["pullCount"] or 0):
                st["pullCount"], st["pullSource"] = len(before), "warcraftlogs"
            if kill_ms is not None:
                if rio_ms is None or (wcl_kill and wcl_kill["end"] < rio_ms):
                    st["defeatedAt"] = _iso(wcl_kill["end"])
                st["state"], st["bestPercent"] = "killed", None
                continue
            tried = [f["percent"] for f in before if not f["kill"] and f["percent"] is not None]
            options = [p for p in (st["bestPercent"], min(tried) if tried else None) if p is not None]
            st["bestPercent"] = min(options) if options else None
            if st["pullCount"]:
                st["state"] = "progress"


def _wcl_pulls(fights: list[dict]) -> list[dict]:
    return [{"at": _iso(f["start"]), "percent": f["percent"], "success": f["kill"],
             "durationMs": max(0, int(f["end"] - f["start"]))} for f in fights]


def race_position(mythic_kills: int, current: dict | None) -> float:
    """Kills plus the fraction of the current boss already gone: 5 kills, best 27% → 5.73."""
    best = current.get("bestPercent") if current else None
    fraction = 0.0 if best is None else (100.0 - best) / 100.0
    return round(mythic_kills + min(max(fraction, 0.0), 1.0), 4)


def fetch_guild(rio: RaiderIO, guild: Guild, tier: Tier, wcl_fights: list[dict] | None = None,
                wcl_id: int | None = None) -> dict:
    profile = rio.profile(guild)
    progression = profile.get("raid_progression") or {}
    rankings = profile.get("raid_rankings") or {}

    raids: dict[str, dict] = {}
    states: dict[str, dict] = {}
    for raid in tier.raids:
        prog = progression.get(raid.slug)
        if prog is None:
            _warn(f"{guild.name}: geen {raid.slug} in het profiel")
            prog = {}
        mythic = _int(prog.get("mythic_bosses_killed"))
        ranks = (rankings.get(raid.slug) or {}).get("mythic") or {}
        raids[raid.slug] = {
            "mythic": mythic,
            "heroic": _int(prog.get("heroic_bosses_killed")),
            "total": len(raid.bosses),
            "summary": prog.get("summary"),
            "worldRank": _int(ranks.get("world")) or None,
            "regionRank": _int(ranks.get("region")) or None,
            "realmRank": _int(ranks.get("realm")) or None,
        }
        live = {b.slug: _live_state(rio.boss_progress(guild, raid.slug, b.slug))
                for b in raid.bosses}
        kills = _find_kills(rio, guild, raid.bosses, live, mythic)
        for b in raid.bosses:
            lv, kill = live[b.slug], kills.get(b.slug)
            if kill:
                state = "killed"
            elif lv["pullCount"]:
                state = "progress"
            else:
                state = "untouched"
            states[b.key] = {
                "raid": b.raid, "slug": b.slug, "name": lv["name"] or b.name, "state": state,
                "defeatedAt": kill["defeatedAt"] if kill else None,
                "pullCount": lv["pullCount"] or None,
                "pullSource": "raiderio" if lv["pullCount"] else None,
                "bestPercent": None if kill else lv["bestPercent"],
            }

    if wcl_fights:
        merge_wcl(states, tier, wcl_fights)
        for raid in tier.raids:
            killed = sum(states[b.key]["state"] == "killed" for b in raid.bosses)
            raids[raid.slug]["mythic"] = max(raids[raid.slug]["mythic"], killed)

    main = tier.main_raid
    latest: dict = {}
    if any(states[b.key]["state"] != "killed" for b in main.bosses):
        latest = rio.boss_progress(guild, main.slug, "latest")
    current_boss = _pick_current(tier, states, latest)
    current = None
    if current_boss:
        st = states[current_boss.key]
        if st["pullSource"] == "warcraftlogs":
            pulls = _wcl_pulls(st["_wcl"])
        elif st["pullCount"]:
            pulls = _pulls(rio.boss_pulls(guild, st["raid"], st["slug"]))
        else:
            pulls = []
        current = {
            "raid": st["raid"], "slug": st["slug"], "name": st["name"],
            "bestPercent": st["bestPercent"], "pullCount": st["pullCount"] or 0,
            "pullSource": st["pullSource"], "pulls": pulls,
        }
    for st in states.values():
        st.pop("_wcl", None)

    mythic_kills = sum(r["mythic"] for r in raids.values())
    kill_times = [s["defeatedAt"] for s in states.values() if s["defeatedAt"]]
    ce = states[f"{tier.ce_raid}/{tier.ce_boss}"]
    url = profile.get("profile_url")
    return {
        "name": profile.get("name") or guild.name,
        "realm": profile.get("realm") or guild.realm,
        "region": guild.region.upper(),
        "colour": guild.colour,
        "profileUrl": url if isinstance(url, str) and url.startswith("https://raider.io/") else None,
        "wclUrl": f"https://www.warcraftlogs.com/guild/id/{wcl_id}" if wcl_id else None,
        "sources": ["raiderio"] + (["warcraftlogs"] if wcl_fights else []),
        "mythicKills": mythic_kills,
        "heroicKills": sum(r["heroic"] for r in raids.values()),
        "totalBosses": tier.total_bosses,
        "worldRank": raids[main.slug]["worldRank"],
        "racePosition": race_position(mythic_kills, current),
        "latestKillAt": max(kill_times, key=_ts) if kill_times else None,
        "ceKilledAt": ce["defeatedAt"],
        "raids": raids,
        "bosses": [states[b.key] for r in tier.raids for b in r.bosses],
        "current": current,
    }


def _ts(iso: str) -> datetime:
    return datetime.fromisoformat(iso)


def rank_key(g: dict) -> tuple:
    """Most Mythic kills, then lowest best % on the current boss, then whoever got
    their latest kill first, then most Heroic kills."""
    best = (g.get("current") or {}).get("bestPercent")
    latest = _ts(g["latestKillAt"]).timestamp() if g.get("latestKillAt") else float("inf")
    return (-g["mythicKills"], NO_PROGRESS if best is None else best, latest,
            -g["heroicKills"], g["name"].casefold())


def rank_guilds(guilds: list[dict]) -> list[dict]:
    ranked = sorted(guilds, key=rank_key)
    for i, g in enumerate(ranked, start=1):
        g["rank"] = i
    return ranked


def find_winner(guilds: list[dict]) -> dict | None:
    """The first guild to kill the CE boss on Mythic, by its kill time alone."""
    done = [g for g in guilds if g.get("ceKilledAt")]
    if not done:
        return None
    first = min(done, key=lambda g: _ts(g["ceKilledAt"]))
    return {"guild": first["name"], "defeatedAt": first["ceKilledAt"]}


def first_kills(guilds: list[dict]) -> dict[str, dict]:
    """Per boss key, the tracked guild that killed it first."""
    firsts: dict[str, dict] = {}
    for g in guilds:
        for b in g["bosses"]:
            if not b["defeatedAt"]:
                continue
            key = f"{b['raid']}/{b['slug']}"
            if key not in firsts or _ts(b["defeatedAt"]) < _ts(firsts[key]["defeatedAt"]):
                firsts[key] = {"guild": g["name"], "defeatedAt": b["defeatedAt"]}
    return firsts


def wcl_fights_for(wcl: WarcraftLogs, guild: Guild, tier: Tier) -> tuple[int | None, list[dict]]:
    """(guild id, Mythic fights) from Warcraft Logs; a failure is only a warning."""
    try:
        gid = guild.wcl_id or wcl.guild_id(guild)
        if not gid:
            _warn(f"{guild.name}: niet gevonden op Warcraft Logs")
            return None, []
        fights = []
        for zone in tier.wcl_zones:
            fights += wcl.mythic_fights(gid, zone, tier.start)
        return gid, fights
    except WCLError as exc:
        _warn(f"{guild.name}: Warcraft Logs overgeslagen ({exc})")
        return guild.wcl_id, []


def build_race(rio: RaiderIO, config: Config, now: datetime, log=print,
               wcl: WarcraftLogs | None = None) -> dict:
    guilds = []
    for i, guild in enumerate(config.guilds, start=1):
        log(f"[{i}/{len(config.guilds)}] {guild.name} ({guild.realm})")
        gid, fights = wcl_fights_for(wcl, guild, config.tier) if wcl else (guild.wcl_id, [])
        guilds.append(fetch_guild(rio, guild, config.tier, wcl_fights=fights, wcl_id=gid))
    ranked = rank_guilds(guilds)
    firsts = first_kills(ranked)
    tier = config.tier
    names = {f"{b['raid']}/{b['slug']}": b["name"] for g in ranked for b in g["bosses"]}
    ce_key = f"{tier.ce_raid}/{tier.ce_boss}"
    return {
        "generatedAt": now.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "sources": {"raiderio": True,
                    "warcraftlogs": any("warcraftlogs" in g["sources"] for g in ranked)},
        "tier": {
            "start": tier.start,
            "totalBosses": tier.total_bosses,
            "ceBoss": {"raid": tier.ce_raid, "slug": tier.ce_boss, "name": names[ce_key]},
            "raids": [
                {"slug": r.slug, "name": r.name, "bosses": [
                    {"slug": b.slug, "name": names[b.key], "firstKill": firsts.get(b.key)}
                    for b in r.bosses
                ]}
                for r in tier.raids
            ],
        },
        "winner": find_winner(ranked),
        "guilds": ranked,
    }
