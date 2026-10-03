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
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.14
    letterSpacing: "-.012em"
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
  cap-tag: "5px"
  pill: "999px"
spacing:
  board-row: "8px"
  board-col: "20px"
  card-gap: "16px"
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
  rcard:
    backgroundColor: "{colors.ink-800}"
    rounded: "{rounded.none}"
    padding: "22px 20px 26px"
  rcard-cap:
    backgroundColor: "{colors.ink-900}"
    rounded: "{rounded.cap-tag}"
    padding: "0 12px"
    height: "22px"
  boss-head:
    backgroundColor: "{colors.ink-750}"
    textColor: "{colors.ink-400}"
    size: "40px"
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
     Replaces the v1 record from PR #8. Scope tags: [family] = the shared v2 language this surface
     proves (overlay tokens + forms; candidates for Bmiest/bmiest-design); [race] = this product only. -->

## Overview

**Creative North Star: "The Raid Poster on the Overlay"**

The bmiest stream overlay's language, grown into a poster. The page opens on the boss the leading guild is fighting right now, cut out and standing in a jade-and-void glow with nothing drawn on it; the question ("Wie haalt als eerste Cutting Edge?") is the title, and the standings sit beside it as overlay ribbons with a raid-frame bar per guild. A broadcast bug crowns the page and a kills ticker closes the hero, both taken from the overlay's broadcast grammar. Below the hero the same parts (slanted pills, angled cards, square dark panels) carry the data sections.

Everything is flat near-black ink: no rounded cards, no drop shadows, no glass. Shape comes from slanted cuts on the right edge of every ribbon, pill, bar and boss head, and from one notched corner on the cards. Colour is scarce and semantic: jade is the race and its live state, gold is the leader, the first kill and the winner, and each guild brings its own colour to its rank block, bar and chip. The poster is loud only at the top; the sections below are a dense, honest data surface.

Confirmed rejections (from the direction history): the generic dark data dashboard ("too generic, AI-looking") and the sports-broadcast theme laid on top ("still a dashboard, not WoW"). More gamer-like is welcome; a dashboard is not.

**Key Characteristics:**
- [family] Flat ink scale, Outfit + JetBrains Mono, jade + gold, from the overlay's tokens.css unchanged.
- [family] Right-edge slant on ribbons, pills, bars and tiles; square corners everywhere else.
- [family] Colour as meaning: jade = brand/live, gold = leader/first/winner, guild colour = the guild.
- [race] The leader's current boss as the hero art, nothing drawn on it, swapping as the race moves.
- [race] Broadcast bug + kills ticker framing the hero; board of ribbons as the standings.
- [race] Brand-neutral: the overlay's language without any bmiest mark.

## Colors

A near-black ink ramp with one cool green voice, one warm gold voice and the guilds' own colours; red appears only as the broadcast LIVE block.

### Primary
- **Mistweaver Jade** (jade): [family] the race brand and live state. The title's "Cutting Edge?", the race-day block in the bug, the active language block, the ticker label and its 2px top edge, section-head caps, the CE marker (pill and `CE` tag), the kill check, the kill bar in pull charts, links and focus rings (2px outline, 3px offset). Its ghost (jade-ghost) only for link underlines and text selection.

### Secondary
- **Podium Gold** (gold): [family rule, proved here] the leader, the race's first kill and the winner, and nothing else. The leader's ribbon outline and kill count, the star on a first kill, gold first-kill labels and counts in the hall of fame, the winner banner's 2px border, trophy and label.

### Tertiary
- **Broadcast Red** (live-red): [race; candidate family] the LIVE block in the bug, shown only while a guild is really raiding. Lives on `:root` in splash.css because tokens.css is a byte copy of the overlay's; move it to tokens.css when the overlay adopts it.
- **Faded Rose** (rose): [family] warnings that are not errors: the error capsule's 1px border and the late-data update line (top bar and footer).

### Neutral
- **Raid Night Black** (ink-900): page ground, bug name block, ticker band, inactive language block, ink text on jade.
- **Table Ink** (ink-850): scroll-table and hall-of-fame table wells, sticky table heads.
- **Panel Ink** (ink-800): ribbon body, card body, hall-of-fame panel, winner banner, raid-group rows.
- **Raised Ink** (ink-750): pills, boss-head tiles, card tags.
- **Rule Ink** (ink-700): 1px borders, table rules, chart grid, empty meter tracks.
- **Outline Ink** (ink-600): the ribbon's 1px slanted outline, the card caps' border.
- **Muted Ink** (ink-500 / ink-400): untried cells, plain pull bars, boss-head initials, raid-night dividers.
- **Caption Grey** (ink-300): captions, secondary meta, axis labels, inactive language.
- **Soft Grey** (ink-200): pill text, table heads, update time.
- **Paper** (paper): primary text; never pure white.
- **Faded Paper** (paper-dim): lead, labels on the board, ticker body, the best-pull bar.

