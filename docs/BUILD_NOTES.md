# Build notes

## Goal and starting prompt

> "Use the data-story skill to build a story about Scripps National Spelling Bee champions and winning words."

This is the fourth project in a series of AI-built data stories (Time Person of the Year, Nobel, baby names). The goal was a deployable static site with verified sources, cached data, computed captions and one signature interactive. It was built with Claude in a single evening session on 2026-10-26.

## Time per phase (approximate)

| Phase | Time |
|---|---|
| Plan and source research (stopped for approval) | 10 min |
| Source extraction and reconciliation | 20 min |
| Transform, enrichment, quality report | 20 min |
| Findings and spot checks | 10 min |
| Charts and game, including render-and-inspect passes | 30 min |
| Docs | 10 min |

## What the AI got wrong, and how it was caught

1. **Trusting one source would have shipped three wrong words.** Wikipedia gives 1931 as "foulard" and 1949 as "onerous", and swaps the 2015 co-champions' words. Pulling the Bee's own history pages as a second source surfaced all three as disagreements, and the official per-year pages settled them ("fracas", "dulcimer", and Vanya Shivashankar → nunatak). See `data/raw/resolutions.tsv`.
2. **A summarizer mislabeled a year.** One extraction of the Bee's milestones page put Kerry Close's "Ursprache" in 2004. Both champion lists said 2006, and the official 2006 page confirmed it. The lesson is that extracted text needs a second source too.
3. **The plan promised an etymology chart that the data couldn't support.** The offline etymology database knew only about a third of the words, and live Wiktionary lookups failed on too many pages. Rather than fill gaps from memory, origin was dropped from the charts, kept only in the game where it's known, and listed as a limitation. Sponsor region and sponsor type replaced it as the decade-composition charts.
4. **A hand-typed number crept into a title.** "Newspapers sponsored every champion for 70 years" was written before the number was computed. The data says 1925–1997, which is 73 calendar years. The title is now rendered from `findings.json`.
5. **Casing.** The decade pages capitalize "Chihuahua" and "Murraya", but the official 1967 per-year page uses lowercase. The site keeps Wikipedia's casing and logs every difference instead of silently picking one.
6. **Rendering bugs found only by looking.** A stacked-bar tooltip threw an error that blanked three charts. The fix was to isolate each chart so one failure can't take down the others. Overlapping labels on the two 15-letter words were also caught in screenshots, not in code review.

## Key decisions and trade-offs

- **Snapshots plus a verifying fetch.** The cloud build couldn't reach Wikipedia or spellingbee.com, so vetted TSV snapshots are the source of truth. `fetch-data` re-downloads both sources and reports differences rather than overwriting, because a silent parser change shouldn't be able to alter the published data.
- **Sponsor location, labeled honestly.** It's the only location available for every champion. The map caption says so, and the quality report gives a counterexample.
- **No inferred demographics.** Gender and ethnicity are never inferred from names. The data has no sourced fields for them, so the site doesn't chart them.
- **Rarity uses modern frequency.** `wordfreq` measures today's English, so "vanished from everyday English" is phrased as a statement about today, not about each word's own era.
- **SVG map by default, Google Maps when keyed.** The default SVG map works on any static host with no key. Adding a Maps key and Map ID swaps in an interactive Google map with Advanced Markers.
- **Speech synthesis, not audio files.** The game ships no recordings. The browser reads each word aloud, and the page notes that the browser's voice may differ from the Bee's pronouncer.
