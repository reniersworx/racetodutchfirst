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

OWN-WORLD: The overlay's tokens unchanged (ink scale, jade, gold, Outfit + JetBrains Mono): ribbons with a coloured accent block, slanted pills and bars, flat dark panels; a jade/void glow behind a Blizzard boss render; jade for the race brand and live state, gold only for the leader and the winner, guild colours on rank blocks, bars and chips. No side stripes.

STORY: In one look the visitor sees the boss the race is stuck on, the question, every guild's kills and how far it has brought its current boss, and the latest kills; LIVE appears only while a guild is raiding. Below: progress over time, per boss, current boss pull charts, hall of fame.

FIRST VIEWPORT: Top bar with the brand ribbon left, LIVE pill (only when raiding), update time and NL|EN right. Then the uppercase title with "Cutting Edge?" in jade, the lead line and tier pills, over the leader's current boss render (two bodies for a council fight) on the right with nothing drawn on it. Under the title the board: per guild a ribbon (rank block in guild colour, name, raiding badge), kills x/9, and a raid-frame bar labelled with its current boss, best pull and pulls; the leader in gold. A jade "Laatste kills" ticker closes the hero.

FORM: User-pinned from a three-sketch moodboard: sketch A (the splash) with the ticker of sketch C, after the category standard (seed 837f26aa canon card) and "Het Klassement" (pick card) were built and rejected. Reference the user named: "my overlay".

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature move

The live hero: the boss the leader is fighting right now, swapping by itself as the race moves on.

## Unresolved

- Nymrissa Wavecaller has no render in the overlay's bossart.js; with her as the leader's boss the hero shows no art.
- Boss renders load from render.worldofwarcraft.com (CSP img-src allows it); no local copies.
