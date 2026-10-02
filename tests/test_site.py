"""The static site's contracts that a typo would break silently: every UI string
exists in both languages, and the CSP rules (no innerHTML, no inline styles)."""

from __future__ import annotations

import re
from pathlib import Path

SITE = Path(__file__).resolve().parents[1] / "site"


def _dict(js: str, lang: str) -> set[str]:
    """Keys of one language block in i18n.js's own i18n.add({...})."""
    block = js.split("i18n.add({", 1)[1]
    nl, en = block.split("\n  en: {", 1)
    body = nl if lang == "nl" else en
    return set(re.findall(r"^\s+'([\w.]+)':", body, re.MULTILINE))


def test_both_languages_have_the_same_keys():
    js = (SITE / "i18n.js").read_text(encoding="utf-8")
    nl, en = _dict(js, "nl"), _dict(js, "en")
    assert nl, "no Dutch strings found"
    assert nl == en, f"only nl: {sorted(nl - en)}, only en: {sorted(en - nl)}"


def test_every_used_key_exists():
    keys = _dict((SITE / "i18n.js").read_text(encoding="utf-8"), "nl")
    app = (SITE / "app.js").read_text(encoding="utf-8")
    html = (SITE / "index.html").read_text(encoding="utf-8")
    used = set(re.findall(r"\btr\('([\w.]+)'", app))
    used |= set(re.findall(r'data-i18n(?:-aria-label)?="([\w.]+)"', html))
    plural = set(re.findall(r"\btn\('([\w.]+)'", app))
    used |= {f"{k}_{form}" for k in plural for form in ("one", "other")}
    assert used, "no keys found in app.js / index.html"
    assert used <= keys, f"missing: {sorted(used - keys)}"


def test_no_innerhtml_and_no_inline_styles():
    for name in ("app.js", "i18n.js", "og.js"):
        js = (SITE / name).read_text(encoding="utf-8")
        assert not re.search(r"\.(inner|outer)HTML\s*[+]?=|insertAdjacentHTML", js), name
        assert "setAttribute('style'" not in js, name
    for name in ("index.html", "og.html"):
        html = (SITE / name).read_text(encoding="utf-8")
        assert not re.search(r"\sstyle=", html), name
        assert "<style" not in html, name
        assert re.search(r"<script>", html) is None, f"{name}: inline script"


def test_share_image_tags_are_absolute():
    html = (SITE / "index.html").read_text(encoding="utf-8")
    image = re.search(r'property="og:image" content="([^"]+)"', html)
    assert image and image.group(1) == "https://racetodutchfirst.bmiest.be/og.png"
    assert (SITE / "og.png").is_file()
