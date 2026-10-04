---
version: 1
slug: "site-index-html"
primary_target: "site/index.html"
related_targets: []
---

## Scope

Race to Dutch First, the whole page (`site/index.html` with `splash.css`, `style.css`, `halloffame.css`, `app.js`, `bossart.js`). First surface of design language v2. Mode: Operate with a poster hero. Brand-neutral: no bmiest branding, but the overlay's visual language.

## Audience and task

Dutch raiders and the wider Dutch WoW community, on a phone or a second monitor around raid nights. Task: see who leads, how far every guild is on its current boss, who is raiding now, the latest kills; then the details below. NL + EN for every string (Dutch default); honest about source and freshness.

## Direction contract

THESIS: The race as a raid poster in the language of the bmiest stream overlay: the boss the leader is fighting right now is the hero, and the standings sit on it as overlay ribbons. It refuses the generic data dashboard that the canon and Klassement attempts became.

OWN-WORLD: The overlay's tokens unchanged (ink scale, jade, gold, Outfit + JetBrains Mono): ribbons with a coloured accent block, slanted pills and bars, flat dark panels; a jade/void glow behind a Blizzard boss render; jade for the race brand, raiding and the CE marker, --live-red for on air (LIVE, Nu live), gold only for the leader, the first kill and the winner, guild colours on rank blocks, bars and chips. No side stripes.

STORY: In one look the visitor sees the boss the race is stuck on, the question, every guild's kills and how far it has brought its current boss, and the latest kills; LIVE appears only while a guild is raiding. Below (user-chosen 2026-10-04 from three code-led mockups in `.impeccable/mocks/below/`: variant B for the data, variant A's edge-to-edge ticker): Voortgang (raid nights from the data, first-kill stars, names at the line ends), then Per guild (a row per guild: a cell per boss with kill date or best pull, then the pulls on its current boss), then the Hall of fame folded. No per-boss table and no current-boss cards: the hero board carries each guild's current boss.

FIRST VIEWPORT: Top bar as sketch C's broadcast bug (user decision after the first build): flush blocks LIVE (only when raiding), RACE TO DUTCH FIRST, Dag N; update time and NL|EN (same flush blocks) right. Then the uppercase title with "Cutting Edge?" in jade, the lead line and tier pills, over the leader's current boss render (two bodies for a council fight) owning the column right of the board (a lone wide render takes the field beside the title; below 1180px a band above the title), never past 2x its render, with nothing drawn on it. Under the title the board: per guild a ribbon (rank block in guild colour, name, raiding badge), kills x/9, and a raid-frame bar labelled with its current boss, best pull and pulls; the leader in gold. A jade "Laatste kills" ticker closes the hero, edge to edge.

FORM: User-pinned from a three-sketch moodboard: sketch A (the splash) with the ticker of sketch C, after the category standard (seed 837f26aa canon card) and "Het Klassement" (pick card) were built and rejected. Reference the user named: "my overlay".

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature move

The live hero: the boss the leader is fighting right now, swapping by itself as the race moves on.

## Unresolved

- Nymrissa Wavecaller has no render in the overlay's bossart.js; with her as the leader's boss the hero shows no art.
- Resolved: boss renders are self-hosted alpha cut-outs (scripts/boss-cutouts.py, provenance embedded); CSP img-src is 'self'.
- Outfit 800 is loaded by splash.css because the overlay's tokens.css imports 300-700 only; move it into the overlay's tokens.css (and --live-red with it) when the overlay adopts v2.
