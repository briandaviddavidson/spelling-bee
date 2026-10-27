# Sources

All retrieved 2026-10-26. There is no official Spelling Bee API.

| Source | What it provides | URL | Terms |
|---|---|---|---|
| Wikipedia, *List of Scripps National Spelling Bee champions* | Backbone: edition, year, competition-ending word, champion, sponsor, sponsor location (111 rows, 1925–2026) | https://en.wikipedia.org/wiki/List_of_Scripps_National_Spelling_Bee_champions | CC BY-SA 4.0 |
| Scripps National Spelling Bee history site, decade champion pages | Champion age; independent cross-check of each word and sponsor (1925–2024) | https://history.spellingbee.com/1920s-champions/ … /2020s-champions/ | © E.W. Scripps; facts used, no text or images reproduced |
| Same site, per-year pages | Tie-breaker for disagreements (1931, 1949, 2015) and spot checks (1967, 1984, 1998, 2004, 2006, 2016) | https://history.spellingbee.com/year/YYYY/ | as above |
| Wikipedia, *Scripps National Spelling Bee* | Cancelled years (1943–45, 2020), 2021 format change, spell-off rules | https://en.wikipedia.org/wiki/Scripps_National_Spelling_Bee | CC BY-SA 4.0 |
| News coverage (2025, 2026) | Ages of Faizan Zaki (13) and Shrey Parikh (14); 2026 spell-off | https://www.mvariety.com/?p=12469 · https://www.wbtv.com/2026/05/29/14-year-old-boy-battles-nerves-dominates-spell-off-win-national-spelling-bee/ | facts only |
| `wordfreq` (Python, offline) | Modern English word frequency (Zipf scale) | https://github.com/rspeer/wordfreq | Apache 2.0 code; CC BY-SA 4.0 data |
| `ety` / Etymological Wordnet (offline) | Language of origin, where known | https://github.com/jmsv/ety-python | MIT; data CC BY-SA 3.0 (de Melo 2014) |
| Wiktionary | Hand-checked etymology overrides (data/raw/etymology_overrides.tsv) | https://en.wiktionary.org | CC BY-SA 4.0 |
| `all-the-cities` (GeoNames, offline) | Coordinates for sponsor cities | https://www.npmjs.com/package/all-the-cities | MIT; GeoNames CC BY 4.0 |
| zip-codes.com | Coordinates for Clarksville, MD (not in GeoNames extract) | https://www.zip-codes.com/city/md-clarksville.asp | facts only |
| `us-atlas` | U.S. state boundaries | https://github.com/topojson/us-atlas | ISC; Census Bureau cartographic boundaries |

## How the snapshots were made

The build environment's network policy blocked Wikipedia and spellingbee.com, so
`data/raw/wikipedia_list.tsv` and `data/raw/official_champions.tsv` were extracted
page by page with a web-reading tool and reconciled field by field (see
`data/quality-report.md`). `npm run fetch-data` downloads both sources directly,
caches the responses in `data/raw/http/`, and writes `fetch-report.md` listing any
differences from the snapshots and any new Bee year. It never overwrites the
snapshots.