### Hero atmosphere [race]
- **Void Glow** (void-glow), **Hero Dusk** (hero-dusk), **Hero Deep Teal** (hero-deep-teal): only the hero ground. A violet radial at the top right, a jade radial (jade at 22%) behind the boss, over a 160deg dusk-to-teal-to-ink linear, faded into ink-900 by a 260px bottom gradient. Web-only; the overlay's bitrate rule forbids gradients on stream.

### Named Rules
**The Gold Is Earned Rule.** Gold marks the leader, the race's first kill and the winner. A tag, a hover, a late-data note or a "progress" state is never gold.

**The Jade Is the Race Rule.** Jade is the race brand, live state and the CE marker. Guild colours (from guilds.toml) stay clear of jade and gold.

**The Red Means On Air Rule.** Broadcast red means on air: the LIVE block (only while some guild's live state is really `live`) and the "Nu live" strip of streams that are live now. Raiding itself is jade.

## Typography

**Display Font:** Outfit (with Segoe UI, system-ui)
**Label/Mono Font:** JetBrains Mono (with Cascadia Mono, Consolas), tabular figures

**Character:** One geometric sans carries everything from the 88px poster caps to 10px labels; the mono is reserved for numbers that are compared (kills, rank, pulls, dates, percentages).

### Hierarchy
- **Display** (display): [race] the hero question, once per page. Uppercase, balanced, max 12ch; the second half in jade.
- **Headline** (headline): [family] section heads, uppercase, behind a 14px slanted jade cap.
- **Headline sub** (headline-sub): [family] a subsection head one step down (Raiders), 11px cap.
- **Winner** (winner): [race] the winning guild's name in the winner banner.
- **Lead** (lead): the hero lead line, max 40ch, paper-dim; 17px on phones.
- **Title** (title): card titles (current-boss cards); hall-of-fame boss names at 19px.
- **Ribbon** (ribbon): guild names on the board ribbons; 16px on lane ribbons, 14px under 400px.
- **Body** (body): section captions (max 72ch, ink-300), tables at 13px, ticker items at 15px.
- **Bug** (bug): the broadcast bug and its blocks, uppercase; LIVE at 13px/.14em; 12px on phones.
- **Label** (label): pills, language blocks, card caps (11px/.16em); uppercase.
- **Label micro** (label-micro): raid-group rows, role labels, first-kill labels, raiding badges; uppercase.
- **Numeric board** (numeric-board): kill counts on the board with a 16px ink-300 "/9"; 24px on phones.
- **Numeric** (numeric): table cells, dates, chart axes (11px); card stats at 24px/500.

### Named Rules
**The Poster Voice Rule.** Display and section heads are Outfit 800 uppercase with tight tracking; nothing else on the page is that heavy except the bug and the board.

**The Compared Number Rule.** A number a visitor compares across guilds is JetBrains Mono with tabular figures.

## Layout

[race] One container, 1320px max, 24px gutters (16px under 900px, 12px under 400px). The hero is a stage: title, lead and tier pills on the left; the board below them in an 820px column; the boss art owns everything right of that column (from 24 + 820 + 40px to the edge) at the stage's full height, its feet faded by a mask. A lone render wider than 2:1 instead takes the open field right of the title (from 50% + 40px, 62% of the stage height). Below 1180px the art becomes a band above the title (360px tall, 300px under 900px). A council fight shows two bodies side by side (6% gap, 47% each). Art is never shown past 2x its natural height.

The board is a grid per guild: ribbon (320px), kills (96px), raid-frame bar (rest), 20px column gap and 8px between rows; on phones the ribbon and kills share a row and the bar spans below. The ticker closes the hero at 52px.

[family] Below the hero, sections stack with 40px between (32px on phones). Card grids are auto-fit with 300-340px minimums and 16px gaps; five current-boss cards on a wide screen lay out three over two, centred, never one orphan. Under 600px the wide per-boss table becomes one card per boss. Everything works at 360px.

## Elevation & Depth

Flat. No drop shadows anywhere. Depth comes from the ink ramp (ink-900 ground, ink-850 wells, ink-800 panels, ink-750 raised chips), from 1px ink-700 borders, and on the hero from the boss render standing in a soft radial glow. The only `box-shadow` uses are a 1px inset outline marking a guild's current-boss cell (in the guild colour) and a 2px paper ring around the LIVE dot; both are outlines, not elevation.

### Named Rules
**The Flat Ink Rule.** Surfaces separate by tone and 1px rules, never by shadow or blur.

## Shapes

[family] Corners are square. The signature is the right-edge slant: `clip-path: polygon(0 0, 100% 0, calc(100% - N) 100%, 0 100%)`, with N at 11px on ribbons, 10px on the ribbon's accent block, 6px on pills, raid-frame bars and boss-head tiles, 5px on the section-head cap, 4px on card tags and the Raiders cap, 3px on guild chips. Ribbons draw their 1px outline as a slanted outer clip one pixel larger than the inner one. Cards (rcard) cut the bottom-right corner at 22px. The only rounded things are the 5px caption caps on card tops and fully round dots (live dots, legend dots). [race] The broadcast bug and the language switch are the deliberate exception to the slant: flush, square, gapless blocks.

### Named Rules
**The One Slant Rule.** Slants go down and to the right, on the trailing edge only. A slanted element never also gets rounded corners.

## Components

### Broadcast bug [race]
Flush square blocks at 40px (34px under 900px), no gaps: LIVE (live-red, pulsing dot, hidden unless a guild is raiding), the name on ink-900, "Dag N" in jade (tier start = day 1, stops on the winning day). The update time sits beside it in ink-200 (rose when late).

### Language switch [race]
NL | EN as two flush blocks at the bug's height, label type at 13px/800; the active one solid jade with ink text, the other ink-900 with ink-300 text (paper on hover). Dutch is the default.

### Pills [family]
Slanted chips, ink-750, label type, uppercase. Jade text for the CE pill. On the hero art they sit on ink-900 at 72%.

### Ribbon [family]
The overlay's ribbon: a 1px slanted outline (ink-600; gold for the leader) around an ink-800 body, a square accent block on the left in the guild colour carrying the rank in mono 20px/800 ink-900, the name in ribbon type (links go jade on hover), and an optional raiding badge (label-micro, jade dot when live, ink-300 "raided at 21:57" otherwise).

### Raid-frame bar [race]
10px slanted bar, track white at 8%, fill in the guild colour at the share of the boss already down, labelled above with the current boss, best pull and pulls.

### Kills ticker [race]
A 52px ink-900 band with a 1px ink-700 border and 2px jade top edge, a solid jade label block ("Laatste kills"), items "Guild · boss · date · eerste kill" in paper-dim with the guild bold in paper. The list is rendered twice and slides one width in 48s; it pauses on hover and focus, and under reduced motion it becomes a static scrollable row. A 64px fade hides the right edge.

### Section head [family]
Headline type behind a slanted jade cap (14px wide, 0.9em tall), 8px above a caption. Subsections use headline-sub with an 11px cap.

### Current-boss card (rcard) [family]
The overlay's angled card: 1px ink-700 outline, ink-800 body, bottom-right 22px notch. Two caps hang on the top edge: the guild name (label, guild colour) on the left and the source link (Raider.IO / WCL, ink-300, jade on hover) on the right. Inside: title, a slanted status tag (ink-750, ink-200), mono stats with micro labels, and the pull chart (bars ink-500, best paper-dim, kill jade; dashed raid-night dividers).

### Boss head [race]
A slanted ink-750 tile (40px in tables, 44px on phone cards, 52px in hall-of-fame panels) showing the top of the boss's cut-out (`object-position: 50% 0`), or the boss's initial in ink-400 800 when there is no art, so every head lines up.

### Data cells and marks [family]
Per-boss cells: mono date and pulls; a drawn SVG check (jade) before a kill, a drawn SVG star (gold) for the race's first kill; a guild-coloured 8px meter for the best pull; ink-500 for untried; the guild's current boss outlined 1px in its colour on ink-800. Tables sit in an ink-850 well with 1px ink-700 rules and sticky heads.

### Panels [family]
Square ink-800 panels with a 1px ink-700 border (hall-of-fame bosses, live cards; live cards lift to ink-750 with an ink-600 border on hover). The winner banner is the same panel with a 2px gold border, a drawn SVG trophy and the winner's name. Errors use the panel with a 1px rose border.

## Do's and Don'ts

### Do:
- **Do** take colours, fonts and radii from tokens.css variables only; the one exception is `--live-red` on `:root` in splash.css until the overlay adopts it. tokens.css stays a byte copy of the overlay's.
- **Do** keep gold for the leader, the race's first kill and the winner; jade for the race brand, live state and the CE marker.
- **Do** show the leader's current boss (the CE boss once someone won) as a self-hosted alpha cut-out trimmed to the body, with nothing drawn on it, never past 2x its natural size.
- **Do** mark a guild with a 1-2px outline, a rank block or a slanted chip in its colour.
- **Do** draw marks as SVG (check, star, trophy) in the meaning colour.
- **Do** slant the trailing edge of ribbons, pills, bars and boss heads; keep the bug and the language switch flush and square.
- **Do** ship every string in Dutch and English (Dutch default); game names are never translated.
- **Do** keep the CSP: script-src 'self', no inline styles; set custom properties with `style.setProperty()` only.
- **Do** apply the stream-bitrate rules from tokens.css (no gradients, no full-width animation, no pure white) to the overlay; the race page may use the hero glow and the ticker because it is not encoded.

### Don't:
- **Don't** put a coloured side stripe on cards, cells or rows.
- **Don't** use text glyphs (★, ✓, emoji) as icons.
- **Don't** add drop shadows, rounded cards or blur.
- **Don't** use gold for tags, progress states, hover or lateness.
- **Don't** show LIVE or a live dot unless the data says a guild is raiding now.
- **Don't** add bmiest branding to the race site.
- **Don't** build it as a generic dark dashboard.
