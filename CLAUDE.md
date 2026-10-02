# Race to Dutch First: notes for agents

A public, static site that follows Dutch WoW guilds racing to be the first to reach
Cutting Edge (the CE boss on Mythic) in the current raid tier. **All UI text is Dutch.**
Live at https://racetodutchfirst.bmiest.be/ (GitHub Pages, custom domain set in the
repo's Pages settings, DNS at Cloudflare as DNS-only).

## Layout

```
guilds.toml                  guilds (name, realm, colour) + tier (raids, bosses in order, CE boss)
src/racetodutchfirst/
  config.py                  loads and validates guilds.toml
  raiderio.py                the 4 Raider.IO endpoints; pacing, retries, fixture recording
  wcl.py                     Warcraft Logs v2 (optional): token, reports+fights query, dedupe
  race.py                    responses → per-guild state, race position, ranking, winner
  __main__.py                CLI: writes site/data/race.json (atomically; never on failure)
tests/
  conftest.py                FixtureHTTP: replays tests/fixtures/raiderio/*.json, no network
  test_race.py
  fixtures/raiderio/         real responses, recorded 2026-10-02 (rosters emptied)
  fixtures/wcl/              real WCL report pages, recorded 2026-10-02 (no token in them)
  test_wcl.py                the WCL merge
  fixtures/api/              older single responses from the first version (unused but kept)
site/                        static, no build step, no framework, no CDN scripts
  index.html                 sections in order: De race, Klassement, Voortgang, Per boss, Huidige boss, footer
  app.js                     loads data/race.json, draws everything (inline SVG)
  style.css                  the page
  tokens.css                 copied UNCHANGED from Bmiest/bmiest_wow_streaming_theme css/tokens.css
  data/race.json             sample data; CI regenerates it into the Pages artifact only
.github/workflows/site.yml   raid evenings every 30 min, else every 2 h, + main pushes + manual: fetch, deploy
.github/workflows/test.yml   PRs and main: ruff, pytest, node --check
```

## Run and test

```bash
uv sync
uv run python -m racetodutchfirst                                # live fetch → site/data/race.json (~80 requests, ~40 s)
# with WCL_CLIENT_ID / WCL_CLIENT_SECRET in the environment it adds Warcraft Logs (~6 requests)
uv run python -m racetodutchfirst --record tests/fixtures/raiderio  # re-record fixtures (then fix test expectations)
uv run pytest
uv run ruff check src tests
node --check site/app.js
uv run python -m http.server 8000 --directory site               # file:// can't fetch race.json
```

Visual check without a desktop: `google-chrome --headless=new --window-size=360,7600
--virtual-time-budget=8000 --screenshot=out.png http://127.0.0.1:8000/` (and 1280 wide).

## Race rules (race.py)

- **Race position** = Mythic kills in all tier raids + `(100 - bestPercent) / 100` on the
  current boss. No pull on it yet → no fraction. A guild that killed the CE boss is drawn
  on the finish.
- **Ranking**: most Mythic kills → lowest best % on the current boss (none = 100) →
  earliest *latest* kill → most Heroic kills → name.
- **Winner**: earliest Mythic kill of `tier.ce_boss`, independent of the ranking.
- **Current boss**: Raider.IO's `boss=latest` if it's still alive, else the living
  main-raid boss with the lowest best %, else the first living one. After a full
  main-raid clear, the same for the next raid.

## Raider.IO: rules and traps

Public API, no key. Their Acceptable Use allows **only the published endpoints**, and asks
for a link back to raider.io (the footer and every card have one). `RaiderIO.get()` sleeps
0.3 s before *every* request and sends a User-Agent naming the site; never add a call site
that bypasses it, and never loop requests tightly. 429/5xx/timeouts are retried twice
(3 s, 10 s); then the run fails and race.json stays as it was.

Found in the live data (each has a test):

- **Kill order isn't linear.** RoyalTeam and Lelijkerds are 2/8 with Entombed Sentinels
  (boss 2) still alive. Never derive kills from boss order.
- **`boss=latest` can be a dead boss.** Treating it as current added a phantom kill
  (RoyalTeam showed 3.0 for 2 kills).
- **Live tracking misses kills.** Lelijkerds killed The Lost Explorers on 24/9, but
  boss-progress still says `isDefeated: false` at 8.57%. `boss-kill` decides what is dead;
  live tracking only supplies pull counts and best %. Pull counts can be low (a kill
  with 1 pull means live tracking saw only the kill).
