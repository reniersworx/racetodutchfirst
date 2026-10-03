"""Who of the listed raiders is live on Twitch, via DecAPI (https://decapi.me).

No Twitch app or key needed: DecAPI answers plain text per channel, the same
service the overlay uses. Per channel one `uptime` request ("<name> is offline"
or "1 hour, 59 minutes, 58 seconds"); only a live channel costs three more
(game, title, viewercount). A failure only makes that channel unknown: streams
are a garnish, never a reason to stop the run.
"""

from __future__ import annotations

import re
import sys
import time
from collections.abc import Callable
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import httpx

from .config import Streams

BASE_URL = "https://decapi.me/twitch"
REQUEST_DELAY = 0.3
_UNIT = {"day": 86400, "hour": 3600, "minute": 60, "second": 1}
_PART = re.compile(r"(\d+)\s+(day|hour|minute|second)s?")


class StreamError(RuntimeError):
    """DecAPI didn't answer usefully for one channel."""


def parse_uptime(text: str) -> int | None:
    """Seconds live from "1 hour, 59 minutes, 58 seconds"; None when offline or unclear."""
    if "offline" in text.lower():
        return None
    parts = _PART.findall(text)
    if not parts:
        raise StreamError(f"unexpected uptime answer: {text[:80]!r}")
    return sum(int(n) * _UNIT[u] for n, u in parts)


class DecAPI:
    def __init__(self, http: Any, *, delay: float = REQUEST_DELAY,
                 sleep: Callable[[float], None] | None = None) -> None:
        self._http = http
        self._delay = delay
        self._sleep = sleep or (lambda s: time.sleep(s))
        self.requests = 0

    def text(self, what: str, login: str) -> str:
        self._sleep(self._delay)
        self.requests += 1
        try:
            resp = self._http.get(f"{BASE_URL}/{what}/{login}")
        except httpx.TransportError as exc:
            raise StreamError(type(exc).__name__) from exc
        if resp.status_code != 200:
            raise StreamError(f"HTTP {resp.status_code} for {what}/{login}")
        body = resp.text.strip()
        if not body or "not found" in body.lower() or body.lower().startswith("error"):
            raise StreamError(f"{what}/{login}: {body[:80]!r}")
        return body


def _iso(dt: datetime) -> str:
    return dt.isoformat(timespec="seconds").replace("+00:00", "Z")


def live_streams(api: DecAPI, streams: Streams, now: datetime) -> dict:
    """race.json's `streams`: every listed channel, live or not; shown streams first."""
    channels = []
    for ch in streams.channels:
        entry = {"twitch": ch.twitch, "guild": ch.guild, "url": f"https://www.twitch.tv/{ch.twitch}",
                 "live": None, "game": None, "title": None, "viewers": None, "startedAt": None}
        try:
            up = parse_uptime(api.text("uptime", ch.twitch))
            entry["live"] = up is not None
            if up is not None:
                entry["startedAt"] = _iso(now - timedelta(seconds=up))
                entry["game"] = api.text("game", ch.twitch)
                entry["title"] = api.text("title", ch.twitch)
                viewers = api.text("viewercount", ch.twitch)
                entry["viewers"] = int(viewers) if viewers.isdigit() else None
        except StreamError as exc:
            print(f"waarschuwing: Twitch {ch.twitch}: {exc}", file=sys.stderr)
        entry["shown"] = bool(entry["live"]) and (not streams.game or entry["game"] == streams.game)
        channels.append(entry)
    channels.sort(key=lambda c: (not c["shown"], c["startedAt"] or "", c["twitch"]))
    return {"checkedAt": _iso(now), "game": streams.game, "channels": channels}


def fixture_name(url: str) -> str:
    what, login = url.removeprefix(BASE_URL + "/").split("/", 1)
    return f"decapi__{what}__{login}.txt"


class RecordingDecAPI:
    """Saves every 200 answer under fixture_name(url)."""

    def __init__(self, inner: Any, directory: Path) -> None:
        self._inner = inner
        self._dir = directory
        directory.mkdir(parents=True, exist_ok=True)

    def get(self, url: str) -> Any:
        resp = self._inner.get(url)
        if resp.status_code == 200:
            (self._dir / fixture_name(url)).write_text(resp.text)
        return resp
