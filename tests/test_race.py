"""Race position, ranking, winner and the Raider.IO traps, on recorded real responses."""

from __future__ import annotations

import json
from datetime import UTC, datetime

import httpx
import pytest

from racetodutchfirst import __main__ as cli
from racetodutchfirst.config import ConfigError, parse_config
from racetodutchfirst.race import (
    build_race,
    fetch_guild,
    find_winner,
    first_kills,
    race_position,
    rank_guilds,
)
from racetodutchfirst.raiderio import REQUEST_DELAY, FetchError, RaiderIO
from tests.conftest import ROOT, FixtureHTTP, Response, guild

NOW = datetime(2026, 10, 2, 21, 5, tzinfo=UTC)


# -- race position ----------------------------------------------------------

def test_position_example_from_the_brief():
    assert race_position(5, {"bestPercent": 27.0}) == 5.73


def test_position_without_pulls_is_just_the_kills():
    assert race_position(5, {"bestPercent": None}) == 5.0
    assert race_position(9, None) == 9.0


def test_position_fraction_is_clamped():
    assert race_position(2, {"bestPercent": 0.0}) == 3.0
    assert race_position(2, {"bestPercent": 120.0}) == 2.0


def test_kelderklasse_position_from_fixtures(rio, config):
    g = fetch_guild(rio, guild(config, "Kelderklasse"), config.tier)
    assert g["mythicKills"] == 6  # 5/8 Venomous Abyss + 1/1 Tidebound Grotto
    assert g["current"]["slug"] == "the-twin-fangs"
    assert g["current"]["bestPercent"] == 27.02
    assert g["racePosition"] == pytest.approx(6.7298)


# -- the live-data traps ----------------------------------------------------

def test_latest_boss_already_dead_is_not_counted_twice(rio, config):
    # RoyalTeam: boss=latest answers The Lost Explorers with isDefeated=true.
    # The old fetcher took that as the current boss and gave 3.0 for 2 kills.
    g = fetch_guild(rio, guild(config, "RoyalTeam"), config.tier)
    assert g["mythicKills"] == 2
    assert g["current"]["slug"] == "entombed-sentinels"  # skipped, still alive
    assert g["racePosition"] == 2.0


def test_kill_order_is_not_linear(rio, config):
    g = fetch_guild(rio, guild(config, "RoyalTeam"), config.tier)
    states = {b["slug"]: b["state"] for b in g["bosses"]}
    assert states["nekzali-the-soulcoiler"] == "killed"
    assert states["entombed-sentinels"] == "untouched"
    assert states["the-lost-explorers"] == "killed"


def test_boss_kill_beats_live_tracking(rio, config):
    # Lelijkerds killed The Lost Explorers on 24/9; live tracking still says 8.57%.
    g = fetch_guild(rio, guild(config, "Lelijkerds"), config.tier)
    lost = next(b for b in g["bosses"] if b["slug"] == "the-lost-explorers")
    assert lost["state"] == "killed"
    assert lost["defeatedAt"].startswith("2026-09-24")
    assert lost["bestPercent"] is None
    assert g["current"]["slug"] == "entombed-sentinels"
    assert g["racePosition"] == pytest.approx(2.9765)


def test_empty_kill_response_means_not_killed(rio, http, config):
    # With Sszorak answering {} the prober looks further for the fifth kill, finds none.
    for boss in ("sszorak", "the-twin-fangs", "the-coiled-altar", "ulatek"):
        http.overrides[f"kill__draenor__kelderklasse__the-venomous-abyss__{boss}.json"] = {}
    g = fetch_guild(rio, guild(config, "Kelderklasse"), config.tier)
    sszorak = next(b for b in g["bosses"] if b["slug"] == "sszorak")
    assert sszorak["state"] != "killed"
    assert sszorak["defeatedAt"] is None


def test_recorded_empty_kill_fixture_is_empty():
    path = ROOT / "tests/fixtures/raiderio/kill__draenor__lelijkerds__the-venomous-abyss__entombed-sentinels.json"
    assert json.loads(path.read_text()) == {}


def test_resets_are_not_pulls(rio, config):
    # Kameraden's Sszorak list has 43 entries, two of them resets; pullCount is 41.
    g = fetch_guild(rio, guild(config, "Kameraden"), config.tier)
    assert g["current"]["slug"] == "sszorak"
    assert len(g["current"]["pulls"]) == g["current"]["pullCount"] == 41


def test_kill_endpoint_only_for_raids_with_kills(rio, http, config):
    fetch_guild(rio, guild(config, "Lelijkerds"), config.tier)  # 0/1 Mythic Tidebound Grotto
    kills = [u for u in http.urls if "/guilds/boss-kill" in u]
    assert kills and not any("the-tidebound-grotto" in u for u in kills)


