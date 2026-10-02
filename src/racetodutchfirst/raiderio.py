"""Raider.IO's public API: only the four published endpoints, paced and retried.

Their Acceptable Use allows the documented endpoints only. Every request goes
through RaiderIO.get(), which sleeps REQUEST_DELAY first, so pacing can't be
skipped by a new call site.
"""

from __future__ import annotations

import json
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any, Protocol
from urllib.parse import parse_qs, quote, urlencode, urlsplit

import httpx

from .config import Guild

BASE_URL = "https://raider.io/api/v1"
USER_AGENT = "RaceToDutchFirst/0.1 (+https://github.com/reniersworx/racetodutchfirst)"
REQUEST_DELAY = 0.3  # seconds before every request
RETRY_STATUSES = {429, 500, 502, 503, 504}
RETRY_DELAYS = (3.0, 10.0)  # extra wait before the 2nd and 3rd attempt


class FetchError(RuntimeError):
    """Raider.IO couldn't give trustworthy data; the run must not publish."""


class HTTPLike(Protocol):
    def get(self, url: str) -> Any: ...


class RaiderIO:
    def __init__(
        self,
        http: HTTPLike,
        *,
        delay: float = REQUEST_DELAY,
        sleep: Callable[[float], None] | None = None,
    ) -> None:
        self._http = http
        self._delay = delay
        self._sleep = sleep or (lambda s: time.sleep(s))
        self.requests = 0

    def get(self, path: str, params: dict[str, str]) -> dict:
        url = f"{BASE_URL}/{path}?{urlencode(params, quote_via=quote)}"
        problem = ""
        for attempt in range(len(RETRY_DELAYS) + 1):
            self._sleep(self._delay if attempt == 0 else RETRY_DELAYS[attempt - 1])
            self.requests += 1
            try:
                resp = self._http.get(url)
            except httpx.TransportError as exc:
                problem = f"{type(exc).__name__}: {exc}"
                continue
            if resp.status_code in RETRY_STATUSES:
                problem = f"HTTP {resp.status_code}"
                continue
            if resp.status_code != 200:
                raise FetchError(f"HTTP {resp.status_code} for {url}")
            try:
                payload = resp.json()
            except ValueError as exc:
                raise FetchError(f"invalid JSON for {url}") from exc
            if not isinstance(payload, dict):
                raise FetchError(f"expected a JSON object for {url}")
            return payload
        raise FetchError(f"{problem} for {url} (gave up after {len(RETRY_DELAYS) + 1} tries)")

    # -- the four published endpoints ------------------------------------

    def profile(self, g: Guild) -> dict:
        return self.get("guilds/profile", {
            "region": g.region, "realm": g.realm_slug, "name": g.name,
            "fields": "raid_progression,raid_rankings",
        })

    def boss_kill(self, g: Guild, raid: str, boss: str) -> dict:
        """{"kill": {...}, "roster": [...]}, or {} when the boss isn't killed."""
        return self.get("guilds/boss-kill", {
            "region": g.region, "realm": g.realm_slug, "guild": g.name,
            "raid": raid, "boss": boss, "difficulty": "mythic",
        })

    def _live(self, what: str, g: Guild, raid: str, boss: str) -> dict:
        return self.get(f"live-tracking/guild/{what}", {
            "raid": raid, "difficulty": "mythic", "boss": boss, "period": "until_kill",
            "region": g.region, "realm": g.realm_slug, "guild": g.name,
        })

    def boss_progress(self, g: Guild, raid: str, boss: str) -> dict:
        return self._live("boss-progress", g, raid, boss)

    def boss_pulls(self, g: Guild, raid: str, boss: str) -> dict:
        return self._live("boss-pulls", g, raid, boss)


def http_client(timeout: float = 30.0) -> httpx.Client:
    return httpx.Client(timeout=timeout, headers={"User-Agent": USER_AGENT})


# -- fixtures: record real responses once, replay them in tests -----------

def _trim_member(member: dict) -> dict:
    c = member.get("character") or {}
    pick = {
        "name": c.get("name"),
        "realm": {k: (c.get("realm") or {}).get(k) for k in ("name", "slug")},
        "region": {"slug": (c.get("region") or {}).get("slug")},
        "class": {k: (c.get("class") or {}).get(k) for k in ("name", "slug")},
        "spec": {k: (c.get("spec") or {}).get(k) for k in ("name", "slug", "role")},
    }
    return {"character": pick}


_ENDPOINTS = {
    "guilds/profile": "profile",
    "guilds/boss-kill": "kill",
    "live-tracking/guild/boss-progress": "progress",
    "live-tracking/guild/boss-pulls": "pulls",
}


def fixture_name(url: str) -> str:
    """A stable file name for one request, e.g. kill__draenor__kelderklasse__<raid>__<boss>.json."""
    parts = urlsplit(url)
    path = parts.path.removeprefix(urlsplit(BASE_URL).path).strip("/")
    q = {k: v[0] for k, v in parse_qs(parts.query).items()}
    bits = [_ENDPOINTS[path], q["realm"], q.get("name") or q["guild"]]
    if "raid" in q:
        bits += [q["raid"], q["boss"]]
    return "__".join(b.lower().replace(" ", "-") for b in bits) + ".json"


class RecordingHTTP:
    """Wraps a real client and saves every 200 response under fixture_name(url).

    boss-kill rosters are full character profiles with gear (~400 KB per kill);
    only the fields race.compact_roster() reads are kept, or the fixtures get 30 MB."""

    def __init__(self, inner: HTTPLike, directory: Path) -> None:
        self._inner = inner
        self._dir = directory
        directory.mkdir(parents=True, exist_ok=True)

    def get(self, url: str) -> Any:
        resp = self._inner.get(url)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, dict) and data.get("roster"):
                data = {**data, "roster": [_trim_member(m) for m in data["roster"]]}
            path = self._dir / fixture_name(url)
            path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
        return resp
