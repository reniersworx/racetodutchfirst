"""uv run python -m racetodutchfirst: fetch the race from Raider.IO, write site/data/race.json.

On any fetch problem it exits 1 and leaves the old race.json alone, so a Raider.IO
outage never publishes zero progress with a fresh timestamp.

An earlier season: --tier seasons/season-1.toml --output site/data/season-1.json fetches
that season's tier for the same guilds, without streams, into its own archive file. Run it
once when a season ends and commit the file; CI only refreshes race.json.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path

from .config import ConfigError, load_config, load_tier
from .race import build_race, season_index
from .raiderio import FetchError, RaiderIO, RecordingHTTP, http_client
from .twitch import DecAPI, RecordingDecAPI
from .wcl import RecordingTransport, WarcraftLogs

ROOT = Path(__file__).resolve().parents[2]


def write_atomic(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="racetodutchfirst", description=__doc__)
    ap.add_argument("--config", type=Path, default=ROOT / "guilds.toml")
    ap.add_argument("--output", type=Path,
                    help="default site/data/race.json; required with --tier")
    ap.add_argument("--tier", type=Path, metavar="FILE",
                    help="an earlier season's tier file (seasons/*.toml) instead of guilds.toml's")
    ap.add_argument("--record", type=Path, metavar="DIR",
                    help="also save every Raider.IO response here (test fixtures)")
    args = ap.parse_args(argv)

    try:
        config = load_config(args.config)
    except (OSError, ConfigError) as exc:
        print(f"guilds.toml: {exc}", file=sys.stderr)
        return 1
    seasons = season_index(config)
    if args.tier:
        if not args.output:
            print("--tier needs --output (race.json is the current season)", file=sys.stderr)
            return 1
        try:
            config = replace(config, tier=load_tier(args.tier))
        except (OSError, ConfigError) as exc:
            print(f"{args.tier}: {exc}", file=sys.stderr)
            return 1
    args.output = args.output or ROOT / "site" / "data" / "race.json"

    wcl_id, wcl_secret = os.environ.get("WCL_CLIENT_ID"), os.environ.get("WCL_CLIENT_SECRET")
    if not config.tier.wcl_zones:
        wcl_id = wcl_secret = None
        print("Warcraft Logs: overgeslagen (geen warcraft_logs_zone in deze tier).")
    elif not (wcl_id and wcl_secret):
        print("Warcraft Logs: overgeslagen (WCL_CLIENT_ID/WCL_CLIENT_SECRET niet gezet).")

    with http_client() as client:
        http = RecordingHTTP(client, args.record) if args.record else client
        rio = RaiderIO(http)
        wcl = None
        if wcl_id and wcl_secret:
            transport = RecordingTransport(client, args.record) if args.record else client
            wcl = WarcraftLogs(transport, wcl_id, wcl_secret)
        decapi = None if args.tier else DecAPI(
            RecordingDecAPI(client, args.record) if args.record else client)
        try:
            race = build_race(rio, config, datetime.now(UTC), wcl=wcl, decapi=decapi,
                              seasons=seasons)
        except FetchError as exc:
            print(f"Raider.IO: {exc}. {args.output} blijft ongewijzigd.", file=sys.stderr)
            return 1

    write_atomic(args.output, race)
    extra = f" + {wcl.requests} Warcraft Logs" if wcl else ""
    print(f"{rio.requests} Raider.IO-requests{extra}; geschreven: {args.output}")
    for g in race["guilds"]:
        cur = g["current"]
        if not cur:
            where = "klaar"
        elif cur["bestPercent"] is None:
            where = f"{cur['name']}, nog geen pulls"
        else:
            where = (f"{cur['name']} {cur['bestPercent']}% "
                     f"({cur['pullCount']} pulls, {cur['pullSource']})")
        print(f"  #{g['rank']} {g['name']}: {g['mythicKills']}/{g['totalBosses']} M, "
              f"positie {g['racePosition']:.2f}, {where}")
    for ch in (race["streams"] or {}).get("channels", []):
        if ch["live"]:
            print(f"  Live: {ch['twitch']} ({ch['game']}, {ch['viewers']} kijkers)"
                  f"{'' if ch['shown'] else ', niet getoond'}")
    if race["winner"]:
        print(f"  Winnaar: {race['winner']['guild']} ({race['winner']['defeatedAt']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
