// npm run report -> data/quality-report.md (run after transform + enrich)
import fs from 'node:fs';
import path from 'node:path';
import { readTsv } from './lib.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const qa = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cache/qa-transform.json'), 'utf8'));
const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/processed/words.json'), 'utf8'));
const champions = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/processed/champions.json'), 'utf8'));
const spot = readTsv(path.join(ROOT, 'data/raw/spot_checks.tsv'));
const list = (xs, empty = '- none') => (xs.length ? xs.map((x) => `- ${x}`) : [empty]);
const unknownOrigin = words.filter((w) => w.origin === 'Unknown').map((w) => w.word);
const byType = champions.reduce((m, c) => ((m[c.sponsor_type] = (m[c.sponsor_type] ?? 0) + 1), m), {});

const md = [
  '# Data quality report', '',
  `Generated ${new Date().toISOString().slice(0, 10)} from data/raw/*.tsv. ${champions.length} champion rows, ${words.length} words.`, '',
  '## Source disagreements (Wikipedia vs. official history site)', '', ...list(qa.disagreements), '',
  '## Resolutions applied (data/raw/resolutions.tsv)', '', ...list(qa.resolved), '',
  '## Unmatched rows', '', ...list(qa.unmatched), '',
  '## Geocoding failures', '', ...list(qa.geocode), '',
  '## Missing fields', '', ...list(qa.missing), '',
  '## Other notes', '', ...list(qa.notes), '',
  '## Spot check against official per-year pages', '',
  '| Year | Champion | Checked | Result |', '|---|---|---|---|',
  ...spot.map((s) => `| ${s.year} | ${s.champion} | ${s.field_checked} | ${s.result} ([source](${s.source_url})) |`), '',
  '## Known limitations', '',
  '- **Sponsor location is not hometown.** Wikipedia records where the sponsor is based. They usually coincide, but not always (2016 co-champion Jairam Hathwar lived in Painted Post, NY; his sponsor was in Corning, NY). The map is labeled accordingly.',
  `- **Language of origin is incomplete.** ${words.length - unknownOrigin.length} of ${words.length} words have an origin, from the offline Etymological Wordnet plus ${readTsv(path.join(ROOT, 'data/raw/etymology_overrides.tsv')).length} Wiktionary-cited overrides. The rest are left as “Unknown” rather than guessed, so origin appears only in the interactive and is not charted. Unknown: ${unknownOrigin.join(', ')}.`,
  '- **Word rarity uses modern frequency.** `wordfreq` reflects 2010s–2020s English text, so an older word may have been more common in its own day. The caption says “in today’s English.”',
  `- **Sponsor type is a manual classification** (data/raw/sponsor_types.tsv): ${Object.entries(byType).map(([t, n]) => `${t} ${n}`).join(', ')}. Houston Public Media (public radio/TV) is counted as a broadcaster, not a newspaper.`,
  '- **Ages for 2025 and 2026** come from news coverage because the official history site’s decade pages did not yet list those champions (data/raw/supplemental.tsv).',
  '- **Snapshot provenance.** The cloud build environment could not reach Wikipedia or spellingbee.com directly. The snapshots were extracted through a web-reading tool and reconciled field by field. `npm run fetch-data` re-downloads both sources and reports any differences; run it on a networked machine to confirm.',
];
fs.writeFileSync(path.join(ROOT, 'data/quality-report.md'), md.join('\n') + '\n');
console.log('wrote data/quality-report.md');
