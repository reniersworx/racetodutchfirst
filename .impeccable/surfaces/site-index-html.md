---
version: 1
slug: "site-index-html"
primary_target: "site/index.html"
related_targets: []
---

## Scope

Race to Dutch First, the whole page (`site/index.html` with `style.css`, `halloffame.css`, `og.*`, `app.js`). First surface of design language v2. Mode: Operate. Brand-neutral: no bmiest branding.

## Audience and task

Dutch raiders and the wider Dutch WoW community, mostly on a phone or a second monitor around raid nights. Task: see who leads, by how much and who is raiding or live now; then dig into bosses, history and the hall of fame. Constraints: NL + EN for every string (Dutch default); live data honest about source and freshness. Not a sports or betting site.

## Direction contract

THESIS: The race read as a Grand Tour: a general classification with gaps, jerseys and a stage profile, run as a precise working data product. It refuses the generic dark dashboard (graphite, indigo accent, Geist) that the first v2 attempt became.

OWN-WORLD: Night-asphalt ground (deep blue-black, not graphite) with race-day white type; maillot-jaune yellow only for the leader and the winner; polka dots (red on white) only for race-first kills; Archivo across its widths, condensed bold uppercase for headings, ranks and gaps, normal width for reading; tabular figures; 2px timing-graphic rules and near-square corners. Guild colours are the riders.

STORY: In one look the visitor sees who wears yellow, every guild's gap to the leader and where each one stands on the climb; then they scan the classification, open bosses, history and the hall of fame, and trust it because source and update time sit beside the numbers.

FIRST VIEWPORT: The slim top bar (name, tier, update time, NL|EN). Then "Het parcours": the tier drawn as a stage profile across the content width, one col per boss, each climb as steep as the pulls its first kill cost, the CE boss as the summit finish; every guild a numbered rider on the road at its race position. Directly below, the general classification table: rank, jersey, guild, kills, gap to the leader in condensed figures, current boss, world rank, status. Side column: latest kills and Nu live.

FORM: Het Klassement (Tour de France graphics), the IMPECCABLE'S PICK card, rank 1 of the seven grounded candidates; chosen after the category standard was built and rejected; seed key 837f26aa.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature move

The stage profile: the race drawn as one mountain stage, guilds as riders on the same road.

## Unresolved

- Bosses no guild has killed yet have no pull count, so their climb is drawn at the average steepness, dashed.
