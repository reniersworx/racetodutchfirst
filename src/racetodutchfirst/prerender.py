"""uv run python -m racetodutchfirst.prerender: put the standings into site/index.html.

The page draws everything from race.json in the browser, so the HTML a crawler fetches has
no guild or boss names in it. CI runs this after the fetch (the result only goes into the
Pages artifact, like race.json): it fills the board and the tier pills with the same markup
app.js builds, in Dutch, which app.js replaces as soon as it runs. Every value is escaped:
guild and boss names come from an external API.

It also writes site/sitemap.xml from guilds.toml's seasons (committed too; robots.txt points at it).
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from html import escape
from pathlib import Path

from .config import ConfigError, load_config
from .race import season_index

ROOT = Path(__file__).resolve().parents[2]
SITE_URL = "https://racetodutchfirst.bmiest.be/"

# The Dutch strings app.js uses for the board and pills (i18n.js; a test keeps them equal).
NL = {
    "pill.bosses": "{n} bosses",
    "pill.ce": "Cutting Edge: {boss}",
    "pill.since": "Sinds {date}",
    "tile.place": "Plaats {n}",
    "tile.ce": "Cutting Edge behaald",
    "tile.done": "Alles verslagen",
    "tile.noPulls": "Nog geen pulls gezien",
    "tile.best": "Beste pull {pct} · {pulls}",
    "pulls_one": "{n} pull",
    "pulls_other": "{n} pulls",
}
MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"]

BOARD = '<ol id="lowerThirds" class="board"></ol>'
PILLS = '<div id="tierPills" class="sp__tier"></div>'


def _t(key: str, **kw: object) -> str:
    return NL[key].format(**kw)


def _pct(n: float) -> str:
    return f"{n:.2f}".replace(".", ",") + "%"


def _pulls(n: int) -> str:
    return _t("pulls_one" if n == 1 else "pulls_other", n=n)


def _day(iso: str) -> str:
    d = date.fromisoformat(iso[:10])
    return f"{d.day} {MONTHS[d.month - 1]}"


def _attr(**kw: str) -> str:
    return "".join(f' {k.rstrip("_").replace("_", "-")}="{escape(v)}"' for k, v in kw.items())


def board(data: dict) -> str:
    """The board's rows, as app.js's renderHero() draws them (minus colours and bars)."""
    winner = (data.get("winner") or {}).get("guild")
    guilds = data.get("guilds") or []
    lead = winner or (guilds[0]["name"] if guilds else None)
    total = data["tier"]["totalBosses"]
    rows = []
    for g in guilds:
        c = g.get("current")
        if winner == g["name"]:
            label = _t("tile.ce")
        elif not c:
            label = _t("tile.done")
        elif c.get("bestPercent") is None:
            label = f"{c['name']} · {_t('tile.noPulls')}"
        else:
            label = f"{c['name']} · {_t('tile.best', pct=_pct(c['bestPercent']), pulls=_pulls(c['pullCount']))}"
        url = g.get("profileUrl")
        name = (f'<a class="rib__val"{_attr(href=url, rel="noopener")}>{escape(g["name"])}</a>'
                if isinstance(url, str) and url.startswith("https://raider.io/")
                else f'<span class="rib__val">{escape(g["name"])}</span>')
        cls = "row row--lead" if g["name"] == lead else "row"
        rows.append(
            f'<li class="{cls}"><div class="rib"><div class="rib__bar"><div class="rib__in">'
            f'<span class="rib__acc mono"{_attr(aria_label=_t("tile.place", n=g["rank"]))}>{escape(str(g["rank"]))}</span>'
            f"{name}</div></div></div>"
            f'<span class="row__kills mono">{escape(str(g["mythicKills"]))}<small>/{escape(str(total))}</small></span>'
            f'<div class="row__fight"><div class="row__top"><span class="row__label">{escape(label)}</span></div>'
            f'<span class="row__hp" role="img"{_attr(aria_label=label)}><i></i></span></div></li>')
    return f'<ol id="lowerThirds" class="board">{"".join(rows)}</ol>'


def pills(data: dict) -> str:
    """The tier pills, as app.js's renderHeader() draws them for the live season."""
    tier = data["tier"]
    raids = " + ".join(f"{r['name']} {len(r['bosses'])}" for r in tier["raids"] if r.get("counts") is not False)
    return (f'<div id="tierPills" class="sp__tier">'
            f'<span class="pill"{_attr(title=raids)}>{escape(_t("pill.bosses", n=tier["totalBosses"]))}</span>'
            f'<span class="pill pill--jade">{escape(_t("pill.ce", boss=tier["ceBoss"]["name"]))}</span>'
            f'<span class="pill">{escape(_t("pill.since", date=_day(tier["start"])))}</span></div>')


def prerender(html: str, data: dict) -> str:
    for marker, filled in ((BOARD, board(data)), (PILLS, pills(data))):
        if html.count(marker) != 1:
            raise ValueError(f"index.html: expected {marker!r} exactly once")
        html = html.replace(marker, filled)
    return html


def sitemap(seasons: list[dict]) -> str:
    """The live season and every archive, each in Dutch and English (hreflang alternates)."""
    seasons = [s for s in seasons if not s.get("current")]
    pages = [""] + [f"season={s['id']}" for s in seasons]
    urls = []
    for q in pages:
        nl = SITE_URL + (f"?{q}" if q else "")
        en = SITE_URL + "?" + (f"{q}&lang=en" if q else "lang=en")
        alts = "".join(f'\n  <xhtml:link rel="alternate" hreflang="{lang}" href="{escape(u)}"/>'
                       for lang, u in (("nl", nl), ("en", en), ("x-default", nl)))
        urls += [f"<url>\n  <loc>{escape(u)}</loc>{alts}\n</url>" for u in (nl, en)]
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + "\n".join(urls) + "\n</urlset>\n")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="racetodutchfirst.prerender", description=__doc__)
    ap.add_argument("--site", type=Path, default=ROOT / "site")
    ap.add_argument("--config", type=Path, default=ROOT / "guilds.toml")
    args = ap.parse_args(argv)
    try:
        seasons = season_index(load_config(args.config))
        data = json.loads((args.site / "data" / "race.json").read_text(encoding="utf-8"))
        index = args.site / "index.html"
        html = prerender(index.read_text(encoding="utf-8"), data)
    except (OSError, ConfigError, ValueError, KeyError, TypeError) as exc:
        print(f"prerender: {exc}", file=sys.stderr)
        return 1
    index.write_text(html, encoding="utf-8")
    (args.site / "sitemap.xml").write_text(sitemap(seasons), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
