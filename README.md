# Spelled to Victory

A data story about a century of Scripps National Spelling Bee champions and the words that won it, 1925 to the latest Bee. It's a static site with six captioned charts and a "spell the winner" game.

**What the data shows**
- Winning words have barely gotten longer (about 0.1 letters per decade), but they have become far rarer. Most winners since 2000 don't appear in a large sample of modern English at all.
- Champions are almost always 13 or 14.
- The Bee's center of gravity moved from the Midwest to the South, and Texas leads all states.
- Newspapers sponsored every champion from 1925 to 1997. No newspaper-sponsored speller has won since 2017.

Every caption is rendered from `data/findings.json`; none is typed by hand.

## Run it

```bash
npm install
pip install -r requirements.txt   # wordfreq, ety (offline word enrichment)
npm run dev                       # local preview
npm run build                     # data pipeline + static site in dist/
```

`dist/` deploys to any static host (GitHub Pages, Netlify, Cloud Storage, Firebase Hosting).

## Refresh the data

```bash
npm run fetch-data   # re-download Wikipedia + history.spellingbee.com; writes data/raw/http/fetch-report.md
npm run data         # transform → enrich → quality report → findings
```

`fetch-data` is cached and idempotent; add `--force` to re-download. It detects the latest Bee year automatically and reports differences, but it does **not** overwrite the vetted snapshots in `data/raw/*.tsv`. After a new Bee, add the winner's row to `wikipedia_list.tsv` (plus `supplemental.tsv` if the official history site hasn't listed them yet), then run `npm run build`.

| Step | Output |
|---|---|
| `transform` | `data/processed/champions.json`, `words.json`, `years.json` |
| `enrich` | adds word frequency and language of origin (cached in `data/cache/`) |
| `report` | `data/quality-report.md` |
| `findings` | `data/findings.json` |

## Environment variables (optional)

Copy `.env.example` to `.env`. Without these, the site draws its own SVG map.

| Variable | Purpose |
|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key for the interactive map. It's a browser key, so **restrict it by HTTP referrer**. |
| `VITE_GOOGLE_MAPS_MAP_ID` | A vector Map ID (required for Advanced Markers). |

## Sources

See [data/SOURCES.md](data/SOURCES.md). The main ones are the Wikipedia champions list (CC BY-SA), cross-checked against the Bee's history site, plus `wordfreq` and Etymological Wordnet. Known gaps and every resolved disagreement are in [data/quality-report.md](data/quality-report.md). The schema is in [data/SCHEMA.md](data/SCHEMA.md), and the build process is written up in [docs/BUILD_NOTES.md](docs/BUILD_NOTES.md).

Not affiliated with the Scripps National Spelling Bee. No logos, photos or text from the Bee are reproduced. Words in the game are read aloud by the browser's own speech synthesis.
