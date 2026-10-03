---
name: Race to Dutch First
description: The race between Dutch guilds to the last Mythic boss of the raid tier, followed live.
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
typography:
  display:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "clamp(34px, 5.6vw, 60px)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-.032em"
  lead:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "20px"
    fontWeight: 300
    lineHeight: 1.55
  title:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "18px"
    fontWeight: 600
  body:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  section-label:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: ".2em"
  label:
    fontFamily: "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: ".14em"
  numeric:
    fontFamily: "'JetBrains Mono', 'Cascadia Mono', Consolas, monospace"
    fontSize: "13px"
    fontWeight: 500
    fontFeature: "tnum"
rounded:
  none: "0px"
  tag: "5px"
  pill: "999px"
spacing:
  tile-gap: "16px"
  section-gap: "40px"
  page-x: "24px"
components:
  pill:
    backgroundColor: "{colors.ink-750}"
    textColor: "{colors.ink-200}"
    typography: "{typography.label}"
    padding: "6px 15px 6px 11px"
  pill-jade:
    backgroundColor: "{colors.jade-ghost}"
    textColor: "{colors.jade}"
  pill-gold:
    backgroundColor: "{colors.ink-750}"
    textColor: "{colors.gold}"
  tile:
    backgroundColor: "{colors.ink-800}"
    rounded: "{rounded.none}"
    padding: "16px 18px 18px"
  boss-card:
    backgroundColor: "{colors.ink-800}"
    padding: "22px 20px 26px"
  live-badge:
    backgroundColor: "{colors.jade-ghost}"
    textColor: "{colors.jade}"
    typography: "{typography.label}"
  live-card:
    backgroundColor: "{colors.ink-800}"
    padding: "12px 16px"
  lang-switch-active:
    backgroundColor: "{colors.jade-ghost}"
    textColor: "{colors.jade}"
---

# Design System: Race to Dutch First

## Overview

**Creative North Star: "The Stream Bar at the Pit Wall"**

The site is the bmiest stream bar unfolded into a page: the same ribbons, flat slanted pills and dark tiles that sit under the gameplay on stream, laid out with the discipline of a pit-wall timing screen. Positions, gaps and counts come first, in monospaced figures that line up; colour only appears where something changed or someone leads.

The ground is near-black and flat. There are no gradients and no shadows, because the visual language comes from a 2560-pixel stream canvas where every gradient costs bitrate. Depth comes from stepping up the ink scale, not from light. Each guild brings its own colour, and that colour is the only thing that tells guilds apart; the system colours (jade, gold) are reserved for state.

The tone is a timing screen read by fans: dense but calm, factual, Dutch by default. Decoration has to mean something in the race. It is not a SaaS dashboard (rounded white cards, pastels, generic admin chrome) and not a sports or betting site (loud banners, countdowns, shouting headlines).

**Key Characteristics:**
- Flat dark layers from the ink scale; no shadows, no gradients.
- Ribbon brand mark and slanted pills from the stream overlay.
- Numbers in JetBrains Mono with tabular figures, so columns line up like a timing board.
- Guild colour identifies a guild; jade means raiding or active; rose means on air; gold means winning.
- `tokens.css` is shared byte-for-byte with the overlay and the wishlist site.

## Colors

A near-black ink ramp with three state colours and a data palette of guild colours on top.

### Primary
- **Green Flag Jade** (`jade`): raiding and active state: the "Nu aan het raiden" badge, the selected language, links, focus rings. A muted Mistweaver green so it doesn't bleed on stream. `jade-ghost` is its translucent fill behind jade text; `jade-deep` is the darker step.

### Secondary
- **Podium Gold** (`gold`): winning and leading only. The leader's cap and tile border, a first kill (★), the Cutting Edge finish line and the winner banner.

### Tertiary
- **On-Air Rose** (`rose`): a camera is on: the "Nu live" strip for Twitch streams (label, dot, card edge for a channel without a guild). Errors use it too, as the border of the error capsule, always together with words that say what went wrong.

### Neutral
- **Pit Lane Black** (`ink-900`): page background.
- **Garage Ink** (`ink-800`): tiles, cards, ribbons; one step up from the page.
- **Raised Garage** (`ink-750`, `ink-700`): pills, tracks, borders and dividers between surfaces.
- **Pit Wall Grey** (`ink-600`, `ink-500`, `ink-400`): outlines, ticks and inactive marks.
- **Caption Grey** (`ink-300`, `ink-200`): captions, labels, axis text, secondary values.
- **Timing Paper** (`paper`): primary text. Deliberately not pure white, which clips on the stream encoder.
- **Faded Paper** (`paper-dim`): lead paragraphs and secondary text on dark panels.

### Data palette
Guild colours come from `guilds.toml` (currently `#5aa9ff`, `#ff8a3d`, `#e5484d`, `#b48cff`, `#f472b6`) and reach the page as `--guild` on the guild's element. They are data, not tokens.

### Named Rules
**The Gold Means Winning Rule.** Gold marks a leader, a first kill, the CE finish or a winner, nothing else. Warnings and stale data use another colour, so gold always reads as good news.

**The Two Kinds of Live Rule.** Jade means a guild is raiding right now; rose means someone is on air on Twitch. Never swap them.

**The Guild Owns Its Colour Rule.** A guild's colour appears on its own lane, tile edge, dot and chart line. System colours never stand in for a guild, and guild colours never signal state.

