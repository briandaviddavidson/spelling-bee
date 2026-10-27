# Schema

## data/processed/champions.json — one row per champion (111)

| Field | Type | Notes |
|---|---|---|
| year | int | Bee year |
| edition | int | Official edition number (drifts from year after the 1943–45 and 2020 gaps) |
| decade | int | e.g. 1950 |
| name | string | As listed on Wikipedia |
| name_official | string\|null | As listed by the Bee (e.g. "Katharine Close" for "Kerry Close") |
| age | int | From the official history site; 2025–26 from news coverage |
| age_source | "official"\|"news" | |
| sponsor | string | |
| city, region | string | **Sponsor's** location, not necessarily the champion's hometown |
| country | string | United States, Jamaica, or "Puerto Rico (US territory)" |
| state | string\|null | USPS code; null outside the 50 states |
| census_region | string | Northeast, Midwest, South, West, or "Outside the 50 states" |
| sponsor_type | string | newspaper, library/school, tourism/sports body, civic group, regional bee, broadcaster, business |
| lat, lon | number | Sponsor city (GeoNames) |
| word | string | Competition-ending word, Wikipedia casing |
| joint | bool | Co-champion year |
| spell_off | bool | Decided by a spell-off (2022, 2026) |

## data/processed/words.json — one row per competition-ending word (108)

Co-champions who spelled the same word (1950, 1957, 1962) share one row; in 2014–2016 and 2019 each co-champion had their own word.

| Field | Notes |
|---|---|
| year, decade, word | |
| letters | Letters only, accents folded (é → e) |
| champions | Names of everyone who won with it |
| zipf | wordfreq Zipf frequency in modern English (0 = not found) |
| origin | Language family, or "Unknown" (never guessed) |
| origin_raw, origin_source | What the source said and which source |

## data/processed/years.json — one row per calendar year, 1925 to latest

`held`, `reason_not_held` (World War II 1943–45; COVID-19 2020), `champions`, `spell_off`, `note`.

## Special cases handled

- **No Bee:** 1943, 1944, 1945, 2020. These are kept as rows in years.json, not dropped.
- **Co-champions:** 1950, 1957, 1962, 2014, 2015, 2016 (two each) and 2019 (eight).
- **Spell-offs:** 2022, 2026.
- **Outside the 50 states:** 1975 (San Juan, Puerto Rico), 1998 (Kingston, Jamaica).
- **Repeat word:** "eczema" won in 1936 and 1965.
- **Accents and capitals:** "éclaircissement" is counted as 15 letters. Proper-noun words (Purim, Laodicean, Ursprache, Feldenkrais) keep their capitals.
- **Source conflicts:** resolved in data/raw/resolutions.tsv, each with a citation.
