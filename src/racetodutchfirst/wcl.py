"""Warcraft Logs v2 (optional): every Mythic fight a guild logged this tier.

Follows the overlay (Bmiest/bmiest_wow_streaming_theme js/wcl.js):
- One query: reports(guildID, zoneID) with fights(difficulty: 5) under it, 40
  reports a page (WCL refuses 100: "Max query complexity").
- fightPercentage, not bossPercentage: bossPercentage is phase-relative, so a P3
  wipe would look worse than a P1 wipe. fightPercentage measures the whole fight,
  like Raider.IO's overall_percent, so the two sources stay comparable.
- Pulls count across nights, up to the first kill (race.merge_wcl does that).
- Several members log the same night, so one pull shows up in two or three
  reports (Kameraden: 107 of 259 fights, Knikkerende Krijgers: 125 of 236).
  Copies start within 5 s of each other; the next real pull starts 80 s+ later.
  dedupe() keeps one fight per encounter per DUPLICATE_WINDOW_MS.
- Zone 53 also lists Nymrissa, who is her own raid: fights map to bosses by
  encounter ID, never by "the n-th boss of the zone".

The client secret only mints a token, in CI, from Actions secrets. It never goes
into the page or the repo. Cost: ~120 of the 3600 points/hour per run for 5 guilds.
"""

from __future__ import annotations

import json
import time
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol

import httpx

from .config import Guild

TOKEN_URL = "https://www.warcraftlogs.com/oauth/token"
API_URL = "https://www.warcraftlogs.com/api/v2/client"
REQUEST_DELAY = 0.3
RETRY_STATUSES = {429, 500, 502, 503, 504}
RETRY_DELAYS = (3.0, 10.0)
DUPLICATE_WINDOW_MS = 10_000

GUILD_QUERY = (
    "query($n:String!,$s:String!,$r:String!){guildData{"
    "guild(name:$n,serverSlug:$s,serverRegion:$r){id}}}"
)
REPORTS_QUERY = (
    "query($g:Int!,$z:Int!,$t:Float!,$p:Int!){reportData{"
    "reports(guildID:$g,zoneID:$z,startTime:$t,limit:40,page:$p){has_more_pages data{"
    "code startTime fights(difficulty:5){encounterID kill fightPercentage startTime endTime}}}}}"
)


class WCLError(RuntimeError):
    """Warcraft Logs failed; the run goes on with Raider.IO alone."""


class Transport(Protocol):
    def post(self, url: str, **kwargs: Any) -> Any: ...


class WarcraftLogs:
    def __init__(self, transport: Transport, client_id: str, client_secret: str, *,
                 delay: float = REQUEST_DELAY,
                 sleep: Callable[[float], None] | None = None) -> None:
        self._t = transport
        self._auth = (client_id, client_secret)
        self._delay = delay
        self._sleep = sleep or (lambda s: time.sleep(s))
        self._token: str | None = None
        self.requests = 0

    def _post(self, url: str, **kwargs: Any) -> dict:
        problem = ""
        for attempt in range(len(RETRY_DELAYS) + 1):
            self._sleep(self._delay if attempt == 0 else RETRY_DELAYS[attempt - 1])
            self.requests += 1
            try:
                resp = self._t.post(url, **kwargs)
            except httpx.TransportError as exc:
                problem = type(exc).__name__
                continue
            if resp.status_code in RETRY_STATUSES:
                problem = f"HTTP {resp.status_code}"
                continue
            if resp.status_code != 200:
                raise WCLError(f"HTTP {resp.status_code} from {url}")
            try:
                data = resp.json()
            except ValueError as exc:
                raise WCLError(f"invalid JSON from {url}") from exc
            if not isinstance(data, dict):
                raise WCLError(f"unexpected answer from {url}")
            return data
        raise WCLError(f"{problem} from {url} (gave up)")

    def query(self, query: str, variables: dict) -> dict:
        if self._token is None:
            tok = self._post(TOKEN_URL, data={"grant_type": "client_credentials"}, auth=self._auth)
            if not tok.get("access_token"):
                raise WCLError("no access_token in the token answer")
            self._token = tok["access_token"]
        data = self._post(API_URL, json={"query": query, "variables": variables},
                          headers={"Authorization": f"Bearer {self._token}"})
        if data.get("errors"):
            raise WCLError("; ".join(str(e.get("message", e)) for e in data["errors"]))
        return data.get("data") or {}

    def guild_id(self, g: Guild) -> int | None:
        data = self.query(GUILD_QUERY, {"n": g.name, "s": g.realm_slug, "r": g.region})
        found = (data.get("guildData") or {}).get("guild")
        return found.get("id") if found else None

    def mythic_fights(self, guild_id: int, zone: int, since: str) -> list[dict]:
        """Every Mythic fight since `since` (YYYY-MM-DD), oldest first."""
        t0 = datetime.fromisoformat(since).replace(tzinfo=UTC).timestamp() * 1000
        fights, page = [], 1
        while True:
            data = self.query(REPORTS_QUERY, {"g": guild_id, "z": zone, "t": t0, "p": page})
            reports = (data.get("reportData") or {}).get("reports") or {}
            for rep in reports.get("data") or []:
                base = rep.get("startTime") or 0
                for f in rep.get("fights") or []:
                    if not isinstance(f.get("encounterID"), int):
                        continue
                    pct = f.get("fightPercentage")
                    fights.append({
                        "encounter": f["encounterID"],
                        "kill": f.get("kill") is True,
                        "percent": round(float(pct), 2) if isinstance(pct, (int, float)) else None,
                        "start": base + (f.get("startTime") or 0),
                        "end": base + (f.get("endTime") or 0),
                        "report": rep.get("code"),
                    })
            if not reports.get("has_more_pages") or page >= 20:
                break
            page += 1
        return dedupe(fights)


def dedupe(fights: list[dict]) -> list[dict]:
    """One fight per pull: drop copies of the same encounter from other reports."""
    kept: list[dict] = []
    last: dict[int, dict] = {}
    for f in sorted(fights, key=lambda f: (f["start"], not f["kill"])):
        prev = last.get(f["encounter"])
        if prev and f["start"] - prev["start"] <= DUPLICATE_WINDOW_MS and f["report"] != prev["report"]:
            # Same pull from another logger: keep the kill, and the lower %.
            prev["kill"] = prev["kill"] or f["kill"]
            if f["percent"] is not None and (prev["percent"] is None or f["percent"] < prev["percent"]):
                prev["percent"] = f["percent"]
            prev["end"] = max(prev["end"], f["end"])
            continue
        f = dict(f)
        kept.append(f)
        last[f["encounter"]] = f
    return kept


# -- fixtures --------------------------------------------------------------

def fixture_name(body: dict) -> str:
    v = body.get("variables") or {}
    if "reportData" in body.get("query", ""):
        return f"wcl__reports__{v['g']}__{v['z']}__p{v['p']}.json"
    return f"wcl__guild__{v['s']}__{v['n'].lower().replace(' ', '-')}.json"


class RecordingTransport:
    """Saves every API answer (never the token) under fixture_name()."""

    def __init__(self, inner: Transport, directory: Path) -> None:
        self._inner = inner
        self._dir = directory
        directory.mkdir(parents=True, exist_ok=True)

    def post(self, url: str, **kwargs: Any) -> Any:
        resp = self._inner.post(url, **kwargs)
        if url == API_URL and resp.status_code == 200:
            path = self._dir / fixture_name(kwargs["json"])
            path.write_text(json.dumps(resp.json(), ensure_ascii=False) + "\n")
        return resp