## Typography

**Display Font:** Outfit (with Segoe UI, system-ui)
**Body Font:** Outfit
**Label/Mono Font:** JetBrains Mono (with Cascadia Mono, Consolas)

**Character:** A geometric sans for names and headings, with a monospace for every number, so text reads like broadcast graphics and figures read like a timing board.

### Hierarchy
- **Display** (600, clamp(34px, 5.6vw, 60px), 1.04, -0.032em): the page question, "Wie haalt als eerste Cutting Edge?". Once per page.
- **Lead** (300, 20px, 1.55): the intro paragraph under the display line, max 64ch.
- **Title** (600, 15–18px): guild names and boss names in tiles and cards.
- **Body** (400, 14px, 1.5): section captions and notes, max 72ch.
- **Section label** (700, 13px, 0.2em, uppercase): section headings such as KLASSEMENT and VOORTGANG.
- **Label** (700, 10–11px, 0.12–0.18em, uppercase): pills, badges, tile labels, caps.
- **Numeric** (JetBrains Mono, tabular): scores, ranks, percentages, pull counts, dates and axis ticks.

### Named Rules
**The Timing Board Rule.** Every number that can be compared with another number is set in the mono face with tabular figures.

## Layout

One centred column, max 1320px, with 24px side padding and 40px between sections. Each section opens with an uppercase section label and a short caption, then its content. Tiles sit in an auto-fill grid (min 270px, 16px gap); from 1180px the standings show every guild in one row. Charts are SVGs drawn at the measured width. Below 720px and 600px, tables give way to per-boss cards; at 400px spacing tightens further. Reduced motion stops the live pulse.

## Elevation & Depth

Flat by design: no box-shadows anywhere. Depth comes from tonal steps (page `ink-900`, panels `ink-800`, controls `ink-750`) and 1px borders in `ink-700`/`ink-600`. Emphasis uses an edge instead of a shadow: a 3px guild-coloured left border on tiles, an inset 3px bar on table cells, a gold outline on the leader.

### Named Rules
**The No Glow Rule.** Nothing casts a shadow or glows. If something needs to stand out, give it an edge or a state colour.

## Shapes

Slanted and cut rather than rounded, as a guideline. Ribbons and pills have a slanted right edge (a 6–11px cut); boss cards have a cut bottom-right corner (22px). Tiles and panels have square corners. Round shapes are kept for small things: status dots, the live dot, and the 5px tag that hangs on a tile's top edge. Rounded corners may be used where they read better, but the slant is the default.

## Components

### Ribbon (signature)
The brand mark and the race-lane label: a solid accent block (jade, or the guild colour) followed by a dark slanted bar with the name and value. A small cap on its top edge carries KOPLOPER or WINNAAR in gold.

### Pills
- **Style:** flat `ink-750` with a slanted right edge, uppercase label type.
- **Variants:** neutral (`ink-200` text), jade (live/active, `jade-ghost` fill), gold (CE boss, winning).

### Tiles (Klassement)
- **Corner Style:** square.
- **Background:** `ink-800` with a 1px `ink-700` border and a 3px left edge in the guild colour.
- **Leader:** gold border and gold rank number.
- **Internal Padding:** 16px 18px 18px, 12px between rows.

### Boss card (Huidige boss)
A 1px `ink-700` frame with a cut bottom-right corner, `ink-800` inside, a guild-coloured cap on the top edge and a source tag (Raider.IO / Logs) on the right. Big mono figures for best pull, damage done and pulls, then the pull chart.

### Live badge
Jade label with a pulsing dot while a guild raided in the last hour; it fades to a grey "Raidde om 21:02" afterwards.

### Nu live strip
Shown under the header only while a listed channel is live, and hidden once the check is over 75 minutes old. A rose uppercase label with a rose dot, then a grid of cards (min 280px): `ink-800` with a 1px `ink-700` border and a 3px left edge in the streamer's guild colour (rose without a guild). Name, guild, a one-line title with ellipsis, and "live since" plus viewers in mono. The whole card links to the Twitch channel.

### Hall of fame
Per killed boss a card with each guild's kill team in kill order (the first is the race's first kill), members in an auto-fill grid with their spec in caption grey, and a raider ranking table on `ink-850` that scrolls sideways on phones.

### Language switch
Two slanted buttons (NL | EN); the active one is jade on `jade-ghost`.

## Do's and Don'ts

### Do:
- **Do** take every colour, font and radius from `tokens.css`, and keep that file identical to the overlay's.
- **Do** set every comparable number in JetBrains Mono with tabular figures.
- **Do** use the guild colour only for that guild's own marks.
- **Do** use jade for raiding or active state, rose for on air, and gold only for leading, first kills, Cutting Edge and the winner.
- **Do** build emphasis with an edge (left border, inset bar, outline) instead of a shadow.

### Don't:
- **Don't** use gradients or shadows.
- **Don't** use pure white (`#fff`) for text; use `paper`.
- **Don't** use gold for warnings or stale data.
- **Don't** show an error by colour alone; say what went wrong.
- **Don't** drift toward a SaaS dashboard (rounded white cards, pastels) or a sports/betting site (loud banners, countdowns).
- **Don't** put `style=""` in HTML or set styles with `setAttribute('style')`; the CSP forbids inline styles, so use `el.style.setProperty()`.
