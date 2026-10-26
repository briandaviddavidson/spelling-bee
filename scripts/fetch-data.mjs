// npm run fetch-data
// Refreshes raw source pages into data/raw/http/ (cached, idempotent) and checks
// them against the vetted snapshots in data/raw/*.tsv. It never overwrites the
// snapshots: differences and any new Bee year are written to
// data/raw/http/fetch-report.md for a human to review.
//
//   --force   re-download even if a cached copy exists
import fs from 'node:fs';
import path from 'node:path';
import { readTsv } from './lib.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'data/raw/http');
const UA = 'spelling-bee-data-story/1.0 (https://github.com/briandaviddavidson/spelling-bee)';
const FORCE = process.argv.includes('--force');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];

async function cached(name, url) {
  const file = path.join(OUT, name);
  if (!FORCE && fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    fs.writeFileSync(file, text);
    await sleep(500); // be polite
    return text;
  } catch (err) {
    log.push(`- FAILED ${url}: ${err.message}`);
    return null;
  }
}

// ---- 1. Wikipedia list (wikitext via the MediaWiki API) -------------------
const WIKI = 'https://en.wikipedia.org/w/api.php?action=parse&page=List_of_Scripps_National_Spelling_Bee_champions&prop=wikitext&format=json&formatversion=2';
const wikiJson = await cached('wikipedia_list.json', WIKI);
const fetchedRows = [];
if (wikiJson) {
  const wikitext = JSON.parse(wikiJson).parse.wikitext;
  const clean = (s) => s
    .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/\{\{[^{}]*\}\}/g, (m) => (m.includes('|') ? m.split('|').pop().replace('}}', '') : ''))
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '').replace(/<[^>]+>/g, '').trim();
  for (const row of wikitext.split(/\n\|-/)) {
    const cells = row.split(/\n[|!]|\|\|/).map(clean).filter(Boolean);
    const yi = cells.findIndex((c) => /^(19|20)\d\d$/.test(c));
    if (yi >= 0) fetchedRows.push(cells);
  }
  fs.writeFileSync(path.join(OUT, 'wikipedia_rows.json'), JSON.stringify(fetchedRows, null, 1));
}

// ---- 2. Official history site: one page per year --------------------------
const snapshot = readTsv(path.join(ROOT, 'data/raw/wikipedia_list.tsv'));
const years = [...new Set(snapshot.map((r) => +r.year))];
const fetchedYears = fetchedRows.map((c) => +c.find((x) => /^(19|20)\d\d$/.test(x)));
const latest = Math.max(...years, ...fetchedYears.filter(Boolean));
const official = [];
for (const y of years) {
  const html = await cached(`official_${y}.html`, `https://history.spellingbee.com/year/${y}/`);
  if (!html) continue;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  // e.g. "Kim Calvin, age 13, sponsored by the Canton Repository, won the $500 prize by correctly spelling the word “dulcimer.”"
  const re = /([A-Z][\w.'’ -]+?), age (\d+),[^.]*?correctly spelling the word [“"]([^”"]+?)[.,]?[”"]/g;
  for (const m of text.matchAll(re)) official.push({ year: y, champion: m[1].trim(), age: +m[2], word: m[3] });
}
fs.writeFileSync(path.join(OUT, 'official_parsed.json'), JSON.stringify(official, null, 1));

// ---- 3. Compare against snapshots -----------------------------------------
const snapWords = new Set(snapshot.map((r) => `${r.year}|${r.word.toLowerCase()}`));
const newYears = fetchedYears.filter((y) => y && !years.includes(y));
const report = [
  '# Fetch report', '', `Run: ${new Date().toISOString()}`, '',
  `Latest Bee year seen: **${latest}**${newYears.length ? ` — NEW years not in snapshot: ${[...new Set(newYears)].join(', ')}` : ''}`, '',
  `Wikipedia rows parsed: ${fetchedRows.length} (snapshot: ${snapshot.length})`,
  `Official year pages parsed: ${official.length}`, '',
  '## Official words not matching the Wikipedia snapshot', '',
  ...official.filter((o) => !snapWords.has(`${o.year}|${o.word.toLowerCase()}`)).map((o) => `- ${o.year} ${o.champion}: “${o.word}”`),
  '', '## Network log', '', ...(log.length ? log : ['- all requests OK or cached']),
];
fs.writeFileSync(path.join(OUT, 'fetch-report.md'), report.join('\n') + '\n');
console.log(report.slice(0, 8).join('\n'));
if (log.length) console.warn(`${log.length} request(s) failed; snapshots in data/raw/*.tsv remain the source of truth.`);