- **`boss-kill` answers `{}` with HTTP 200** for a boss that isn't killed. Kills are probed
  in order: live-tracking-defeated first, then bosses with pulls, then the rest, until the
  profile's kill count is found. A mismatch prints a warning.
- **`boss-pulls` includes resets** (`is_reset`, ~0 s, boss at 100%) that `pullCount`
  doesn't count; they're dropped.
- The profile also returns **older raids** (`tier-mn-1`, `sporefall`). Read only the
  slugs in guilds.toml. `total_bosses` for The Venomous Abyss is 8; the tier is 8 + 1 = 9.
- World rank 0 means unranked (shown as "–").
- Raider.IO goes down regularly (500/502/504). Check with a plain curl before "fixing" code.

## Warcraft Logs (optional)

On when `WCL_CLIENT_ID` and `WCL_CLIENT_SECRET` are set (Actions secrets in CI; a client
made for this site on warcraftlogs.com/api/clients). Without them, or when WCL fails, the
run goes on with Raider.IO alone and the footer says so. The secret only mints a token
inside the run; never commit it, never put a token in the page.

What it does (logic ported from the overlay's `js/wcl.js`, header comments there):
one query per guild, `reports(guildID, zoneID: 53, startTime: tier start)` with
`fights(difficulty: 5)`, 40 reports a page. `fightPercentage`, not `bossPercentage`
(phase-relative). Fights map to bosses by `encounter` in guilds.toml (Blizzard encounter
ID = WCL encounterID = Raider.IO wowEncounterId); zone 53 also holds Nymrissa (her own
raid) and an unknown Kith'ix (3513), ignored. Guild IDs are `wcl_id` in guilds.toml.

Merge, per boss (`race.merge_wcl`): earliest kill of both sources; the most pulls up to
that kill (reclears after it don't count); the lowest best %. **Never "WCL wins":**
- **Duplicate reports.** Several members log the same night; Kameraden had 107 of 259
  fights twice. Copies start within 5 s; the next real pull is 80 s+ later.
  `wcl.dedupe` merges fights of one encounter within 10 s from different reports.
- **Logs are incomplete.** Lelijkerds' first logged Mythic kills are a week after the
  real ones; RoyalTeam logs no Mythic at all. Raider.IO stays the base.
- WCL gives 2 decimals; the same pull can read 27.00 there and 27.02 on Raider.IO.
- Cost: ~120 of 3600 points/hour per run for 5 guilds (measured 2026-10-02). Pulls
  come from WCL for the current-boss curve only when WCL saw more than Raider.IO.

## Frontend rules

- Build DOM with `h()` / `s()` and `textContent`. **No `innerHTML`**: guild and boss names
  come from an external API.
- The CSP is `'self'` + Google Fonts only, and no `'unsafe-inline'`: so no `style="…"` in
  HTML and no `setAttribute('style')`. Set custom properties with `el.style.setProperty()`.
- Colours, fonts and radii come from tokens.css variables. Guild colours come from
  guilds.toml (validated `#rrggbb` in config.py *and* app.js) as `--guild` / `--acc`.
  Keep them clear of jade and gold, which mean leader / first kill / winner.
- Look borrowed from the operator's repos: ribbons (`.rib`, `.rib__cap`) and the angled
  `rcard` from the overlay's css/ribbon.css; boss card type (`.boss__*`) and pull bars
  (higher = more HP gone) from its css/banner.css; dark `.tile`s, pills and the header
  from bmiest_wowaudit_wishlist_updater site/style.css. Late data is gold, not red.
- Charts draw at the container's measured width and redraw on resize (ResizeObserver).
  It must work at 360 px: the per-boss table scrolls sideways with a sticky boss column.

## Changing the tier

Edit `[tier]` in guilds.toml: `start`, `ce_boss = { raid, boss }`, and `[[tier.raids]]` with
`bosses = [{ slug, name }]` in order. The first raid is the main one (current boss).
Re-record fixtures afterwards and update the tests' expectations.

## Shipping

PR → green `Test` → squash-merge. A merge to main deploys the site. Scheduled workflows
on a public repo stop after 60 days without commits; GitHub emails first. Re-enable in
the Actions tab.