def test_killed_bosses_probed_first(rio, http, config):
    # Kelderklasse killed the first five in order: exactly five boss-kill calls in VA.
    fetch_guild(rio, guild(config, "Kelderklasse"), config.tier)
    va = [u for u in http.urls if "/guilds/boss-kill" in u and "the-venomous-abyss" in u]
    assert len(va) == 5


def test_guild_names_are_url_encoded(rio, http, config):
    fetch_guild(rio, guild(config, "Knikkerende Krijgers"), config.tier)
    assert all("Knikkerende%20Krijgers" in u and "realm=sylvanas" in u for u in http.urls)


# -- ranking ----------------------------------------------------------------

def _g(name, kills, best=None, latest=None, heroic=0):
    return {"name": name, "mythicKills": kills, "heroicKills": heroic,
            "latestKillAt": latest, "current": {"bestPercent": best}}


def _order(guilds):
    return [g["name"] for g in rank_guilds(guilds)]


def test_rank_most_mythic_kills_first():
    assert _order([_g("A", 4, 1.0), _g("B", 5, 90.0)]) == ["B", "A"]


def test_rank_lowest_best_percent_next():
    assert _order([_g("A", 5, 40.0), _g("B", 5, 27.0)]) == ["B", "A"]


def test_rank_no_pull_does_not_beat_real_progress():
    assert _order([_g("A", 5, None), _g("B", 5, 99.5)]) == ["B", "A"]


def test_rank_earliest_latest_kill_next():
    # A: kills on 1 and 20 Sep; B: 2 and 10 Sep. B reached the same count first.
    a = _g("A", 2, 50.0, latest="2026-09-20T20:00:00Z")
    b = _g("B", 2, 50.0, latest="2026-09-10T20:00:00Z")
    assert _order([a, b]) == ["B", "A"]


def test_rank_most_heroic_kills_last():
    assert _order([_g("A", 0, None, heroic=3), _g("B", 0, None, heroic=8)]) == ["B", "A"]


def test_rank_numbers_are_assigned():
    ranked = rank_guilds([_g("A", 1), _g("B", 2)])
    assert [(g["name"], g["rank"]) for g in ranked] == [("B", 1), ("A", 2)]


# -- winner and first kills -------------------------------------------------

def test_no_winner_without_ce_kill():
    assert find_winner([{"name": "A", "ceKilledAt": None}]) is None


def test_winner_is_first_ce_kill_not_rank_one():
    guilds = [
        {"name": "Ranked first", "ceKilledAt": "2026-10-20T21:00:00Z"},
        {"name": "Killed first", "ceKilledAt": "2026-10-12T22:30:00Z"},
    ]
    assert find_winner(guilds) == {"guild": "Killed first", "defeatedAt": "2026-10-12T22:30:00Z"}


def test_ce_kill_is_read_from_the_configured_boss(rio, http, config):
    http.overrides["profile__draenor__kelderklasse.json"] = _with_mythic(
        "profile__draenor__kelderklasse.json", 8)
    http.overrides["kill__draenor__kelderklasse__the-venomous-abyss__ulatek.json"] = {
        "kill": {"defeatedAt": "2026-10-14T21:12:00.000Z"}, "roster": []}
    for boss in ("the-twin-fangs", "the-coiled-altar"):
        http.overrides[f"kill__draenor__kelderklasse__the-venomous-abyss__{boss}.json"] = {
            "kill": {"defeatedAt": "2026-10-08T21:00:00.000Z"}, "roster": []}
    g = fetch_guild(rio, guild(config, "Kelderklasse"), config.tier)
    assert g["ceKilledAt"] == "2026-10-14T21:12:00.000Z"
    assert g["current"] is None and g["racePosition"] == 9.0
    assert find_winner([g]) == {"guild": "Kelderklasse", "defeatedAt": "2026-10-14T21:12:00.000Z"}


def _with_mythic(fixture, va_kills):
    data = json.loads((ROOT / "tests/fixtures/raiderio" / fixture).read_text())
    data["raid_progression"]["the-venomous-abyss"]["mythic_bosses_killed"] = va_kills
    return data


def test_first_kill_per_boss():
    guilds = [
        {"name": "A", "bosses": [{"raid": "r", "slug": "x", "defeatedAt": "2026-09-05T20:00:00Z"}]},
        {"name": "B", "bosses": [{"raid": "r", "slug": "x", "defeatedAt": "2026-09-03T20:00:00Z"}]},
    ]
    assert first_kills(guilds)["r/x"]["guild"] == "B"


