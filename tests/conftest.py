"""Replays real Raider.IO responses from tests/fixtures/raiderio: no network in tests.

Re-record with: uv run python -m racetodutchfirst --record tests/fixtures/raiderio
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from racetodutchfirst.config import load_config
from racetodutchfirst.raiderio import RaiderIO, fixture_name

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = Path(__file__).parent / "fixtures" / "raiderio"


class Response:
    def __init__(self, status_code: int, payload: object = None) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> object:
        return self._payload


class FixtureHTTP:
    """Answers each URL from its recorded fixture; overrides win. Unknown URL = test failure."""

    def __init__(self, overrides: dict[str, object] | None = None) -> None:
        self.urls: list[str] = []
        self.overrides = overrides or {}

    def get(self, url: str) -> Response:
        self.urls.append(url)
        name = fixture_name(url)
        if name in self.overrides:
            return Response(200, self.overrides[name])
        path = FIXTURES / name
        if not path.exists():
            raise AssertionError(f"request without a fixture: {url} ({name})")
        return Response(200, json.loads(path.read_text()))


@pytest.fixture
def config():
    return load_config(ROOT / "guilds.toml")


@pytest.fixture
def sleeps():
    return []


@pytest.fixture
def http():
    return FixtureHTTP()


@pytest.fixture
def rio(http, sleeps):
    return RaiderIO(http, sleep=sleeps.append)


def guild(config, name):
    return next(g for g in config.guilds if g.name == name)


WCL_FIXTURES = Path(__file__).parent / "fixtures" / "wcl"


class FixtureWCL:
    """Warcraft Logs transport: a fake token, then recorded GraphQL answers."""

    def __init__(self, status: int = 200) -> None:
        self.status = status
        self.bodies: list[dict] = []

    def post(self, url: str, **kwargs) -> Response:
        from racetodutchfirst.wcl import TOKEN_URL, fixture_name

        if self.status != 200:
            return Response(self.status)
        if url == TOKEN_URL:
            return Response(200, {"access_token": "test-token", "expires_in": 60})
        self.bodies.append(kwargs["json"])
        path = WCL_FIXTURES / fixture_name(kwargs["json"])
        if not path.exists():
            raise AssertionError(f"WCL query without a fixture: {path.name}")
        return Response(200, json.loads(path.read_text()))
