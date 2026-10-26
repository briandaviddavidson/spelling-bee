// npm run transform
// Merges the Wikipedia list (backbone: year, edition, word, sponsor location)
// with the Bee's official history pages (age, cross-check on words), applies
// documented resolutions, geocodes sponsor locations offline, and writes
// data/processed/*.json plus data/quality-report.md.
import fs from 'node:fs';
import path from 'node:path';
import cities from 'all-the-cities';
import { readTsv, writeJson, fold, letters, surname } from './lib.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const raw = (f) => path.join(ROOT, 'data/raw', f);
const wiki = readTsv(raw('wikipedia_list.tsv'));
const official = readTsv(raw('official_champions.tsv'));
const supplemental = readTsv(raw('supplemental.tsv'));
const resolutions = readTsv(raw('resolutions.tsv'));
const sponsorTypes = Object.fromEntries(readTsv(raw('sponsor_types.tsv')).map((r) => [r.sponsor, r.type]));
// U.S. Census Bureau regions
const REGION = {};
for (const [r, codes] of Object.entries({
  Northeast: 'CT ME MA NH RI VT NJ NY PA', Midwest: 'IL IN MI OH WI IA KS MN MO NE ND SD',
  South: 'DE DC FL GA MD NC SC VA WV AL KY MS TN AR LA OK TX', West: 'AZ CO ID MT NV NM UT WY AK CA HI OR WA',
})) for (const c of codes.split(' ')) REGION[c] = r;
const qa = { disagreements: [], resolved: [], unmatched: [], geocode: [], missing: [], notes: [] };

// ---- known special cases (each documented in SCHEMA.md) --------------------
const NO_BEE = { 1943: 'World War II', 1944: 'World War II', 1945: 'World War II', 2020: 'COVID-19 pandemic' };
const SPELL_OFF = {
  2022: 'https://en.wikipedia.org/wiki/Scripps_National_Spelling_Bee',
  2026: 'https://www.wbtv.com/2026/05/29/14-year-old-boy-battles-nerves-dominates-spell-off-win-national-spelling-bee/',
};
const FORMAT_NOTES = {
  1998: 'First champion from outside the United States (Kingston, Jamaica).',
  2019: 'The Bee ran out of words hard enough to separate the finalists: eight co-champions.',
  2021: 'Format overhaul: preliminary test dropped; held at ESPN Wide World of Sports, Florida.',
};

// ---- match official rows to Wikipedia rows -----------------------------------
const usedOfficial = new Set();
function findOfficial(w) {
  const sn = surname(w.winner);
  const cands = official.map((o, i) => ({ o, i })).filter(({ o, i }) => !usedOfficial.has(i) && surname(o.champion) === sn);
  const byYear = cands.filter(({ o }) => o.year === w.year);
  const pick = byYear[0] ?? cands.find(({ o }) => !o.year && fold(o.word) === fold(w.word)) ?? (cands.length === 1 && !cands[0].o.year ? cands[0] : null);
  if (pick) usedOfficial.add(pick.i);
  return pick?.o ?? null;
}

const stateCodes = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/states.json'), 'utf8'));
const ALIASES = {};
function geocode(city, region) {
  const name = ALIASES[fold(city)] ?? fold(city);
  let country = 'US', admin = stateCodes[region];
  if (region === 'Jamaica') { country = 'JM'; admin = null; }
  if (region === 'Puerto Rico') { country = 'PR'; admin = null; }
  const hits = cities
    .filter((c) => c.country === country && (!admin || c.adminCode === admin) && (fold(c.name) === name || fold(c.altName || '').split(',').includes(name)))
    .sort((a, b) => b.population - a.population);
  return hits[0] ? { lat: hits[0].loc.coordinates[1], lon: hits[0].loc.coordinates[0], geonameId: hits[0].cityId } : null;
}

