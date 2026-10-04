# Race to Dutch First: notes for agents

A public, static site that follows Dutch WoW guilds racing to be the first to reach
Cutting Edge (the CE boss on Mythic) in the current raid tier. **The UI is Dutch by default**,
with an English translation behind the NL | EN switch (see *Languages*).
Live at https://racetodutchfirst.bmiest.be/ (GitHub Pages, custom domain set in the
repo's Pages settings, DNS at Cloudflare as DNS-only).

## Layout

```
guilds.toml                  guilds (name, realm, colour) + tier (raids, bosses in order, CE boss)
src/racetodutchfirst/
  config.py                  loads and validates guilds.toml
  raiderio.py                the 4 Raider.IO endpoints; pacing, retries, fixture recording
  wcl.py                     Warcraft Logs v2 (optional): token, reports+fights query, dedupe
  twitch.py                  who of [streams] is live on Twitch, via DecAPI
  race.py                    responses → per-guild state, race position, ranking, winner
  __main__.py                CLI: writes site/data/race.json (atomically; never on failure)
tests/
  conftest.py                FixtureHTTP: replays tests/fixtures/raiderio/*.json, no network
  test_race.py
  fixtures/raiderio/         real responses, recorded 2026-10-02 (rosters emptied)
  fixtures/wcl/              real WCL report pages, recorded 2026-10-02 (no token in them)
  test_wcl.py                the WCL merge
  test_site.py               frontend contracts: same keys in nl + en, no innerHTML, no inline style
  fixtures/api/              older single responses from the first version (unused but kept)
scripts/og-image.sh          headless Chrome: site/og.html → site/og.png (run by site.yml)
site/                        static, no build step, no framework, no CDN scripts
  index.html                 splash hero (top bar, title, Nu live when someone streams, board, kills ticker), then Voortgang, Per guild, Hall of fame (folded), footer
  i18n.js                    NL + EN strings and the global `i18n` (loaded before app.js)
  app.js                     loads data/race.json, draws everything (inline SVG)
  og.html, og.css, og.js     the 1200x630 share image page; scripts/og-image.sh screenshots it to og.png
  og.png                     committed fallback share image; CI replaces it in the Pages artifact
  splash.css                 the hero (design language v2: the overlay's language as a raid poster)
  style.css                  the sections below the hero
  bossart.js                 boss renders per encounter, copied UNCHANGED from the overlay's js/bossart.js (build-bossart.py there)
  tokens.css                 copied UNCHANGED from Bmiest/bmiest_wow_streaming_theme css/tokens.css
  data/race.json             sample data; CI regenerates it into the Pages artifact only
.github/workflows/site.yml   raid evenings every 30 min, else every 2 h, + main pushes + manual: fetch, share image, deploy
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

## Hall of fame

`race.hall_of_fame()` turns the `boss-kill` rosters (already fetched for kill dates, so no
extra requests) into `race.json`'s `hallOfFame`: per killed boss each guild's team in kill
order (the first is the race's first kill), and every raider ranked by race-first kills,
then kills with their guild. Raiders are characters keyed by realm + name: an alt counts
apart; after a guild switch the latest kill's guild wins. A kill known only from WCL has
`rosterKnown: false`. `site/halloffame.js` + `halloffame.css` draw it, on app.js's
`race:data` event *and* from app.js's global `race` at load (race.json can arrive before
halloffame.js does). Fixture rosters are trimmed by `RecordingHTTP` to the used fields.

## Live streams

`[streams]` in guilds.toml lists Twitch channels (`twitch`, optional `guild`) and a `game`
filter (World of Warcraft; removed as a test in PR #9, so every live stream shows). `twitch.py` asks DecAPI (https://decapi.me/twitch/<what>/<login>,
plain text, no key; the overlay uses it too) per channel: `uptime` ("<login> is offline" or
"1 hour, 2 minutes, …"), and only for live ones `game`, `title`, `viewercount`. A failure
makes that channel `live: null` and never stops the run. `site/live.js` draws "Nu live" in the
hero (`#onAir`) for `shown` channels and hides it once `streams.checkedAt` is over 75 min old:
at the foot of the boss column on wide screens (ink-900 backing, so no text sits on the art),
after the tier pills below 1281px. The leader's guild's stream comes first, then most viewers;
the other live channels are ribbons that switch the player. The player is a click-to-load
facade: before a click the page only loads Twitch's preview still (static-cdn.jtvnw.net), on
click Twitch's embed (player.twitch.tv, `parent` = location.hostname). The CSP allows exactly
those two hosts (img-src, frame-src); without them the page still works, minus the embed. A
loaded player survives data refreshes and NL | EN redraws (it is only rebuilt when the
featured channel changes), so a stream never restarts under the viewer.
Raider.IO's published `raiding/boss-rankings` also carries per-guild `streamers` (count +
top stream), but only for a realm's top 50 guilds per boss; Lelijkerds and RoyalTeam never
appear, so it isn't used (see issue #6). Warcraft Logs' API has no stream data.

