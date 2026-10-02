# Race to Dutch First — Agent Notes

## Wat dit is

Een publieke website die de race volgt tussen Nederlandse WoW-gilden om als eerste Cutting Edge (laatste Mythic-boss van de huidige raid-tier) te halen. Alle UI-tekst is in **Nederlands**.

## Opzet

```
guilds.toml          # gilden, realms, kleuren, tier-configuratie
pyproject.toml       # Python 3.12+, uv, httpx, tomli, pytest
src/racetodutchfirst/
  __main__.py        # fetcher: haalt alles op → site/data/race.json
tests/
  test_race.py       # 20 tests met fixtures (geen netwerk)
  fixtures/api/      # echte Raider.IO-responses
site/
  index.html         # één pagina, 6 secties
  style.css          # dark tiles, ribbon header, responsive
  tokens.css         # ongewijzigd van Bmiest/bmiest_wow_streaming_theme
  app.js             # laadt race.json, tekent inline SVG
  data/
    race.json        # gegenereerd door __main__.py
```

## Hoe draaien en testen

```bash
uv sync
uv run python -m racetodutchfirst   # → site/data/race.json
uv run pytest tests/ -v             # alle tests moeten passeren
node --check site/app.js            # syntax check
```

## Layout (6 secties, volgorde in index.html)

1. **De race** — baan per gilde (0–9), markers op posities, finish line bij CE-boss
2. **Klassement** — kaart per gilde: rank, naam, realm, Mythic/Heroic bars, huidige boss %, world rank
3. **Voortgang** — lijngrafiek over tijd (step lines per gilde)
4. **Per boss** — raster bosses × gilden; eerste kill=goud, huidige boss=% bar, ongebruikt=dim
5. **Huidige boss** — per gilde: best-% curve over pulls ("hoe dicht bij?")
6. **Footer** — "Bijgewerkt X minuten geleden", bronvermelding

## Data sources

### Raider.IO (primary, no key needed)

1. **Guild profile:** `GET /v1/guilds/profile?region=eu&realm=<r>&name=<g>&fields=raid_progression,raid_rankings`
   - `raid_progression["the-venomous-abyss"]` → `mythic_bosses_killed`, `heroic_bosses_killed`, `summary`
   - `raid_rankings[<slug>].mythic` → world/region/realm ranks

2. **Boss kill:** `GET /v1/guilds/boss-kill?region=eu&realm=<r>&guild=<g>&raid=<slug>&boss=<b>&difficulty=mythic`
   - Returns `{kill: {defeatedAt, pulledAt, durationMs}, roster: [...]}` or `{}` if not killed

3. **Boss progress (live-tracking):** `GET /v1/live-tracking/guild/boss-progress?raid=<s>&difficulty=mythic&boss=<b|latest>&period=until_kill&region=eu&realm=<r>&guild=<g>`
   - Returns `bestPercent`, `pullCount`, `isDefeated`, `overallProgress.mythicBossesKilled`

4. **Boss pulls (live-tracking):** same params + `/boss-pulls`
   - Returns `pulls[]` with `details.pull_started_at`, `is_success`, `duration_ms`, `encounter_health.overall_percent`

**Rules:** Send User-Agent naming the site, pause ~0.3 s between requests, URL-encode guild names, realm slugs lowercase.

### Warcraft Logs (optional)

Check env vars `WCL_CLIENT_ID` and `WCL_CLIENT_SECRET`. If not set, skip WCL entirely — site works on Raider.IO alone. Never put credentials in the repo.

## Race position calculation

```
position = mythic_kills(both_raids) + (100 - bestPercent) / 100
```

Example: 5 kills + best pull at 27% → 5 + 0.73 = 5.73

## Ranking rules

1. Most Mythic kills
2. Lowest best % on current Venomous Abyss boss (closer to kill = lower %)
3. Latest kill first
4. Most Heroic kills

First guild to kill `ulatek` on Mythic is **the winner**.

## Design system

- `tokens.css`: copy from Bmiest/bmiest_wow_streaming_theme (unchanged). Use only its CSS variables: `--ink-*`, `--paper`, `--jade`, `--gold`, `--rose`, Outfit + JetBrains Mono fonts. Override `body{overflow:hidden}` in style.css.
- Ribbon header: `.rib` classes from css/ribbon.css
- Dashboard tiles: dark `.tile` from wowaudit_wishlist_updater's site/style.css
- CSP: `'self'` plus Google Fonts only (from wowaudit site/index.html)

## Adding guilds

Edit `guilds.toml` — add name, realm, colour. The fetcher reads this file automatically.

## Changing the tier / CE boss

Edit `guilds.toml`:
- `tier.raids[].slug` — Raider.IO raid slug
- `tier.bosses[]` — boss slugs in order
- `tier.ce_boss` — the Cutting Edge boss (e.g., "ulatek")

## Frontend notes

- `app.js` loads `data/race.json` and draws everything with inline SVG
- No chart libraries, no CDN scripts
- Responsive: 360px phone → desktop breakpoints at 720px and 400px
- Each guild gets a fixed colour from `guilds.toml`
- All UI text in Dutch

## Testing

Tests use fixtures in `tests/fixtures/api/` — no network. Run real data once with `uv run python -m racetodutchfirst` to update `site/data/race.json`.

## CI (proposed, not yet committed)

Two workflow YAMLs to be added by the operator:
1. `update-wishlists.yml` — runs fetcher every 30 min + on `workflow_dispatch`, publishes site with fresh data
2. `deploy-site.yml` — deploys `site/` to GitHub Pages

WCL secrets come from Actions secrets (operator adds them).