# -- the whole run on the recorded data ---------------------------------------

def test_full_run_on_fixtures(rio, config):
    race = build_race(rio, config, NOW, log=lambda _m: None)
    assert [g["name"] for g in race["guilds"]] == [
        "Kelderklasse", "Kameraden", "Knikkerende Krijgers", "Lelijkerds", "RoyalTeam"]
    assert [g["rank"] for g in race["guilds"]] == [1, 2, 3, 4, 5]
    assert race["generatedAt"] == "2026-10-02T21:05:00Z"
    assert race["winner"] is None
    assert race["tier"]["totalBosses"] == 9
    assert race["tier"]["ceBoss"] == {"raid": "the-venomous-abyss", "slug": "ulatek", "name": "Ula'tek"}
    va = race["tier"]["raids"][0]["bosses"]
    assert va[0]["firstKill"]["guild"] == "Kelderklasse"
    assert va[-1]["firstKill"] is None


def test_committed_sample_follows_the_ranking_rules():
    race = json.loads((ROOT / "site/data/race.json").read_text())
    assert len(race["guilds"]) == 5
    datetime.fromisoformat(race["generatedAt"])
    names = [g["name"] for g in race["guilds"]]
    assert _order(json.loads(json.dumps(race["guilds"]))) == names
    assert [g["rank"] for g in race["guilds"]] == list(range(1, 6))
    for g in race["guilds"]:
        assert g["mythicKills"] == sum(r["mythic"] for r in g["raids"].values())
        assert race_position(g["mythicKills"], g["current"]) == g["racePosition"]


# -- pacing and failures ----------------------------------------------------

def test_every_request_is_paced(rio, sleeps, config):
    fetch_guild(rio, guild(config, "Kameraden"), config.tier)
    assert rio.requests == len(sleeps) > 10
    assert all(s >= REQUEST_DELAY for s in sleeps)


class Flaky:
    def __init__(self, *statuses):
        self.statuses = list(statuses)

    def get(self, url):
        status = self.statuses.pop(0)
        if status == "timeout":
            raise httpx.ReadTimeout("slow")
        return Response(status, {"ok": True})


def test_retries_on_server_errors_then_succeeds():
    sleeps = []
    rio = RaiderIO(Flaky(502, "timeout", 200), sleep=sleeps.append)
    assert rio.get("guilds/profile", {}) == {"ok": True}
    assert len(sleeps) == 3 and sleeps[1] > REQUEST_DELAY


def test_gives_up_after_retries():
    with pytest.raises(FetchError, match="HTTP 503"):
        RaiderIO(Flaky(503, 503, 503), sleep=lambda _s: None).get("guilds/profile", {})


def test_client_errors_fail_at_once():
    with pytest.raises(FetchError, match="HTTP 400"):
        RaiderIO(Flaky(400), sleep=lambda _s: None).get("guilds/profile", {})


def test_failed_run_keeps_the_old_data(tmp_path, monkeypatch):
    out = tmp_path / "race.json"
    out.write_text('{"old": true}')

    class Down(FixtureHTTP):
        def get(self, url):
            return Response(500)

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    monkeypatch.setattr(cli, "http_client", Down)
    monkeypatch.setattr("racetodutchfirst.raiderio.time.sleep", lambda _s: None)
    assert cli.main(["--output", str(out)]) == 1
    assert out.read_text() == '{"old": true}'


# -- config -----------------------------------------------------------------

BASE_CFG = {
    "guilds": [{"name": "A", "realm": "Draenor", "colour": "#123456"}],
    "tier": {"start": "2026-08-19", "raids": [
        {"slug": "r", "bosses": [{"slug": "one"}, {"slug": "two"}]}]},
}


def test_ce_boss_defaults_to_last_boss_of_first_raid():
    assert parse_config(BASE_CFG).tier.ce_boss == "two"


def test_unknown_ce_boss_is_rejected():
    cfg = {**BASE_CFG, "tier": {**BASE_CFG["tier"], "ce_boss": {"raid": "r", "boss": "nope"}}}
    with pytest.raises(ConfigError):
        parse_config(cfg)


def test_colour_must_be_hex():
    cfg = {**BASE_CFG, "guilds": [{"name": "A", "realm": "Draenor", "colour": "red;x"}]}
    with pytest.raises(ConfigError):
        parse_config(cfg)


def test_realm_slug():
    g = parse_config({**BASE_CFG, "guilds": [
        {"name": "A", "realm": "Argent Dawn", "colour": "#123456"}]}).guilds[0]
    assert g.realm_slug == "argent-dawn"
