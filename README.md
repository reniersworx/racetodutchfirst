# Race to Dutch First

Welke Nederlandstalige World of Warcraft-guild haalt als eerste **Cutting Edge**, de laatste Mythic-boss van de huidige raid tier? Deze site volgt de race: een racebaan per guild, het klassement, de voortgang door de tijd, een overzicht per boss en hoe dicht iedereen bij zijn huidige boss zit.

Live op <https://racetodutchfirst.bmiest.be/>. De data komt van [Raider.IO](https://raider.io), aangevuld met [Warcraft Logs](https://www.warcraftlogs.com), en wordt op raidavonden elk half uur ververst, anders om de 2 uur.

## Een guild toevoegen

Zet een `[[guilds]]`-blok in [`guilds.toml`](guilds.toml) (naam, realm, kleur) en open een pull request. Na de merge staat de guild er bij de volgende verversing bij.

## Een streamer toevoegen

Zet een `[[streams.channels]]`-blok in [`guilds.toml`](guilds.toml) met de Twitch-naam en eventueel de guild. Wie live is in World of Warcraft, staat bovenaan de site onder "Nu live".

## Lokaal draaien

```bash
uv sync
uv run python -m racetodutchfirst          # haalt de data op → site/data/race.json
uv run python -m http.server 8000 --directory site
# open http://localhost:8000
```

Rechtstreeks `site/index.html` openen werkt niet: de browser laadt `data/race.json` niet via `file://`.

## Testen

```bash
uv run pytest
uv run ruff check src tests
node --check site/app.js
```

De tests draaien op opgenomen Raider.IO-antwoorden in `tests/fixtures/`, zonder netwerk.
