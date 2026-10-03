# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS and JavaScript with no build step and no framework, like the three products it serves. Published with GitHub Pages at `design.bmiest.be`; repository `Bmiest/bmiest-design`. Each product keeps a copy of the shared files; a CI check in each product repo flags drift from this repo.

## Users

This repository holds the shared design language (v2) for three products with different audiences:

- **Stream overlay** (`Bmiest/bmiest_wow_streaming_theme`, `streamoverlay.bmiest.be`): Twitch viewers following bmiest's World of Warcraft raids. They watch on a PC, often on a second monitor next to their own game, or on a phone, so the overlay is usually seen small and at a glance. The operator (bmiest) sets it up in OBS.
- **Race to Dutch First** (`reniersworx/racetodutchfirst`, `racetodutchfirst.bmiest.be`): Dutch WoW raiders and their guilds checking how the race to Cutting Edge stands, often on a phone around raid nights. Built for the wider Dutch WoW community too, where possible.
- **Wishlist updater dashboard** (`Bmiest/bmiest_wowaudit_wishlist_updater`, `wishlistupdater.bmiest.be`): the operator (Shiftheal, Holy Priest, Ragnaros EU), deciding which gear to wish for and where to spend crests.

## Product Purpose

Give the three products one design language, version 2, that improves on the current one. Success means:

- the products are recognisably one family (with the race site as the deliberate exception, see Brand Commitments);
- new parts, built by the operator or by agents (Claude, the Paperclip team), fit the system without guessing or a redesign;
- the family has more character of its own than a generic dark dashboard.

## Positioning

Built by a raiding streamer, from live raid data (Raider.IO, Warcraft Logs, QE Live, StreamElements, DecAPI). Race to Dutch First is a tracker focused only on Dutch guilds racing to Cutting Edge.

## Operating Context

- The overlay runs as OBS browser sources on a 2560×1440 canvas from a 3440×1440 ultrawide, broadcast to Twitch; it is not interactive on stream.
- Raid nights are Wednesday and Sunday, 20:00–23:00 (Europe/Brussels); the race site refreshes every 30 minutes then, every 2 hours otherwise.
- All three are hosted on GitHub Pages; merges to main deploy.
- Agents build features from written instructions (`CLAUDE.md`, `DESIGN.md`) in each repository.

## Capabilities and Constraints

Binding:

- **Stream bitrate** (overlay): no gradients and no animation across the full width, no pure white (`#fff` clips on the encoder), canvas 2560×1440.
- **Dutch and English everywhere.** The race site defaults to Dutch; the overlay is chosen per OBS source with `?lang=`; the wishlist follows the browser language. Game names (guilds, raids, bosses, items, characters) are never translated.

In place today but not declared binding for v2: a strict Content Security Policy on the race site (no inline scripts or styles, only Google Fonts as an external source) and DOM building without `innerHTML` for names from external APIs.

Today `tokens.css` is copied byte-for-byte between the three repositories; this repository becomes its source.

## Brand Commitments

- **bmiest** is the streamer brand (Twitch channel `bmiest`). The overlay and the wishlist dashboard carry it.
- **Race to Dutch First stays neutral**: no bmiest branding, so other guilds can share it without it feeling like one streamer's site. It may use the same underlying design language.
- Guild colours in the race come from its configuration and belong to the guilds.
- Character renders of the operator's characters (Shiftheal, Bhikhu) are used on the overlay.
- **Direction history (2026-10-03):** built and rejected for the race site: the category standard (dark data product at Linear/Vercel finish: "too generic, AI-looking") and "Het Klassement" (Tour de France graphics: "still a dashboard, too dark, not WoW, a theme on top"). Chosen from a moodboard: **the overlay's own language grown into a poster**, the leader's current boss as the hero, standings as overlay ribbons, a kills ticker. The user named their own overlay as the reference. More gamer-like is welcome; a generic dashboard is not.

## Evidence on Hand

- Live data from Raider.IO, Warcraft Logs, QE Live, StreamElements and DecAPI; recorded fixtures in each product's tests.
- The three live sites and the overlay's demo modes (`?demo=1`) as the incumbent implementation.
- No testimonials, viewer numbers beyond the live counters, or press. Don't invent them.

## Product Principles

1. **Live data first, honest about it.** Show where a number comes from and how fresh it is; never present stale data as live.
2. **Readable at a glance.** A viewer on a second monitor or a phone gets the point in a second.
3. **One family, one exception.** Overlay and wishlist are bmiest; the race site shares the language but not the brand.
4. **Buildable without guessing.** Every part can be built from the system's written rules and components.
5. **Bilingual by default.** Every string exists in Dutch and English.
