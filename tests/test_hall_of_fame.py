"""Hall of fame: every guild's kill team per boss, and the raiders in them."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from racetodutchfirst.race import (
    build_race,
    compact_roster,
    fetch_guild,
    hall_of_fame,
    wcl_fights_for,
)
from racetodutchfirst.wcl import WarcraftLogs
from tests.conftest import FixtureWCL, guild

NOW = datetime(2026, 10, 2, 22, 0, tzinfo=UTC)


@pytest.fixture
def race(rio, config):
    return build_race(rio, config, NOW, log=lambda _m: None)


def _boss(race, slug):
    return next(b for b in race["hallOfFame"]["bosses"] if b["slug"] == slug)


def test_teams_per_boss_first_kill_first(race):
    nek = _boss(race, "nekzali-the-soulcoiler")
    assert [t["guild"] for t in nek["teams"]] == [
        "Kelderklasse", "Kameraden", "RoyalTeam", "Knikkerende Krijgers", "Lelijkerds"]
    assert all(len(t["roster"]) == 20 and t["rosterKnown"] for t in nek["teams"])
    assert len(_boss(race, "nymrissa-wavecaller")["teams"][0]["roster"]) == 25


def test_only_killed_bosses(race):
    slugs = [b["slug"] for b in race["hallOfFame"]["bosses"]]
    assert "the-twin-fangs" not in slugs and "ulatek" not in slugs
    assert len(slugs) == 6


def test_roster_tanks_then_healers_then_dps(race):
    roster = _boss(race, "sszorak")["teams"][0]["roster"]
    roles = [m["role"] for m in roster]
    assert roles == sorted(roles, key=["tank", "healer", "dps"].index)
    assert roles.count("tank") == 2


def test_ranking_race_firsts_then_kills(race):
    raiders = race["hallOfFame"]["raiders"]
    keys = [(-r["firsts"], -r["kills"], r["name"].casefold()) for r in raiders]
    assert keys == sorted(keys)
    top = raiders[0]
    assert (top["firsts"], top["kills"], top["guild"]) == (6, 6, "Kelderklasse")
    kam = next(r for r in raiders if r["guild"] == "Kameraden")
    assert kam["firsts"] == 0 and kam["kills"] == 5


def test_raider_links_go_to_raiderio(race):
    r = next(r for r in race["hallOfFame"]["raiders"] if r["name"] == "Boelíe")
    assert r["url"] == "https://raider.io/characters/eu/tarren-mill/Boel%C3%ADe"


def test_rosters_stay_out_of_the_guild_records(race):
    assert all("_rosters" not in g for g in race["guilds"])
    assert all("_roster" not in b for g in race["guilds"] for b in g["bosses"])


def test_kill_known_only_from_wcl_has_no_roster(rio, config):
    g = guild(config, "Kameraden")
    wcl = WarcraftLogs(FixtureWCL(), "id", "secret", sleep=lambda _s: None)
    gid, fights = wcl_fights_for(wcl, g, config.tier)
    fights.append({"encounter": 3420, "kill": True, "percent": 0.0, "start": 1_759_440_000_000,
                   "end": 1_759_440_300_000, "report": "x"})
    out = fetch_guild(rio, g, config.tier, wcl_fights=fights, wcl_id=gid)
    fame = hall_of_fame([out], config.tier)
    team = next(b for b in fame["bosses"] if b["slug"] == "sszorak")["teams"][0]
    assert team["rosterKnown"] is False and team["roster"] == []


def _member(name, realm="draenor", role="dps"):
    return {"character": {"name": name, "realm": {"name": realm.title(), "slug": realm},
                          "region": {"slug": "eu"}, "class": {"name": "Mage"},
                          "spec": {"name": "Frost", "role": role}}}


def test_guild_switch_counts_once_latest_guild_wins(config):
    def g(name, when, roster):
        bosses = [{"raid": b.raid, "slug": b.slug, "name": b.name,
                   "defeatedAt": when if b.slug == "nekzali-the-soulcoiler" else None,
                   "pullCount": 3} for r in config.tier.raids for b in r.bosses]
        return {"name": name, "colour": "#123456", "bosses": bosses,
                "_rosters": {"the-venomous-abyss/nekzali-the-soulcoiler": compact_roster(roster)}}

    fame = hall_of_fame([
        g("Old", "2026-09-01T20:00:00Z", [_member("Hopper")]),
        g("New", "2026-09-20T20:00:00Z", [_member("Hopper"), _member("Stay")]),
    ], config.tier)
    hopper = next(r for r in fame["raiders"] if r["name"] == "Hopper")
    assert (hopper["kills"], hopper["firsts"], hopper["guild"]) == (2, 1, "New")


def test_compact_roster_skips_junk():
    roster = compact_roster([None, {}, {"character": {"name": ""}}, _member("Ok", realm="bad realm!"),
                             _member("Tank", role="tank")])
    assert [m["name"] for m in roster] == ["Tank", "Ok"]
    assert roster[1]["url"] is None  # not a realm slug: no link
    assert compact_roster("nope") == []
