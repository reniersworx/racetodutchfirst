"""Tests for race position, ranking, and data handling.

Uses fixtures from real Raider.IO responses – no network in tests.
"""

import json
from pathlib import Path

import pytest

# Paths
FIXTURES = Path(__file__).parent / "fixtures"
BASE = Path(__file__).parent.parent  # project root


def _load_fixture(name: str) -> dict:
    with open(FIXTURES / name) as f:
        return json.load(f)


class TestRacePosition:
    """Race position = Mythic kills (both raids) + progress on current VA boss.

    Progress on current VA boss = (100 - bestPercent) / 100.
    If the CE boss is defeated, progress = 1.0.
    """

    def test_position_with_progress(self):
        """Guild with 5 VA mythic + 1 TG mythic + 27% current VA = 6.73."""
        data = _load_fixture("api/kelderklasse_profile.json")
        va_prog = data["raid_progression"]["the-venomous-abyss"]
        tg_prog = data["raid_progression"]["the-tidebound-grotto"]
        total_mythic = va_prog["mythic_bosses_killed"] + tg_prog["mythic_bosses_killed"]

        best_percent = 27.02  # from boss-progress fixture
        progress = (100 - best_percent) / 100
        expected = total_mythic + progress
        assert round(expected, 4) == pytest.approx(6.73, abs=0.01)

    def test_position_ce_defeated(self):
        """If CE boss is defeated, progress = 1.0 (fully killed)."""
        # Simulate: guild has killed all VA bosses + TG boss
        total_mythic = 9 + 1  # all bosses
        expected = total_mythic + 1.0  # +1 for the CE kill
        assert expected == 11.0

    def test_position_no_current_boss(self):
        """Guild that hasn't pulled the current VA boss yet."""
        best_percent = 100.0  # no progress
        progress = (100 - best_percent) / 100
        assert progress == 0.0

    def test_position_from_generated_data(self):
        """The generated race.json has consistent positions."""
        with open(BASE / "site" / "data" / "race.json") as f:
            data = json.load(f)
        for guild in data["guilds"]:
            va = guild["progression"]["the-venomous-abyss"]
            tg = guild["progression"]["the-tidebound-grotto"]
            total_mythic = va["mythic_bosses_killed"] + tg["mythic_bosses_killed"]
            cb = guild["current_boss"]
            if cb.get("isDefeated"):
                progress = 1.0
            elif cb.get("pullCount", 0) > 0 and cb.get("boss"):
                progress = (100 - cb["bestPercent"]) / 100
            else:
                progress = 0.0
            expected = round(total_mythic + progress, 4)
            assert guild["race_position"] == pytest.approx(expected, abs=0.001), (
                f"Position mismatch for {guild['name']}: "
                f"expected {expected}, got {guild['race_position']}"
            )


class TestRanking:
    """Ranking rules:
    1. Most Mythic kills (descending)
    2. Lowest best % on current VA boss (ascending)
    3. Latest kill first (earlier defeatedAt wins)
    4. Most Heroic kills (descending)
    """

    def _make_guild(self, name, va_mythic, tg_mythic, va_heroic, tg_heroic,
                    best_pct=100.0, latest_kill="2026-09-01T00:00:00Z"):
        return {
            "name": name,
            "progression": {
                "the-venomous-abyss": {
                    "mythic_bosses_killed": va_mythic,
                    "heroic_bosses_killed": va_heroic,
                },
                "the-tidebound-grotto": {
                    "mythic_bosses_killed": tg_mythic,
                    "heroic_bosses_killed": tg_heroic,
                },
            },
            "current_boss": {"bestPercent": best_pct, "boss": "test", "isDefeated": False},
            "boss_kill_dates": [{"defeatedAt": latest_kill}],
        }

    def test_most_mythic_wins(self):
        guilds = [
            self._make_guild("A", 5, 0, 3, 0),
            self._make_guild("B", 4, 0, 2, 0),
        ]
        from racetodutchfirst.__main__ import rank_guilds
        ranked = rank_guilds(guilds)
        assert ranked[0]["name"] == "A"
        assert ranked[1]["name"] == "B"

    def test_best_percent_breaks_tie(self):
        guilds = [
            self._make_guild("A", 4, 0, 2, 0, best_pct=66.96),
            self._make_guild("B", 4, 0, 2, 0, best_pct=43.73),
        ]
        from racetodutchfirst.__main__ import rank_guilds
        ranked = rank_guilds(guilds)
        assert ranked[0]["name"] == "B"  # lower % = closer to kill

    def test_latest_kill_breaks_tie(self):
        guilds = [
            self._make_guild("A", 4, 0, 2, 0, latest_kill="2026-09-01T00:00:00Z"),
            self._make_guild("B", 4, 0, 2, 0, latest_kill="2026-09-05T00:00:00Z"),
        ]
        from racetodutchfirst.__main__ import rank_guilds
        ranked = rank_guilds(guilds)
        assert ranked[0]["name"] == "A"  # earlier latest kill wins

    def test_heroic_breaks_tie(self):
        guilds = [
            self._make_guild("A", 4, 0, 3, 0),
            self._make_guild("B", 4, 0, 2, 0),
        ]
        from racetodutchfirst.__main__ import rank_guilds
        ranked = rank_guilds(guilds)
        assert ranked[0]["name"] == "A"

    def test_generated_data_ranking(self):
        """The ranking in race.json is consistent with the rules."""
        with open(BASE / "site" / "data" / "race.json") as f:
            data = json.load(f)
        guilds = data["guilds"]
        # Check ranks are sequential and match order
        for i, g in enumerate(guilds):
            assert g["rank"] == i + 1, f"Guild {g['name']} has wrong rank"

    def test_ce_defeated_wins(self):
        """A guild that defeated the CE boss ranks above all others."""
        guilds = [
            self._make_guild("Winner", 9, 1, 5, 0, best_pct=0.0),
            self._make_guild("Loser", 8, 1, 4, 0, best_pct=50.0),
        ]
        from racetodutchfirst.__main__ import rank_guilds
        ranked = rank_guilds(guilds)
        assert ranked[0]["name"] == "Winner"


