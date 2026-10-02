# Race to Dutch First

Een website die de race volgt tussen Nederlandse World of Warcraft-gilden om als eerste **Cutting Edge** te halen: de laatste Mythic-boss van de huidige raid-tier. Het voelt aan als een race — met grafieken en kaarten, niet alleen een tabel.

## Wat je ziet

- **De race:** een baan per gilde met posities en boss-marks.
- **Klassement:** kaarten per gilde met Mythic/Heroic voortgang.
- **Voortgang:** lijngrafiek over tijd (Mythic kills).
- **Per boss:** raster van bosses × gilden, met eerste kill in goud.
- **Huidige boss:** hoe dicht bij de volgende kill is elk gilde?
- Footer met \"Bijgewerkt … minuten geleden\" en bronvermelding.

## Bronnen

Data van [Raider.IO](https://raider.io) (openbare API, geen sleutel nodig). Warcraft Logs is optioneel.

## Lokaal draaien

```bash
uv sync
uv run python -m racetodutchfirst   # haalt data op → site/data/race.json
# open site/index.html in een browser
```

## Testen

```bash
uv run pytest tests/ -v
```

## Structuur

- `guilds.toml` — gilden, realms, kleuren, tier-configuratie
- `src/racetodutchfirst/__main__.py` — haalt Raider.IO-data op en schrijft `race.json`
- `site/` — HTML, CSS, JS (geen framework, geen build-step)
- `tests/` — pytest met fixtures (geen netwerk in tests)

## Ontwikkelen

Zie [CLAUDE.md](CLAUDE.md) voor gedetailleerde instructies.