## Frontend rules

Read `DESIGN.md` before UI work: it records the visual system (tokens, components, rules);
`.impeccable/design.json` is its machine-readable sidecar for the Impeccable plugin.

- Build DOM with `h()` / `s()` and `textContent`. **No `innerHTML`**: guild and boss names
  come from an external API.
- The CSP is `'self'` + Google Fonts only, and no `'unsafe-inline'`: so no `style="…"` in
  HTML and no `setAttribute('style')`. Set custom properties with `el.style.setProperty()`.
- Colours, fonts and radii come from tokens.css variables (one exception: `--live-red` for the
  LIVE block sits on :root in splash.css until the overlay's tokens.css adopts it). Guild colours come from
  guilds.toml (validated `#rrggbb` in config.py *and* app.js) as `--guild` / `--acc`.
  Keep them clear of jade and gold, which mean leader / first kill / winner.
- Look: design language v2 (direction contract in `.impeccable/surfaces/site-index-html.md`,
  product record in `PRODUCT.md`, shared repo Bmiest/bmiest-design). The overlay's language
  grown into a poster: ribbons (`.rib`), slanted pills and bars, flat inks; jade for the race
  brand, raiding and the CE marker, gold only for the leader, the first kill and the winner. No coloured side
  stripes on cards or cells: use a 1-2px outline or a guild chip/rank block instead.
- The hero shows the leader's current boss (the CE boss once someone won) from bossart.js:
  self-hosted cut-outs in site/img/boss/ made by scripts/boss-cutouts.py from Blizzard's renders
  (rerun it after copying a new bossart.js; it trims each to the body and embeds its origin as
  Impeccable provenance). Nothing is drawn on the boss. A council fight shows up to two bodies.
  The art owns the column right of the board; a lone render wider than 2:1 takes the field beside
  the title instead; below 1180px it is a band above the title. Never shown past 2x its own size
  (`--nat-h`). A boss missing from bossart.js (Nymrissa) leaves the hero without art.
- Boss heads below the hero (`bossThumb()`): a slanted ink tile with the top of the render, or
  the boss's initial when there is no art, so every head lines up.
- The top bar is sketch C's broadcast bug: flush blocks, LIVE (only while some guild's
  `liveState` is `live`), the name, and "Dag N" (tier.start is day 1; stops on the winning day).
  NL | EN uses the same flush blocks.
- Charts draw at the container's measured width and redraw on resize (ResizeObserver).
  It must work at 360 px.
- Below the hero (chosen from three mockups, 2026-10-04: variant B): Voortgang (raid nights
  = days with a pull or kill in race.json, shaded; first kills as gold stars, guild names at the line ends; the legend only on phones),
  then **Per guild** (`renderGuildSheets()`, one table row per guild: a cell per boss with the
  kill date or best pull, then the pulls on its current boss as bars with a link to their source),
  then the Hall of fame folded in a `<details>`. The per-boss table and the current-boss cards
  are gone: the hero board already shows each guild's current boss. On phones the Per guild
  table scrolls sideways with the guild column pinned. The kills ticker spans the full width.
