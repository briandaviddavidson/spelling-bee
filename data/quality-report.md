# Data quality report

Generated 2026-10-26 from data/raw/*.tsv. 111 champion rows, 108 words.

## Source disagreements (Wikipedia vs. official history site)

- 1931 Ward Randall: Wikipedia “foulard” vs official “fracas”
- 1949 Kim Calvin: Wikipedia “onerous” vs official “dulcimer”
- 2015 Vanya Shivashankar: Wikipedia “scherenschnitte” vs official “nunatak”
- 2015 Gokul Venkatachalam: Wikipedia “nunatak” vs official “scherenschnitte”

## Resolutions applied (data/raw/resolutions.tsv)

- 1931 Ward Randall: word → “fracas”. Wikipedia lists "foulard"; the Bee's official 1931 page says Randall won by spelling "fracas". (https://history.spellingbee.com/year/1931/)
- 1949 Kim Calvin: word → “dulcimer”. Wikipedia lists "onerous"; the Bee's official 1949 page says Calvin won by spelling "dulcimer". (https://history.spellingbee.com/year/1949/)
- 2001 Sean Conley: city → “Aitkin”. Wikipedia spells the town "Aitken"; the sponsor (Aitkin Independent Age) and GeoNames both use "Aitkin", Minnesota. (https://history.spellingbee.com/2000s-champions/)
- 2015 Vanya Shivashankar: word → “nunatak”. Wikipedia pairs Vanya Shivashankar with "scherenschnitte"; the official 2015 page credits her with "nunatak". (https://history.spellingbee.com/year/2015/)
- 2015 Gokul Venkatachalam: word → “scherenschnitte”. Wikipedia pairs Gokul Venkatachalam with "nunatak"; the official 2015 page credits him with "scherenschnitte". (https://history.spellingbee.com/year/2015/)
- 2019 Saketh Sundar: coords → “39.2052,-76.9510”. Clarksville, MD is not in the offline GeoNames city list; coordinates for ZIP 21029 used instead. (https://www.zip-codes.com/city/md-clarksville.asp)

## Unmatched rows

- none

## Geocoding failures

- none

## Missing fields

- none

## Other notes

- 1967: casing differs — Wikipedia “chihuahua”, official decade page “Chihuahua” (kept Wikipedia)
- 2021: casing differs — Wikipedia “murraya”, official decade page “Murraya” (kept Wikipedia)
- Word won more than once: “eczema” (1936, 1965)

## Spot check against official per-year pages

| Year | Champion | Checked | Result |
|---|---|---|---|
| 2006 | Katharine "Kerry" Close | age, sponsor, word | pass ([source](https://history.spellingbee.com/year/2006/)) |
| 2004 | David Tidmarsh | age, sponsor, word | pass ([source](https://history.spellingbee.com/year/2004/)) |
| 1998 | Jody-Anne Maxwell | age, sponsor, place, word | pass ([source](https://history.spellingbee.com/year/1998/)) |
| 1967 | Jennifer Reinke | age, sponsor, word | pass ([source](https://history.spellingbee.com/year/1967/)) |
| 1984 | Daniel Greenblatt | age, sponsor, word | pass ([source](https://history.spellingbee.com/year/1984/)) |
| 2016 | Jairam Hathwar & Nihar Janga | age, sponsor, word | pass ([source](https://history.spellingbee.com/year/2016/)) |

## Known limitations

- **Sponsor location is not hometown.** Wikipedia records where the sponsor is based. They usually coincide, but not always (2016 co-champion Jairam Hathwar lived in Painted Post, NY; his sponsor was in Corning, NY). The map is labeled accordingly.
- **Language of origin is incomplete.** 37 of 108 words have an origin, from the offline Etymological Wordnet plus 4 Wiktionary-cited overrides. The rest are left as “Unknown” rather than guessed, so origin appears only in the interactive and is not charted. Unknown: knack, luxuriance, sanitarium, canonical, initials, sacrilegious, chlorophyll, psychiatry, meticulosity, vignette, transept, crustaceology, schappe, catamaran, eudaemonic, esquamulose, sycophant, ratoon, chihuahua, abalone, interlocutory, shalloon, vouchsafe, hydrophyte, narcolepsy, maculature, elucubrate, Purim, luge, odontalgia, staphylococci, elegiacal, spoliator, fibranne, antipyretic, antediluvian, xanthosis, vivisepulture, euonym, chiaroscurist, logorrhea, demarche, succedaneum, prospicience, pococurante, autochthonous, appoggiatura, Ursprache, serrefine, Laodicean, stromuhr, cymotrichous, guetapens, knaidel, stichomythia, feuilleton, scherenschnitte, Feldenkrais, gesellschaft, marocain, auslaut, bougainvillea, aiguillette, pendeloque, palama, cernuous, odylic, murraya, moorhen, psammophile, bromocriptine.
- **Word rarity uses modern frequency.** `wordfreq` reflects 2010s–2020s English text, so an older word may have been more common in its own day. The caption says “in today’s English.”
- **Sponsor type is a manual classification** (data/raw/sponsor_types.tsv): newspaper 91, business 2, civic group 4, library/school 5, broadcaster 1, regional bee 2, tourism/sports body 6. Houston Public Media (public radio/TV) is counted as a broadcaster, not a newspaper.
- **Ages for 2025 and 2026** come from news coverage because the official history site’s decade pages did not yet list those champions (data/raw/supplemental.tsv).
- **Snapshot provenance.** The cloud build environment could not reach Wikipedia or spellingbee.com directly. The snapshots were extracted through a web-reading tool and reconciled field by field. `npm run fetch-data` re-downloads both sources and reports any differences; run it on a networked machine to confirm.
