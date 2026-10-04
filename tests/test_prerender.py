"""prerender.py: the standings written into index.html for crawlers, and the sitemap."""

from __future__ import annotations

import copy
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

from racetodutchfirst.config import load_config
from racetodutchfirst.prerender import NL, prerender, sitemap
from racetodutchfirst.race import season_index

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


@pytest.fixture
def race() -> dict:
    return json.loads((SITE / "data" / "race.json").read_text(encoding="utf-8"))


def _nl_strings() -> dict[str, str]:
    js = (SITE / "i18n.js").read_text(encoding="utf-8")
    nl = js.split("i18n.add({", 1)[1].split("\n  en: {", 1)[0]
    return dict(re.findall(r"^\s+'([\w.]+)': '((?:[^'\\]|\\.)*)',", nl, re.MULTILINE))


def test_strings_match_i18n():
    nl = _nl_strings()
    assert {k: nl.get(k) for k in NL} == NL


def test_board_and_pills_carry_the_names(race):
    html = prerender((SITE / "index.html").read_text(encoding="utf-8"), race)
    board = html.split('id="lowerThirds"', 1)[1].split("</ol>", 1)[0]
    for g in race["guilds"]:
        assert g["name"] in board
    assert board.count("<li ") == len(race["guilds"])
    assert f"Cutting Edge: {race['tier']['ceBoss']['name']}".replace("'", "&#x27;") in html
    assert 'aria-label="Plaats 1"' in board
    assert "style=" not in board  # the CSP has no 'unsafe-inline'


def test_names_are_escaped(race):
    race = copy.deepcopy(race)
    race["guilds"][0]["name"] = '<script>alert(1)</script>"'
    race["guilds"][0]["profileUrl"] = 'javascript:alert(1)'
    html = prerender((SITE / "index.html").read_text(encoding="utf-8"), race)
    assert "<script>alert" not in html
    assert "&lt;script&gt;alert(1)&lt;/script&gt;&quot;" in html
    assert "javascript:" not in html


def test_missing_marker_fails(race):
    with pytest.raises(ValueError):
        prerender("<html></html>", race)


def test_sitemap_is_committed_and_current():
    expected = sitemap(season_index(load_config(ROOT / "guilds.toml")))
    assert (SITE / "sitemap.xml").read_text(encoding="utf-8") == expected
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [e.text for e in ET.fromstring(expected.encode()).findall("s:url/s:loc", ns)]
    assert locs[:2] == ["https://racetodutchfirst.bmiest.be/", "https://racetodutchfirst.bmiest.be/?lang=en"]
    assert "https://racetodutchfirst.bmiest.be/?season=s1&lang=en" in locs
    assert "Sitemap: https://racetodutchfirst.bmiest.be/sitemap.xml" in (SITE / "robots.txt").read_text()