- "Nu aan het raiden" (`liveState`) is derived in the browser: the last pull on the current
  boss or the latest kill within 60 min of `generatedAt`, *and* race.json itself under 60 min
  old; otherwise "Raidde om 21:57" for 12 h. Badges repaint every 30 s without new data.
- Voortgang starts in the week of the first Mythic kill (weeks counted from `tier.start`, so
  ticks stay on the reset), not at the tier start.

## Languages

`i18n.js` holds every UI string in Dutch and English. Order: `?lang=nl|en`, then the
visitor's earlier choice (localStorage `lang`), then Dutch; the browser language is ignored on
purpose. The switch redraws the page (render() runs again) and dispatches `race:lang` on
`document` with `{ detail: { lang } }`.

- New UI text: add the key to **both** `nl` and `en` (test_site.py fails otherwise), use
  `tr('key', { vars })` in app.js, `data-i18n="key"` for static text in index.html.
- Other scripts register their own strings with `i18n.add({ nl: {...}, en: {...} })` and read
  `i18n.lang`, `i18n.t()`, `i18n.tn()` (plural via `key_one` / `key_other`), `i18n.num()`.
  `day()` / `dayTime()` in app.js follow the active locale (nl-NL / en-GB).
- Game names (guilds, raids, bosses) are never translated. og.png stays Dutch.
- The app.js helpers `h()`, `$()`, `day()`, `dayTime()`, `colour()`, `setGuild()` and
  `raiderioUrl()` are globals other scripts use: keep their names and signatures.

## Earlier seasons

The site can switch to a finished season. `[[seasons]]` in guilds.toml lists them (`id`,
`label`, `file` under site/); `[tier]` has the current season's `id` and `label`. Each
archived season has a tier file in `seasons/` (only a `[tier]` table, with `end`) and a
committed archive made once with
`uv run python -m racetodutchfirst --tier seasons/season-1.toml --output site/data/season-1.json`
(same guilds, no streams, no WCL without a zone). CI only refreshes race.json, never an archive.

- race.json and every archive carry `season` (`id`, `label`, `archived`, `end`) and `seasons`
  (the switch list, current first), so the page knows what it shows and what it can switch to.
- The page (app.js): a Season 2 | Season 1 switch next to NL | EN (`#seasonSwitch`, the same
  flush blocks; S2 | S1 on phones), hidden unless `seasons` lists an archive. `?season=s1` loads
  that archive once (race.json first, for the list; an archive is never refreshed). An archive is
  never live (`liveState` returns null), the update line says when it closed and never turns
  late, Dag N stops on the win (or the season's end), the title reads "Wie haalde als eerste".
- `splitSideRaids()` drops `counts: false` raids from `tier.raids` and the guilds' `bosses` right
  after the fetch, so every chart and table counts only the race; they come back as one line
  under the winner banner (`#sideRaids`).
- `race = false` on a raid (Sporefall in Season 1): fetched and shown (`counts: false` in
  `tier.raids` and `hallOfFame.bosses`), but its kills don't count for kills, the current
  boss, the ranking, latestKillAt or the raider ranking. The first raid and the CE boss must count.
- Season 1 = Raider.IO's `tier-mn-1` (The Voidspire, The Dreamrift and March on Quel'Danas as
  one 9-boss raid), CE = Midnight Falls. Raider.IO keeps kills, kill pulls and rosters of
  old raids, but no pulls on a boss a guild never killed: those show as no pulls seen.
  Fixtures: tests/fixtures/raiderio-s1 (recorded 2026-10-04).

## Changing the tier

Edit `[tier]` in guilds.toml: `start`, `ce_boss = { raid, boss }`, and `[[tier.raids]]` with
`bosses = [{ slug, name }]` in order. The first raid is the main one (current boss).
Re-record fixtures afterwards and update the tests' expectations.

## Shipping

PR → green `Test` → squash-merge. A merge to main deploys the site. Scheduled workflows
on a public repo stop after 60 days without commits; GitHub emails first. Re-enable in
the Actions tab.
