"""Earlier seasons: a tier file per season, a raid that doesn't count, the season switch list."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime

import pytest

from racetodutchfirst.__main__ import main
from racetodutchfirst.config import ConfigError, load_tier, parse_config, parse_tier
from racetodutchfirst.race import _pick_current, build_race, season_index
from racetodutchfirst.raiderio import RaiderIO

from .conftest import FIXTURES_S1, ROOT, FixtureHTTP

NOW = datetime(2026, 10, 4, 12, 0, tzinfo=UTC)


def tier_data(**extra):
    data = {
        "start": "2026-03-18",
        "raids": [
            {"slug": "main", "bosses": [{"slug": "a"}, {"slug": "b"}]},
            {"slug": "side", "race": False, "bosses": [{"slug": "c"}]},
        ],
    }
    data.update(extra)
    return data


def test_a_raid_with_race_false_is_shown_but_not_counted():
    tier = parse_tier(tier_data())
    assert [r.slug for r in tier.raids] == ["main", "side"]
    assert [r.slug for r in tier.race_raids] == ["main"]
    assert tier.total_bosses == 2
    assert (tier.ce_raid, tier.ce_boss) == ("main", "b")


@pytest.mark.parametrize("data, message", [
    (tier_data(raids=[{"slug": "side", "race": False, "bosses": [{"slug": "c"}]}]), "must count"),
    (tier_data(ce_boss={"raid": "side", "boss": "c"}), "doesn't count"),
    (tier_data(raids=[{"slug": "main", "race": "no", "bosses": [{"slug": "a"}]}]), "true or false"),
    (tier_data(id="Season 1"), "short slug"),
])
def test_bad_tiers_are_refused(data, message):
    with pytest.raises(ConfigError, match=message):
        parse_tier(data)


def config_data(seasons):
    return {"guilds": [{"name": "G", "realm": "Draenor", "colour": "#123456"}],
            "tier": tier_data(id="s2", label="Season 2"), "seasons": seasons}


@pytest.mark.parametrize("seasons, message", [
    ([{"id": "s1", "label": "Season 1", "file": "../secrets.json"}], "data/season-1.json"),
    ([{"id": "s1", "label": "Season 1", "file": "data/race.json"}], "data/season-1.json"),
    ([{"id": "s2", "label": "Oops", "file": "data/old.json"}], "used twice"),
    ([{"id": "s1", "file": "data/season-1.json"}], "missing"),
])
def test_bad_season_lists_are_refused(seasons, message):
    with pytest.raises(ConfigError, match=message):
        parse_config(config_data(seasons))


def test_season_index_lists_the_current_season_first(config):
    assert season_index(config) == [
        {"id": "s2", "label": "Season 2", "file": "data/race.json", "current": True},
        {"id": "s1", "label": "Season 1", "file": "data/season-1.json", "current": False},
    ]


def test_a_full_clear_of_the_counting_raids_leaves_no_current_boss():
    # Rotmire (Sporefall, race = false) alive must not become the current boss.
    tier = load_tier(ROOT / "seasons" / "season-1.toml")
    states = {b.key: {"state": "killed", "pullCount": 1, "bestPercent": None}
              for b in tier.race_raids[0].bosses}
    states["sporefall/rotmire"] = {"state": "untouched", "pullCount": 0, "bestPercent": None}
    assert _pick_current(tier, states, {}) is None


@pytest.fixture
def season1(config):
    s1 = replace(config, tier=load_tier(ROOT / "seasons" / "season-1.toml"))
    rio = RaiderIO(FixtureHTTP(directory=FIXTURES_S1), sleep=lambda s: None)
    return build_race(rio, s1, NOW, log=lambda *a: None, seasons=season_index(config))


def test_season_1_archive(season1):
    assert season1["season"] == {"id": "s1", "label": "Season 1", "archived": True,
                                 "end": "2026-08-19"}
    assert [s["id"] for s in season1["seasons"]] == ["s2", "s1"]
    assert season1["winner"] == {"guild": "Kameraden", "defeatedAt": "2026-07-23T20:53:33.517Z"}
    assert season1["streams"] is None
    assert season1["tier"]["totalBosses"] == 9
    assert [(r["slug"], r["counts"]) for r in season1["tier"]["raids"]] == [
        ("tier-mn-1", True), ("sporefall", False)]
    by = {g["name"]: g for g in season1["guilds"]}
    assert [g["name"] for g in season1["guilds"]] == [
        "Kameraden", "Kelderklasse", "Knikkerende Krijgers", "Lelijkerds", "RoyalTeam"]
    # Every guild killed Rotmire; it shows up as a boss but not in the kill count.
    assert all(g["bosses"][-1]["state"] == "killed" for g in season1["guilds"])
    assert by["Lelijkerds"]["mythicKills"] == 8 and by["RoyalTeam"]["mythicKills"] == 6
    assert by["RoyalTeam"]["current"]["name"] == "Crown of the Cosmos"
    assert by["Kelderklasse"]["current"] is None
    assert by["Kelderklasse"]["ceKilledAt"] == "2026-07-26T20:09:05.692Z"
    # The latest kill is the latest one that counts: RoyalTeam killed Lightblinded
    # Vanguard on 15 Jun and Rotmire later, on 17 Jun.
    assert by["RoyalTeam"]["bosses"][-1]["defeatedAt"].startswith("2026-06-17")
    assert by["RoyalTeam"]["latestKillAt"] == "2026-06-15T21:09:56.860Z"


def test_season_1_hall_of_fame_skips_sporefall_in_the_raider_ranking(season1):
    fame = season1["hallOfFame"]
    rotmire = next(b for b in fame["bosses"] if b["slug"] == "rotmire")
    assert rotmire["counts"] is False and len(rotmire["teams"]) == 5
    assert all(b["slug"] != "rotmire" for r in fame["raiders"] for b in r["bosses"])
    assert max(r["kills"] for r in fame["raiders"]) == 9


def test_current_race_json_says_it_is_the_live_season(config, rio):
    race = build_race(rio, config, NOW, log=lambda *a: None)
    assert race["season"] == {"id": "s2", "label": "Season 2", "archived": False, "end": None}
    assert race["seasons"][0]["current"] is True


def test_tier_without_output_is_refused(capsys):
    assert main(["--tier", str(ROOT / "seasons" / "season-1.toml")]) == 1
    assert "--output" in capsys.readouterr().err