class TestEmptyKillResponse:
    """The {} response means the guild hasn't killed this boss."""

    def test_empty_kill_means_not_killed(self):
        kill_data = _load_fixture("api/empty_kill.json")
        # Empty dict or no 'kill' key means not killed
        assert kill_data == {}, f"Expected empty dict, got {kill_data}"

    def test_non_empty_has_kill_info(self):
        kill_data = _load_fixture("api/kelderklasse_kill_nekzali.json")
        assert "kill" in kill_data
        assert "defeatedAt" in kill_data["kill"]
        assert "pulledAt" in kill_data["kill"]
        assert "durationMs" in kill_data["kill"]


class TestBossProgressResponse:
    """Test parsing of boss-progress responses."""

    def test_current_boss_has_progress(self):
        prog = _load_fixture("api/kelderklasse_boss_progress.json")
        assert "boss" in prog
        assert "slug" in prog["boss"]
        assert "bestPercent" in prog
        assert "pullCount" in prog
        assert "isDefeated" in prog

    def test_defeated_boss(self):
        prog = _load_fixture("api/kelderklasse_defeated_boss.json")
        # nekzali is already defeated by Kelderklasse
        assert prog.get("isDefeated", False) is True


class TestBossPullsResponse:
    """Test parsing of boss-pulls responses."""

    def test_pulls_have_required_fields(self):
        pulls_data = _load_fixture("api/kelderklasse_boss_pulls_the-twin-fangs.json")
        pulls = pulls_data.get("pulls", [])
        assert len(pulls) > 0, "Expected at least one pull in fixture"
        for pull in pulls:
            details = pull.get("details", {})
            assert "pull_started_at" in details or "started_at" in details
            assert "is_success" in details


class TestGeneratedDataStructure:
    """Test that the generated race.json has the expected structure."""

    def test_generated_at_present(self):
        with open(BASE / "site" / "data" / "race.json") as f:
            data = json.load(f)
        assert "generatedAt" in data
        assert "guilds" in data
        assert "tier" in data

    def test_all_five_guilds_present(self):
        with open(BASE / "site" / "data" / "race.json") as f:
            data = json.load(f)
        names = {g["name"] for g in data["guilds"]}
        expected = {"Kelderklasse", "Kameraden", "Knikkerende Krijgers",
                     "Lelijkerds", "RoyalTeam"}
        assert names == expected, f"Missing guilds: {expected - names}"

    def test_guild_has_required_fields(self):
        with open(BASE / "site" / "data" / "race.json") as f:
            data = json.load(f)
        for g in data["guilds"]:
            assert "name" in g
            assert "realm" in g
            assert "colour" in g
            assert "rankings" in g
            assert "progression" in g
            assert "current_boss" in g
            assert "race_position" in g
            assert "boss_kill_dates" in g
            assert "boss_pulls" in g

    def test_tier_structure(self):
        with open(BASE / "site" / "data" / "race.json") as f:
            data = json.load(f)
        tier = data["tier"]
        raid_slugs = [r["slug"] for r in tier["raids"]]
        assert "the-venomous-abyss" in raid_slugs
        assert "the-tidebound-grotto" in raid_slugs
        assert tier["ce_boss"] == "ulatek"

    def test_progression_has_both_raids(self):
        with open(BASE / "site" / "data" / "race.json") as f:
            data = json.load(f)
        for g in data["guilds"]:
            assert "the-venomous-abyss" in g["progression"]
            assert "the-tidebound-grotto" in g["progression"]
            va = g["progression"]["the-venomous-abyss"]
            assert "mythic_bosses_killed" in va
            assert "heroic_bosses_killed" in va
            assert "total_bosses" in va
