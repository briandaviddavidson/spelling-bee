// npm run findings -> data/findings.json
// Every chart caption on the site is rendered from these numbers.
import fs from 'node:fs';
import path from 'node:path';
import { writeJson } from './lib.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const load = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/processed', f), 'utf8'));
const champions = load('champions.json');
const words = load('words.json');
const years = load('years.json');

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
const pct = (n, d) => Math.round((100 * n) / d);
function ols(points) { // least squares y = a + b x
  const mx = mean(points.map((p) => p[0])), my = mean(points.map((p) => p[1]));
  const b = points.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / points.reduce((s, [x]) => s + (x - mx) ** 2, 0);
  return { intercept: my - b * mx, slope: b };
}
const groupBy = (arr, key) => arr.reduce((m, x) => ((m[key(x)] ??= []).push(x), m), {});

const held = years.filter((y) => y.held);
const first = years[0].year, latest = years.at(-1).year;
const ERAS = [[first, 1959], [1960, 1999], [2000, latest]];
const eraLabel = ([a, b]) => `${a}–${b}`;
const inEra = (y, [a, b]) => y >= a && y <= b;

// ---- 1. word length over time --------------------------------------------
const lengthFit = ols(words.map((w) => [w.year, w.letters]));
const byLen = [...words].sort((a, b) => b.letters - a.letters || a.year - b.year);
const longestLen = byLen[0].letters, shortestLen = byLen.at(-1).letters;
const length = {
  slope_per_decade: round(lengthFit.slope * 10, 2),
  fit: lengthFit,
  era_means: ERAS.map((e) => ({ era: eraLabel(e), mean: round(mean(words.filter((w) => inEra(w.year, e)).map((w) => w.letters))) })),
  longest: byLen.filter((w) => w.letters === longestLen).map(({ word, year }) => ({ word, year })),
  longest_letters: longestLen,
  shortest: byLen.filter((w) => w.letters === shortestLen).map(({ word, year }) => ({ word, year })),
  shortest_letters: shortestLen,
};

// ---- 2. sponsor region by decade -----------------------------------------
const decades = [...new Set(champions.map((c) => c.decade))].sort();
const REGIONS = ['Northeast', 'Midwest', 'South', 'West', 'Outside the 50 states'];
const regionByDecade = decades.flatMap((d) => {
  const cs = champions.filter((c) => c.decade === d);
  return REGIONS.map((r) => ({ decade: d, region: r, count: cs.filter((c) => c.census_region === r).length, share: pct(cs.filter((c) => c.census_region === r).length, cs.length) }));
});
const regionTotals = Object.fromEntries(REGIONS.map((r) => [r, champions.filter((c) => c.census_region === r).length]));
const early = champions.filter((c) => c.year < 1960), recent = champions.filter((c) => c.year >= 2000);
const region = {
  totals: regionTotals,
  midwest_share_pre1960: pct(early.filter((c) => c.census_region === 'Midwest').length, early.length),
  midwest_share_2000s: pct(recent.filter((c) => c.census_region === 'Midwest').length, recent.length),
  south_share_pre1960: pct(early.filter((c) => c.census_region === 'South').length, early.length),
  south_share_2000s: pct(recent.filter((c) => c.census_region === 'South').length, recent.length),
  texas_2000s: recent.filter((c) => c.state === 'TX').length,
  recent_count: recent.length,
  by_decade: regionByDecade,
};

// ---- 3. ages -----------------------------------------------------------------
const ages = champions.map((c) => c.age).filter((a) => a != null);
const ageCounts = Object.fromEntries([...new Set(ages)].sort().map((a) => [a, ages.filter((x) => x === a).length]));
const minAge = Math.min(...ages), maxAge = Math.max(...ages);
const age = {
  known: ages.length, mean: round(mean(ages)), median: median(ages), counts: ageCounts,
  min: minAge, max: maxAge,
  youngest: champions.filter((c) => c.age === minAge).map(({ name, year }) => ({ name, year })),
  modal: +Object.entries(ageCounts).sort((a, b) => b[1] - a[1])[0][0],
  era_means: ERAS.map((e) => ({ era: eraLabel(e), mean: round(mean(champions.filter((c) => inEra(c.year, e)).map((c) => c.age))) })),
};

