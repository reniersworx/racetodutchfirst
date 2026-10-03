---
version: 1
slug: "site-index-html"
primary_target: "site/index.html"
related_targets: []
---

## Scope

Race to Dutch First, the whole page (`site/index.html` with `style.css`, `app.js`, `halloffame.*`, `live.js`). First surface of the shared design language v2 (`Bmiest/bmiest-design`). Mode: Operate. Brand-neutral: no bmiest branding.

## Audience and task

Dutch raiders and the wider Dutch WoW community, mostly on a phone or a second monitor around raid nights. Task: see who leads, by how much, who is raiding or live now; then dig into bosses, history and the hall of fame. Constraints: NL + EN for every string (Dutch default), live data honest about source and freshness.

## Direction contract

THESIS: The category standard, executed at Linear/Vercel craft with Raider.IO's data fluency: a dark, dense, precise data product a Raider.IO user reads without learning anything. It refuses the category's half-finish: uneven spacing, decorative ribbons and cut corners, charts that each speak their own visual language.

OWN-WORLD: Graphite ground in three tonal steps, sections divided by 1px hairline seams instead of boxed tiles, one sans and its mono sibling with tabular figures, a single neutral interaction accent, guild colours as the only saturated data series, small exact state colours (raiding, on air, winning), modest uniform radii. No ribbons, no slanted pills, no cut corners.

STORY: Within a second the visitor knows the leader, the gap and who is raiding now; then they scan the standings, open a boss or a guild, check the hall of fame, and leave trusting the numbers because source and update time sit next to them.

FIRST VIEWPORT: A slim top bar: product name, tier label (The Venomous Abyss · Mythic, CE boss), NL|EN switch, update time with a freshness dot. Under it, the standings table is the hero: rank, guild with colour chip, a 9-segment progress bar (killed bosses filled, current boss partially filled to its best %), best %, pulls, world rank, live state; sortable headers. At desktop width a right column holds Latest kills and Nu live. The race chart follows directly below on the same 9-boss scale.

FORM: The category standard (canon card), chosen over the assigned "Het Raster" and the pick "Het Klassement"; seed key 837f26aa. Quality bar: Linear, Vercel, Raider.IO.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature move

One 9-boss scale shared by every view: the progress bars, the race chart, the per-boss table and the boss cards all align to the same nine boss positions.

## Unresolved

- Exact type family (a workhorse UI sans with a mono sibling; decided at build).
- How much of today's section order survives.