const champions = [];
for (const w of wiki) {
  const o = findOfficial(w);
  const sup = supplemental.find((s) => s.year === w.year && surname(s.champion) === surname(w.winner));
  const res = resolutions.filter((r) => r.year === w.year && r.champion_surname === surname(w.winner));
  let word = w.word;
  let coordsOverride = null;
  let [city, region] = w.sponsor_location.includes(',') ? w.sponsor_location.split(',').map((s) => s.trim()) : [w.sponsor_location, 'New York'];

  if (o && fold(o.word) !== fold(w.word)) qa.disagreements.push(`${w.year} ${w.winner}: Wikipedia “${w.word}” vs official “${o.word}”`);
  for (const r of res) {
    if (r.field === 'word') word = r.value;
    if (r.field === 'city') city = r.value;
    if (r.field === 'coords') coordsOverride = r.value.split(',').map(Number);
    qa.resolved.push(`${w.year} ${w.winner}: ${r.field} → “${r.value}”. ${r.reason} (${r.source_url})`);
  }
  if (o && fold(o.word) !== fold(word)) qa.notes.push(`UNRESOLVED word mismatch ${w.year} ${w.winner}`);
  if (!o && !sup) qa.unmatched.push(`${w.year} ${w.winner}: no official history entry matched`);
  // Casing: keep Wikipedia's (it capitalizes Purim, Laodicean, Ursprache, Feldenkrais).
  // The official decade pages capitalize a few more (Chihuahua, Murraya) but the
  // official per-year page for 1967 uses lowercase, so casing differences are only noted.
  if (o && o.word !== word && fold(o.word) === fold(word)) qa.notes.push(`${w.year}: casing differs — Wikipedia “${word}”, official decade page “${o.word}” (kept Wikipedia)`);
  const geo = coordsOverride ? { lat: coordsOverride[0], lon: coordsOverride[1] } : geocode(city, region);
  if (!geo) qa.geocode.push(`${w.year} ${city}, ${region}`);
  const age = o?.age ? +o.age : sup?.age ? +sup.age : null;
  if (age == null) qa.missing.push(`${w.year} ${w.winner}: age unknown`);

  champions.push({
    year: +w.year,
    edition: +w.edition,
    decade: Math.floor(+w.year / 10) * 10,
    name: w.winner,
    name_official: o?.champion ?? sup?.champion ?? null,
    age,
    age_source: o ? 'official' : sup ? 'news' : null,
    sponsor: w.sponsor,
    city, region,
    country: region === 'Jamaica' ? 'Jamaica' : region === 'Puerto Rico' ? 'Puerto Rico (US territory)' : 'United States',
    state: stateCodes[region] ?? null,
    census_region: REGION[stateCodes[region]] ?? 'Outside the 50 states',
    sponsor_type: sponsorTypes[w.sponsor] ?? (qa.notes.push(`${w.year}: sponsor type unclassified`), 'unclassified'),
    lat: geo?.lat ?? null, lon: geo?.lon ?? null,
    word,
    joint: w.joint === '†',
    spell_off: Boolean(SPELL_OFF[w.year]),
  });
}
for (const [i, o] of official.entries()) if (!usedOfficial.has(i)) qa.unmatched.push(`official row not matched: ${o.champion} (${o.word})`);

// ---- words table: one row per competition-ending word ----------------------
const wordMap = new Map();
for (const c of champions) {
  const key = `${c.year}|${fold(c.word)}`;
  if (!wordMap.has(key)) wordMap.set(key, { year: c.year, decade: c.decade, word: c.word, letters: letters(c.word).length, champions: [] });
  wordMap.get(key).champions.push(c.name);
}
const words = [...wordMap.values()];
const repeatWords = Object.entries(words.reduce((m, w) => ((m[fold(w.word)] ??= []).push(w.year), m), {})).filter(([, ys]) => ys.length > 1);
for (const [w, ys] of repeatWords) qa.notes.push(`Word won more than once: “${w}” (${ys.join(', ')})`);

// ---- years table --------------------------------------------------------------
const first = Math.min(...champions.map((c) => c.year)), last = Math.max(...champions.map((c) => c.year));
const years = [];
for (let y = first; y <= last; y++) {
  const cs = champions.filter((c) => c.year === y);
  years.push({ year: y, held: cs.length > 0, reason_not_held: NO_BEE[y] ?? null, champions: cs.length,
    spell_off: Boolean(SPELL_OFF[y]), note: FORMAT_NOTES[y] ?? null });
  if (!cs.length && !NO_BEE[y]) qa.notes.push(`${y}: no champion and no documented cancellation`);
}

const outDir = path.join(ROOT, 'data/processed');
fs.mkdirSync(outDir, { recursive: true });
writeJson(path.join(outDir, 'champions.json'), champions);
writeJson(path.join(outDir, 'words.json'), words);
writeJson(path.join(outDir, 'years.json'), years);
writeJson(path.join(ROOT, 'data/cache/qa-transform.json'), qa);
console.log(`champions ${champions.length}, words ${words.length}, years ${years.length} (${first}–${last})`);
for (const [k, v] of Object.entries(qa)) console.log(`  ${k}: ${v.length}`, v.slice(0, 12));
