---
name: Race to Dutch First
description: The race between Dutch guilds to Cutting Edge as a raid poster, in the bmiest overlay's language (design language v2, first surface).
colors:
  ink-900: "#0a0b0d"
  ink-850: "#0e1014"
  ink-800: "#131519"
  ink-750: "#171a1f"
  ink-700: "#1e2228"
  ink-600: "#2a2f37"
  ink-500: "#3a414b"
  ink-400: "#5b6470"
  ink-300: "#818b98"
  ink-200: "#a8b1bc"
  paper: "#eef1f5"
  paper-dim: "#c9d0d8"
  jade: "#3fd9a4"
  jade-deep: "#1f8d68"
  jade-ghost: "rgba(63,217,164,.13)"
  gold: "#d8b263"
  rose: "#d98b8b"
  live-red: "#e5484d"
  void-glow: "rgba(150,90,255,.32)"
  hero-dusk: "#1b1030"
  hero-deep-teal: "#0d1a1c"
typography:
  display:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "clamp(44px, 6.6vw, 88px)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-.03em"
  headline:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "clamp(24px, 2.6vw, 32px)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-.01em"
  headline-sub:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "clamp(20px, 2vw, 24px)"
    fontWeight: 800
    lineHeight: 1.05
  winner:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "clamp(30px, 5vw, 52px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-.02em"
  lead:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.15
  fold:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 700
  ribbon:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "18px"
    fontWeight: 600
  body:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  bug:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 800
    letterSpacing: ".1em"
  label:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: ".12em"
  label-micro:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: ".18em"
  numeric-board:
    fontFamily: "'JetBrains Mono', 'Cascadia Mono', Consolas, monospace"
    fontSize: "32px"
    fontWeight: 700
    fontFeature: "tnum"
  numeric:
    fontFamily: "'JetBrains Mono', 'Cascadia Mono', Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  none: "0px"
  pill: "999px"
spacing:
  board-row: "8px"
  board-col: "20px"
  card-gap: "16px"
  sheet-cell: "6px"
  section: "40px"
  gutter: "24px"
  gutter-phone: "16px"
  stage-top: "64px"
components:
  bug-live:
    backgroundColor: "{colors.live-red}"
    textColor: "{colors.paper}"
    typography: "{typography.bug}"
    rounded: "{rounded.none}"
    padding: "0 18px"
    height: "40px"
  bug-title:
    backgroundColor: "{colors.ink-900}"
    textColor: "{colors.paper}"
    typography: "{typography.bug}"
    rounded: "{rounded.none}"
    padding: "0 22px"
    height: "40px"
  bug-day:
    backgroundColor: "{colors.jade}"
    textColor: "{colors.ink-900}"
    typography: "{typography.bug}"
    rounded: "{rounded.none}"
    padding: "0 18px"
    height: "40px"
  lang-block:
    backgroundColor: "{colors.ink-900}"
    textColor: "{colors.ink-300}"
    rounded: "{rounded.none}"
    padding: "0 14px"
    height: "40px"
  lang-block-active:
    backgroundColor: "{colors.jade}"
    textColor: "{colors.ink-900}"
  pill:
    backgroundColor: "{colors.ink-750}"
    textColor: "{colors.ink-200}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "6px 15px 6px 11px"
  pill-jade:
    backgroundColor: "{colors.ink-750}"
    textColor: "{colors.jade}"
  ribbon:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.paper}"
    typography: "{typography.ribbon}"
    rounded: "{rounded.none}"
    height: "46px"
  ribbon-outline:
    backgroundColor: "{colors.ink-600}"
  ribbon-outline-lead:
    backgroundColor: "{colors.gold}"
  ticker:
    backgroundColor: "{colors.ink-900}"
    textColor: "{colors.paper-dim}"
    height: "52px"
  ticker-label:
    backgroundColor: "{colors.jade}"
    textColor: "{colors.ink-900}"
    padding: "0 20px"
  boss-head:
    backgroundColor: "{colors.ink-750}"
    textColor: "{colors.ink-400}"
    size: "40px"
  sheet-guild:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    height: "58px"
  sheet-guild-lead:
    textColor: "{colors.gold}"
  sheet-cell:
    backgroundColor: "{colors.ink-850}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "8px 9px"
    height: "58px"
  sheet-cell-current:
    backgroundColor: "{colors.ink-800}"
  sheet-cell-empty:
    backgroundColor: "transparent"
  sheet-meter:
    backgroundColor: "{colors.ink-700}"
    rounded: "{rounded.none}"
    height: "5px"
  fold:
    backgroundColor: "{colors.ink-900}"
    textColor: "{colors.paper}"
    typography: "{typography.fold}"
    padding: "16px 2px"
  panel:
    backgroundColor: "{colors.ink-800}"
    rounded: "{rounded.none}"
    padding: "16px 18px 18px"
  winner:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "26px 30px"
