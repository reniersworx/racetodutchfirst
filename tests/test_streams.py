"""Live Twitch streams of the listed raiders, via DecAPI answers recorded 2026-10-03."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from racetodutchfirst.config import ConfigError, Streams, parse_config
from racetodutchfirst.race import build_race
from racetodutchfirst.twitch import DecAPI, StreamError, live_streams, parse_uptime
from tests.conftest import FixtureDecAPI

NOW = datetime(2026, 10, 3, 16, 24, 46, tzinfo=UTC)


def _run(config, overrides=None, game="keep"):
    streams = config.streams if game == "keep" else Streams(config.streams.channels, game)
    sleeps = []
    api = DecAPI(FixtureDecAPI(overrides), sleep=sleeps.append)
    return live_streams(api, streams, NOW), api, sleeps


def _ch(result, login):
    return next(c for c in result["channels"] if c["twitch"] == login)


def test_uptime_parsing():
    assert parse_uptime("bmiest is offline") is None
    assert parse_uptime("1 hour, 59 minutes, 58 seconds") == 7198
    assert parse_uptime("2 days, 1 second") == 172801
    with pytest.raises(StreamError):
        parse_uptime("something else")


def test_recorded_answers(config):
    out, _api, _ = _run(config)
    diigii = _ch(out, "diigii")
    assert diigii["live"] is True and diigii["game"] == "AION 2" and diigii["viewers"] == 18
    assert diigii["startedAt"] == "2026-10-03T14:22:29Z"
    assert diigii["shown"] is False  # live, but not in World of Warcraft
    assert _ch(out, "bmiest")["live"] is False and _ch(out, "bmiest")["guild"] == "Kelderklasse"
    assert _ch(out, "rughaar")["guild"] is None


def test_offline_channels_cost_one_request(config):
    _out, api, sleeps = _run(config)
    assert api.requests == len(sleeps) == 3 + 3  # 3 uptimes, 3 details for the live one
    assert all(s >= 0.3 for s in sleeps)


def test_wow_stream_is_shown_first(config):
    out, _api, _ = _run(config, {
        "decapi__uptime__rughaar.txt": "25 minutes, 3 seconds",
        "decapi__game__rughaar.txt": "World of Warcraft",
        "decapi__title__rughaar.txt": "Twin Fangs prog - Warlock POV",
        "decapi__viewercount__rughaar.txt": "42",
    })
    first = out["channels"][0]
    assert (first["twitch"], first["shown"], first["viewers"]) == ("rughaar", True, 42)
    assert first["url"] == "https://www.twitch.tv/rughaar"


def test_without_a_game_filter_every_live_stream_shows(config):
    out, _api, _ = _run(config, game=None)
    assert _ch(out, "diigii")["shown"] is True


def test_one_failing_channel_is_only_unknown(config, capsys):
    out, _api, _ = _run(config, {"decapi__uptime__bmiest.txt": 503})
    assert _ch(out, "bmiest")["live"] is None and _ch(out, "bmiest")["shown"] is False
    assert _ch(out, "diigii")["live"] is True
    assert "Twitch bmiest" in capsys.readouterr().err


def test_not_found_answer_is_an_error(config):
    out, _api, _ = _run(config, {"decapi__uptime__rughaar.txt": "User not found: rughaar"})
    assert _ch(out, "rughaar")["live"] is None


def test_build_race_includes_streams(rio, config):
    api = DecAPI(FixtureDecAPI(), sleep=lambda _s: None)
    race = build_race(rio, config, NOW, log=lambda _m: None, decapi=api)
    assert race["streams"]["channels"][0]["twitch"] == "bmiest"
    assert build_race(rio, config, NOW, log=lambda _m: None)["streams"] is None


BASE = {"guilds": [{"name": "A", "realm": "Draenor", "colour": "#123456"}],
        "tier": {"start": "2026-08-19", "raids": [{"slug": "r", "bosses": [{"slug": "x"}]}]}}


@pytest.mark.parametrize("channels", [
    [{"twitch": "no spaces"}],
    [{"twitch": "ok_name", "guild": "Unknown"}],
    [{"twitch": "twice"}, {"twitch": "TWICE"}],
])
def test_bad_stream_config_is_rejected(channels):
    with pytest.raises(ConfigError):
        parse_config({**BASE, "streams": {"channels": channels}})


def test_logins_are_lower_cased():
    cfg = parse_config({**BASE, "streams": {"channels": [{"twitch": "BMiest", "guild": "A"}]}})
    assert cfg.streams.channels[0].twitch == "bmiest"