// ---- 4. geography --------------------------------------------------------
const byState = groupBy(champions.filter((c) => c.state), (c) => c.state);
const stateRank = Object.entries(byState).map(([s, cs]) => ({ state: s, count: cs.length })).sort((a, b) => b.count - a.count);
const byCity = groupBy(champions, (c) => `${c.city}, ${c.state ?? c.region}`);
const cityRank = Object.entries(byCity).map(([k, cs]) => ({ place: k, count: cs.length, lat: cs[0].lat, lon: cs[0].lon, years: cs.map((c) => c.year) })).sort((a, b) => b.count - a.count);
const geography = {
  states_with_champion: stateRank.length,
  top_states: stateRank.slice(0, 5),
  top_cities: cityRank.slice(0, 5),
  denver_last: Math.max(...(byCity['Denver, CO'] ?? []).map((c) => c.year)),
  outside_us_states: champions.filter((c) => !c.state).map(({ name, year, city, region }) => ({ name, year, place: `${city}, ${region}` })),
  cities: cityRank,
};

// ---- 5. rarity (wordfreq Zipf) ----------------------------------------------
const rarity = {
  era: ERAS.map((e) => {
    const ws = words.filter((w) => inEra(w.year, e));
    return { era: eraLabel(e), words: ws.length, median_zipf: round(median(ws.map((w) => w.zipf)), 2),
      absent_share: pct(ws.filter((w) => w.zipf === 0).length, ws.length) };
  }),
  most_common: [...words].sort((a, b) => b.zipf - a.zipf).slice(0, 3).map(({ word, year, zipf }) => ({ word, year, zipf })),
  last_common_year: Math.max(...words.filter((w) => w.zipf >= 3).map((w) => w.year)),
  last_common_word: words.filter((w) => w.zipf >= 3).sort((a, b) => b.year - a.year)[0]?.word,
};

// ---- 6. newspapers --------------------------------------------------------
const newsByDecade = decades.map((d) => {
  const cs = champions.filter((c) => c.decade === d);
  return { decade: d, champions: cs.length, newspaper: cs.filter((c) => c.sponsor_type === 'newspaper').length, share: pct(cs.filter((c) => c.sponsor_type === 'newspaper').length, cs.length) };
});
const newsChamps = champions.filter((c) => c.sponsor_type === 'newspaper');
const lastNews = newsChamps.sort((a, b) => b.year - a.year)[0];
const firstNon = champions.filter((c) => c.sponsor_type !== 'newspaper').sort((a, b) => a.year - b.year)[0];
const newspapers = {
  by_decade: newsByDecade,
  overall_share: pct(newsChamps.length, champions.length),
  first_non_newspaper: { year: firstNon.year, name: firstNon.name, sponsor: firstNon.sponsor },
  last_newspaper: { year: lastNews.year, name: lastNews.name, sponsor: lastNews.sponsor },
  unbroken_newspaper_until: Math.max(...held.filter((y) => y.year < firstNon.year).map((y) => y.year)),
  since_last_newspaper: champions.filter((c) => c.year > lastNews.year).length,
  rocky_mountain_news: champions.filter((c) => c.sponsor === 'Rocky Mountain News').length,
  types_recent: Object.entries(groupBy(champions.filter((c) => c.year > lastNews.year), (c) => c.sponsor_type)).map(([t, cs]) => ({ type: t, count: cs.length })).sort((a, b) => b.count - a.count),
};

// ---- headline facts -------------------------------------------------------
const headline = {
  first_year: first, latest_year: latest,
  bees_held: held.length, champions: champions.length, words: words.length,
  cancelled: years.filter((y) => !y.held).map(({ year, reason_not_held }) => ({ year, reason: reason_not_held })),
  co_champion_years: held.filter((y) => y.champions > 1).map(({ year, champions: n }) => ({ year, champions: n })),
  spell_off_years: held.filter((y) => y.spell_off).map((y) => y.year),
  repeat_words: Object.entries(groupBy(words, (w) => w.word.toLowerCase())).filter(([, ws]) => ws.length > 1).map(([w, ws]) => ({ word: w, years: ws.map((x) => x.year) })),
  latest_champion: champions.filter((c) => c.year === latest).map(({ name, word, age, city, region }) => ({ name, word, age, place: `${city}, ${region}` })),
};

const findings = { generated: new Date().toISOString().slice(0, 10), headline, length, region, age, geography, rarity, newspapers };
writeJson(path.join(ROOT, 'data/findings.json'), findings);
console.log(JSON.stringify({ headline, length: { ...length, fit: undefined }, region: { ...region, by_decade: undefined }, age, rarity, newspapers: { ...newspapers, by_decade: newspapers.by_decade }, top: geography.top_states, cities: geography.top_cities.map((c) => [c.place, c.count]) }, null, 1));