---

# Design System: Race to Dutch First

<!-- Design language v2, recorded from the shipped build of site/ (finish review: ship, 2026-10-04).
     Replaces the v1 record from PR #8. Updated 2026-10-04 for the below-the-hero change (variant B
     "per guild" + variant A's edge-to-edge ticker; commits d1248a7, 9c2fab6, 6de594d): the per-boss
     table, phone boss cards and current-boss cards are gone from the race site; Per guild, the
     reworked Voortgang and the folded Hall of fame replace them.
     Scope tags: [family] = the shared v2 language this surface proves (overlay tokens + forms;
     candidates for Bmiest/bmiest-design); [race] = this product only. -->

## Overview

**Creative North Star: "The Raid Poster on the Overlay"**

The bmiest stream overlay's language, grown into a poster. The page opens on the boss the leading guild is fighting right now, cut out and standing in a jade-and-void glow with nothing drawn on it; the question ("Wie haalt als eerste Cutting Edge?") is the title, and the standings sit beside it as overlay ribbons with a raid-frame bar per guild. A broadcast bug crowns the page and a kills ticker closes the hero from edge to edge, both taken from the overlay's broadcast grammar. Below the hero the same parts (slanted rank blocks, slanted pills, square dark cells and panels) carry the data: Voortgang, then Per guild (a row per guild, a cell per boss, then its pulls), then the Hall of fame folded away.

Everything is flat near-black ink: no rounded cards, no drop shadows, no glass. Shape comes from slanted cuts on the right edge of every ribbon, pill, bar, rank block and boss head. Colour is scarce and semantic: jade is the race and its live state, gold is the leader, the first kill and the winner, and each guild brings its own colour to its rank block, bar, line, meter and chip. The poster is loud only at the top; the sections below are a dense, honest data surface whose explanation sits in the marks themselves, with one-line captions.

Confirmed rejections (from the direction history): the generic dark data dashboard ("too generic, AI-looking") and the sports-broadcast theme laid on top ("still a dashboard, not WoW"). More gamer-like is welcome; a dashboard is not.

**Key Characteristics:**
- [family] Flat ink scale, Outfit + JetBrains Mono, jade + gold, from the overlay's tokens.css unchanged.
- [family] Right-edge slant on ribbons, pills, bars, rank blocks and tiles; square corners everywhere else.
- [family] Colour as meaning: jade = brand/live, gold = leader/first/winner, guild colour = the guild.
- [race] The leader's current boss as the hero art, nothing drawn on it, swapping as the race moves.
- [race] Broadcast bug + edge-to-edge kills ticker framing the hero; board of ribbons as the standings.
- [race] Per guild as the one detailed data view: a row per guild, not a table per boss.
- [race] Brand-neutral: the overlay's language without any bmiest mark.

## Colors

A near-black ink ramp with one cool green voice, one warm gold voice and the guilds' own colours; red appears only as the broadcast on-air marks.

### Primary
- **Mistweaver Jade** (jade): [family] the race brand and live state. The title's "Cutting Edge?", the race-day block in the bug, the active language block, the ticker label and its 2px top edge, section-head caps, the CE marker (pill and `CE` tag), the kill check, links, the disclosure chevron and focus rings (2px outline, 3px offset). On the Voortgang chart, raid nights are jade at 4.5% as shaded day columns. Its ghost (jade-ghost) only for link underlines and text selection.
- **Deep Jade** (jade-deep): [race] the dashed CE line across the top of the Voortgang chart: the finish, quieter than live jade.

### Secondary
- **Podium Gold** (gold): [family rule, proved here] the leader, the race's first kill and the winner, and nothing else. The leader's ribbon outline and kill count (on the board and in Per guild), the star on a first kill (Per guild cells and Voortgang), gold first-kill labels and counts in the hall of fame, the winner banner's 2px border, trophy and label.

### Tertiary
- **Broadcast Red** (live-red): [race; candidate family] on air only: the LIVE block in the bug while a guild is really raiding, and the "Nu live" strip. Lives on `:root` in splash.css because tokens.css is a byte copy of the overlay's; move it to tokens.css when the overlay adopts it.
- **Faded Rose** (rose): [family] warnings that are not errors: the error capsule's 1px border and the late-data update line (top bar and footer).

### Neutral
- **Raid Night Black** (ink-900): page ground, bug name block, ticker band, inactive language block, the pinned guild column's ground, ink text on jade.
- **Table Ink** (ink-850): Per guild cells, the Voortgang chart well, the hall-of-fame raiders table well.
- **Panel Ink** (ink-800): ribbon body, Per guild guild block and current-boss cell, hall-of-fame panels, winner banner, live cards.
- **Raised Ink** (ink-750): pills, boss-head tiles, the dashed border of an empty Per guild cell.
- **Rule Ink** (ink-700): 1px borders, cell borders, table rules, chart grid, hairlines (the Hall of fame fold, the footer rule), and the track under every meter.
- **Outline Ink** (ink-600): the ribbon's 1px slanted outline, the baseline under the pull strip, the 1px divider between raids in Per guild.
- **Muted Ink** (ink-500 / ink-400): plain pull bars, boss-head initials.
- **Caption Grey** (ink-300): captions, secondary meta, axis labels, inactive language, the fold hint, the source link, "/9".
- **Soft Grey** (ink-200): pill text, table heads, update time.
- **Paper** (paper): primary text; never pure white.
- **Faded Paper** (paper-dim): lead, labels on the board, ticker body, pull-strip captions, the count at a Voortgang line end.

### Hero atmosphere [race]
- **Void Glow** (void-glow), **Hero Dusk** (hero-dusk), **Hero Deep Teal** (hero-deep-teal): only the hero ground. A violet radial at the top right, a jade radial (jade at 22%) behind the boss, over a 160deg dusk-to-teal-to-ink linear, faded into ink-900 by a 260px bottom gradient. Web-only; the overlay's bitrate rule forbids gradients on stream.

### Named Rules
**The Gold Is Earned Rule.** Gold marks the leader, the race's first kill and the winner. A tag, a hover, a late-data note or a "progress" state is never gold.

**The Jade Is the Race Rule.** Jade is the race brand, live state and the CE marker. Guild colours (from guilds.toml) stay clear of jade and gold.

**The Red Means On Air Rule.** Broadcast red means on air: the LIVE block (only while some guild's live state is really `live`) and the "Nu live" strip of streams that are live now. Raiding itself is jade.

**The Guild Owns Its Best Rule.** A guild's best effort is drawn in its own colour: the best-pull meter, the best bar in its pull strip, "beste x%" in its caption, the frame of its current boss, its Voortgang line and hollow kill nodes.

## Typography

**Display Font:** Outfit (with Segoe UI, system-ui)
**Label/Mono Font:** JetBrains Mono (with Cascadia Mono, Consolas), tabular figures

**Character:** One geometric sans carries everything from the 88px poster caps to 10px labels; the mono is reserved for numbers that are compared (kills, rank, pulls, dates, percentages).

### Hierarchy
- **Display** (display): [race] the hero question, once per page. Uppercase, balanced, max 12ch; the second half in jade.
- **Headline** (headline): [family] section heads (Voortgang, Per guild), uppercase, behind a 14px slanted jade cap.
- **Headline sub** (headline-sub): [family] a subsection head one step down (Raiders), 11px cap.
- **Winner** (winner): [race] the winning guild's name in the winner banner.
- **Lead** (lead): the hero lead line, max 40ch, paper-dim; 17px on phones.
- **Title** (title): hall-of-fame boss names.
- **Fold** (fold): [race] the title of a folded section (Hall of fame), paper, jade on hover, followed by a 14px ink-300 hint. Deliberately not a section head.
- **Ribbon** (ribbon): guild names on the board ribbons; 16px on lane ribbons, 14px under 400px. Per guild names are 16px/600 (14px on phones), clamped to two lines.
- **Body** (body): section captions (one line, max 72ch, ink-300), tables at 13px, ticker items at 15px.
- **Bug** (bug): the broadcast bug and its blocks, uppercase; LIVE at 13px/.14em; 12px on phones.
- **Label** (label): pills, language blocks, the Per guild pulls column head (11px/.14em, ink-300); uppercase.
- **Label micro** (label-micro): raid-group rows, role labels, first-kill labels, raiding badges; uppercase.
- **Numeric board** (numeric-board): kill counts on the board with a 16px ink-300 "/9"; 24px on phones.
- **Numeric** (numeric): table cells, chart axes (11px), Per guild cell values (dates and best %, 12px; 11px on phones), the count at a Voortgang line end (12px/500).

### Named Rules
**The Poster Voice Rule.** Display and section heads are Outfit 800 uppercase with tight tracking; nothing else on the page is that heavy except the bug, the board and the Per guild rank and count.

**The Compared Number Rule.** A number a visitor compares across guilds is JetBrains Mono with tabular figures.

**The One-Line Caption Rule.** A section caption is one line that names the marks ("Trede = Mythic-kill · ster = eerste Nederlandse kill · lichte kolom = raidavond"); the explanation lives in the marks themselves, not in a paragraph.

## Layout

[race] One container, 1320px max, 24px gutters (16px under 720px, the hero bar from 900px; 12px under 400px). The hero is a stage: title, lead and tier pills on the left; the board below them in an 820px column; the boss art owns everything right of that column (from 24 + 820 + 40px to the edge) at the stage's full height, its feet faded by a mask. A lone render wider than 2:1 instead takes the open field right of the title (from 50% + 40px, 62% of the stage height). Below 1180px the art becomes a band above the title (360px tall, 300px under 900px). A council fight shows two bodies side by side (6% gap, 47% each). Art is never shown past 2x its natural height.

The board is a grid per guild: ribbon (320px), kills (96px), raid-frame bar (rest), 20px column gap and 8px between rows; on phones the ribbon and kills share a row and the bar spans below. Over each bar a label line carries the current boss, best pull and pulls, and the raiding badge beside it; the line wraps (the badge drops under it) and never cuts a number off. The ticker closes the hero at 52px, edge to edge across the viewport, its label flush at the left edge.

[race] Below the hero, sections stack with 40px between (32px on phones): Voortgang, Per guild, then the Hall of fame fold, then the footer. Voortgang is a full-width chart (380px tall, 280px under 560px) with a 210px right margin for the guild names at the line ends; under 600px the names give way to the count only and a legend below. Per guild is one fixed-layout table: a 240px pinned guild column, nine boss columns sharing the rest, a 230px pulls column, 6px between cells, at least 1040px wide; under 600px it scrolls sideways (min 1120px) with the guild column (150px) and the corner pinned, and the pulls column at 190px. A 1px rule separates the main raid's bosses from the next raid's. Card grids (hall of fame, Nu live) are auto-fill with 280-340px minimums and 16px gaps. Everything works at 360px.

## Elevation & Depth

Flat. No drop shadows anywhere. Depth comes from the ink ramp (ink-900 ground, ink-850 wells and cells, ink-800 panels and the current-boss cell, ink-750 raised chips), from 1px ink-700 borders and hairlines, and on the hero from the boss render standing in a soft radial glow. `box-shadow` is used only as a drawn line: a 1px inset outline marking a guild's current-boss cell (in the guild colour), a 1px ink-600 divider left of the first boss of a later raid in Per guild, and a 2px paper ring around the LIVE dot; none is elevation.

### Named Rules
**The Flat Ink Rule.** Surfaces separate by tone and 1px rules, never by shadow or blur.

## Shapes

[family] Corners are square. The signature is the right-edge slant: `clip-path: polygon(0 0, 100% 0, calc(100% - N) 100%, 0 100%)`, with N at 11px on ribbons, 10px on the ribbon's accent block and the Per guild guild block, 6px on pills, raid-frame bars and boss-head tiles, 5px on the section-head cap, 4px on the Raiders cap, 3px on guild chips. Ribbons draw their 1px outline as a slanted outer clip one pixel larger than the inner one. The only round things are dots (live dots, legend dots, the hollow kill nodes on Voortgang). Empty Per guild cells are dashed; every other border is solid. The disclosure mark is a drawn 7px chevron (two 2px jade strokes, rotated -45deg closed, 45deg open). [race] The broadcast bug, the language switch and the edge-to-edge ticker are the deliberate exception to the slant: flush, square, gapless blocks.

### Named Rules
**The One Slant Rule.** Slants go down and to the right, on the trailing edge only. A slanted element never also gets rounded corners.

## Components

### Broadcast bug [race]
Flush square blocks at 40px (34px under 900px), no gaps: LIVE (live-red, pulsing dot, hidden unless a guild is raiding), the name on ink-900, "Dag N" in jade (tier start = day 1, stops on the winning day). The update time sits beside it in ink-200 (rose when late).

### Language switch [race]
NL | EN as two flush blocks at the bug's height, label type at 13px/800; the active one solid jade with ink text, the other ink-900 with ink-300 text (paper on hover). Dutch is the default.

### Pills [family]
Slanted chips, ink-750, label type, uppercase. Jade text for the CE pill. A pill can be a button (the hall of fame's "show all raiders": jade text, ink-700 on hover).

### Ribbon [family]
The overlay's ribbon: a 1px slanted outline (ink-600; gold for the leader) around an ink-800 body, a square accent block on the left in the guild colour carrying the rank in mono 20px/800 ink-900, and the name in ribbon type (links go jade on hover).

### Raid-frame bar [race]
10px slanted bar, track white at 8%, fill in the guild colour at the share of the boss already down. Above it a label line (14px paper-dim, wraps) with the current boss, best pull and pulls, and the raiding badge (label-micro, jade dot when live, ink-300 "raided at 21:57" otherwise) on the same line.

### Kills ticker [race]
A 52px ink-900 band spanning the viewport, with only a 2px jade top edge (no side or bottom borders), a solid jade label block ("Laatste kills") flush at the left edge, items "Guild · boss · date · eerste kill" in paper-dim with the guild bold in paper. The list is rendered twice and slides one width in 48s; it pauses on hover and focus, and under reduced motion it becomes a static scrollable row. A 64px fade hides the right edge.

### Section head [family]
Headline type behind a slanted jade cap (14px wide, 0.9em tall), 8px above a one-line caption. Subsections use headline-sub with an 11px cap.

### Voortgang chart [race]
A step line per guild in its colour (3px for the leader, drawn last, 2.25px for the rest) in an ink-850 well with a 1px ink-700 border. Raid nights (days with a pull or kill in race.json) are shaded jade columns; the grid is ink-700, its top line the CE finish dashed in jade-deep (4 5); axes in mono 11px ink-300 with "x/9" and "CE". The race's first kills are gold stars (ink-850 stroke), other kills hollow nodes (ink-850 fill, 2px guild-colour ring). On wide screens each line ends in the guild name (14px/700, guild colour) and its x/9 (mono 12px/500, paper-dim); on phones a legend replaces them. "Toon als tabel" discloses the same data as a table.

### Per guild sheet [race]
One table row per guild:
- **Guild block** (pinned): an ink-800 block with a 10px trailing slant, a full-height rank block in the guild colour (18px/800, ink-900 text), the name (paper, jade on hover, raiding badge under it) and the kills as 22px/800 "x" over a 13px ink-300 "/9", gold for the leader. On phones the count goes under the name.
- **Boss head row**: a boss-head tile and the boss name (11px ink-300, ellipsis), with the `CE` tag on the CE boss.
- **Cell per boss** (ink-850, 1px ink-700 border, 58px tall): a kill shows a drawn jade check and the mono date, with the pull count under it; the race's first kill turns the mark and the date gold with a star. A boss in progress shows the best % in mono over a 5px meter (ink-700 track, guild-colour fill) and the pulls. The guild's current boss is framed 1px in the guild colour on ink-800 ("volgende" when not pulled yet). An untried boss is an empty cell with a dashed ink-750 border on the ground.
- **Pull strip**: bars per pull on the current boss (up to the last 60, 32px tall, 1px apart, over a 1px ink-600 baseline), ink-500 with the best bar in the guild colour; under it a caption "boss · n pulls · beste x%" in paper-dim with "beste x%" in the guild colour and the source link (ink-300, jade on hover) kept on one line with its separator.

### Boss head [race]
A slanted ink-750 tile (40px in Per guild, 52px in hall-of-fame panels) showing the top of the boss's cut-out (`object-position: 50% 0`), or the boss's initial in ink-400 800 when there is no art, so every head lines up.

### Kill marks [family]
Drawn marks, one stroke family: a check (jade) for a kill, a star (gold) for the race's first kill, a trophy (gold) for the winner. In CSS cells they are SVG masks over a background in the meaning colour; in charts they are SVG paths.

### Fold and disclosure [race]
The Hall of fame folds into a quiet row: a 1px ink-700 hairline above, the fold title and its ink-300 hint, the drawn jade chevron before it; the footer's top rule closes it. Open, it shows the hall-of-fame panels and the Raiders table. Every `<details>` uses the same drawn chevron instead of the browser triangle.

### Panels [family]
Square ink-800 panels with a 1px ink-700 border (hall-of-fame bosses, live cards; live cards lift to ink-750 with an ink-600 border on hover). The winner banner is the same panel with a 2px gold border, a drawn SVG trophy and the winner's name. Errors use the panel with a 1px rose border.

### Current-boss card (rcard) [family, not shipped here]
The overlay's angled card (1px outline, ink-800 body, 22px notch at the bottom right, caps on the top edge) stays a component of the family, but the race site no longer ships it: the hero board and the Per guild pull strip carry each guild's current boss. Take its spec from the overlay, not from this page.

## Do's and Don'ts

### Do:
- **Do** take colours, fonts and radii from tokens.css variables only; the one exception is `--live-red` on `:root` in splash.css until the overlay adopts it. tokens.css stays a byte copy of the overlay's.
- **Do** keep gold for the leader, the race's first kill and the winner; jade for the race brand, live state and the CE marker.
- **Do** show the leader's current boss (the CE boss once someone won) as a self-hosted alpha cut-out trimmed to the body, with nothing drawn on it, never past 2x its natural size.
- **Do** mark a guild with a 1-2px outline, a rank block or a slanted chip in its colour, and draw its best effort in that colour.
- **Do** draw marks as SVG (check, star, trophy, chevron) in the meaning colour.
- **Do** slant the trailing edge of ribbons, pills, bars, rank blocks and boss heads; keep the bug, the language switch and the ticker flush and square.
- **Do** let a label wrap rather than cut a number off.
- **Do** keep a section caption to one line and put the explanation in the marks.
- **Do** ship every string in Dutch and English (Dutch default); game names are never translated.
- **Do** keep the CSP: script-src 'self', no inline styles; set custom properties with `style.setProperty()` only.
- **Do** apply the stream-bitrate rules from tokens.css (no gradients, no full-width animation, no pure white) to the overlay; the race page may use the hero glow and the ticker because it is not encoded.

### Don't:
- **Don't** put a coloured side stripe on cards, cells or rows.
- **Don't** use text glyphs (★, ✓, ▸, emoji) as icons or disclosure marks.
- **Don't** add drop shadows, rounded cards or blur.
- **Don't** use gold for tags, progress states, hover or lateness.
- **Don't** show LIVE or a live dot unless the data says a guild is raiding now.
- **Don't** dress a folded or secondary section as a section head.
- **Don't** add bmiest branding to the race site.
- **Don't** build it as a generic dark dashboard.
