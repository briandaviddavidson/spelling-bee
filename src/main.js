import * as Plot from '@observablehq/plot';
import * as topojson from 'topojson-client';
import us from 'us-atlas/states-10m.json';
import findings from '../data/findings.json';
import champions from '../data/processed/champions.json';
import words from '../data/processed/words.json';
import states from '../scripts/states.json';
import { renderGoogleMap } from './google-map.js';
import { initGame } from './game.js';

const F = findings;
const $ = (sel, root = document) => root.querySelector(sel);
const fmt = (n) => n.toLocaleString('en-US');
const w = (s) => `<span class="word">${s}</span>`;
const list = (xs) => (xs.length < 3 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const SRC_LIST = 'Source: Wikipedia, “List of Scripps National Spelling Bee champions,” cross-checked against history.spellingbee.com.';
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const theme = () => ({
  text: css('--text-primary'), text2: css('--text-secondary'), muted: css('--text-muted'), grid: css('--grid'), surface: css('--surface-1'),
  s: [1, 2, 3, 4, 5].map((i) => css(`--series-${i}`)), seq: ['--seq-100', '--seq-250', '--seq-450', '--seq-650'].map(css),
});

// ---------- headline ---------------------------------------------------------
const H = F.headline;
document.querySelectorAll('[data-f="latest"]').forEach((el) => (el.textContent = H.latest_year));
const latest = H.latest_champion[0];
$('#dek').innerHTML = `Since ${H.first_year}, ${fmt(H.champions)} champions have won the Scripps National Spelling Bee, from ${w('gladiolus')} to ${w(latest.word)}. Here is what a century of winning words reveals about the Bee: the words got rarer, the map shifted, and the newspapers that built the contest disappeared.`;
$('#stats').innerHTML = [
  ['Bees held', H.bees_held],
  ['Champions', H.champions],
  ['Years with co-champions', H.co_champion_years.length],
  ['Years cancelled', H.cancelled.length],
].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

// ---------- helpers ---------------------------------------------------------
function section(id, { title, caption, source, note }) {
  const el = document.getElementById(id);
  $('[data-title]', el).innerHTML = title;
  $('[data-caption]', el).innerHTML = caption;
  $('[data-source]', el).textContent = source;
  if (note) $('[data-note]', el).innerHTML = note;
  return el;
}
function table(el, cols, rows) {
  $('details.table > div', el).innerHTML = `<table><thead><tr>${cols.map((c) => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${
    rows.map((r) => `<tr>${cols.map((c) => `<td>${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function mount(el, svg, label) {
  const box = $('.plot', el);
  box.replaceChildren(svg);
  box.setAttribute('aria-label', label);
}
function legend(el, items) {
  $('.legend', el).innerHTML = items.map(([label, color]) => `<span><i style="background:${color}"></i>${label}</span>`).join('');
}
const width = (el) => Math.min($('.plot', el).clientWidth || 860, 860);
const baseOpts = (t, el) => ({
  width: width(el), marginLeft: 44, marginBottom: 36, style: { color: t.text2, fontSize: '12px', background: 'transparent', overflow: 'visible' },
});
const tip = (t) => ({ fill: t.surface, stroke: t.grid, fontSize: 13 });

// ---------- 1. word length ----------------------------------------------------
const L = F.length;
const lenEl = section('length', {
  title: 'Winning words have barely gotten longer',
  caption: `The average winning word grew from <b>${L.era_means[0].mean}</b> letters (${L.era_means[0].era}) to <b>${L.era_means.at(-1).mean}</b> (${L.era_means.at(-1).era}), a trend of only ${L.slope_per_decade} letters per decade. The longest winners, ${list(L.longest.map((x) => `${w(x.word)} (${x.year})`))}, have ${L.longest_letters} letters. The shortest, ${list(L.shortest.map((x) => `${w(x.word)} (${x.year})`))}, has ${L.shortest_letters}.`,
  source: `${SRC_LIST} Letters counted without accents or punctuation.`,
});
function drawLength() {
  const t = theme();
  const labelled = [...L.longest, ...L.shortest].map((x) => words.find((v) => v.word === x.word && v.year === x.year));
  mount(lenEl, Plot.plot({
    ...baseOpts(t, lenEl), height: 340,
    x: { label: null, tickFormat: 'd' }, y: { label: 'Letters', grid: true, domain: [0, 16] },
    marks: [
      Plot.gridY({ stroke: t.grid, strokeOpacity: 1 }),
      Plot.linearRegressionY(words, { x: 'year', y: 'letters', stroke: t.text2, strokeWidth: 2, strokeDasharray: '4 4', ci: 0 }),
      Plot.dot(words, { x: 'year', y: 'letters', r: 4.5, fill: t.s[0], stroke: t.surface, strokeWidth: 1.5 }),
      ...[[labelled.filter((d) => d.year !== 2025), 0], [labelled.filter((d) => d.year === 2025), -15]].map(([data, dy]) =>
        Plot.text(data, { x: 'year', y: 'letters', text: 'word', fill: t.text, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', stroke: t.surface, strokeWidth: 4, textAnchor: 'end', dx: -9, dy })),
      Plot.tip(words, Plot.pointer({ x: 'year', y: 'letters', ...tip(t), title: (d) => `${d.year}: ${d.word}\n${d.letters} letters · ${d.champions.join(', ')}` })),
    ],
  }), `Dot chart of winning-word length by year, ${H.first_year}–${H.latest_year}, with a nearly flat trend line.`);
}
table(lenEl, [['Year', (d) => d.year], ['Word', (d) => w(d.word)], ['Letters', (d) => d.letters]], words);

// ---------- 2. rarity ----------------------------------------------------------
const R = F.rarity;
const rarEl = section('rarity', {
  title: 'Winning words have vanished from everyday English',
  caption: `In today’s written English, the typical winning word from ${R.era[0].era} still turns up (median frequency score <b>${R.era[0].median_zipf}</b>). For ${R.era.at(-1).era} the median is <b>${R.era.at(-1).median_zipf}</b>: ${R.era.at(-1).absent_share}% of recent winners never appear in a large modern text sample at all, up from ${R.era[0].absent_share}% before 1960. The last everyday word to win was ${w(R.last_common_word)} in ${R.last_common_year}.`,
  source: 'Frequency: wordfreq (Zipf scale, modern English: 3 ≈ once per million words, 0 = not found). Champions: Wikipedia, cross-checked against history.spellingbee.com.',
});
function drawRarity() {
  const t = theme();
  const eras = R.era.map((e) => { const [a, b] = e.era.split('–').map(Number); return { ...e, a, b }; });
  mount(rarEl, Plot.plot({
    ...baseOpts(t, rarEl), height: 340,
    x: { label: null, tickFormat: 'd' }, y: { label: 'Frequency (Zipf)', grid: true, domain: [-0.3, 5], ticks: [0, 1, 2, 3, 4, 5], tickFormat: (d) => (d === 0 ? 'not found' : d) }, marginLeft: 70,
    marks: [
      Plot.gridY({ stroke: t.grid, strokeOpacity: 1 }),
      Plot.ruleY([3], { stroke: t.muted, strokeDasharray: '2 4' }),
      Plot.text([3], { x: H.latest_year, y: 3, text: () => 'everyday words', textAnchor: 'end', dy: -7, fill: t.muted, fontSize: 11 }),
      Plot.dot(words, { x: 'year', y: 'zipf', r: 4.5, fill: t.s[0], stroke: t.surface, strokeWidth: 1.5 }),
      Plot.link(eras, { x1: 'a', x2: 'b', y1: 'median_zipf', y2: 'median_zipf', stroke: t.s[1], strokeWidth: 3 }),
      Plot.text(eras, { x: (d) => (d.a + d.b) / 2, y: 'median_zipf', text: (d) => `era median ${d.median_zipf}`, dy: -11, fill: t.text, fontSize: 12, fontWeight: 600, stroke: t.surface, strokeWidth: 4 }),
      Plot.tip(words, Plot.pointer({ x: 'year', y: 'zipf', ...tip(t), title: (d) => `${d.year}: ${d.word}\nZipf ${d.zipf}${d.zipf === 0 ? ' (not found)' : ''}` })),
    ],
  }), 'Dot chart of how common each winning word is in modern English, falling over time; era medians drawn as orange lines.');
}
table(rarEl, [['Year', (d) => d.year], ['Word', (d) => w(d.word)], ['Zipf frequency', (d) => d.zipf]], words);

// ---------- 3. ages ------------------------------------------------------------
const A = F.age;
const share1314 = Math.round((100 * ((A.counts[13] ?? 0) + (A.counts[14] ?? 0))) / A.known);
const ageEl = section('ages', {
  title: `Champions are almost always 13 or 14: ${share1314}% of them`,
  caption: `Ages run only from ${A.min} to ${A.max}, and the average has hardly moved (${A.era_means.map((e) => `${e.mean} in ${e.era}`).join(', ')}). Just ${A.youngest.length} champions won at ${A.min}: ${list(A.youngest.map((c) => `${c.name} (${c.year})`))}.`,
  source: 'Ages: history.spellingbee.com champion pages; 2025 and 2026 from news coverage.',
});
function drawAges() {
  const t = theme();
  const data = Object.entries(A.counts).map(([age, n]) => ({ age: +age, n }));
  mount(ageEl, Plot.plot({
    ...baseOpts(t, ageEl), height: 240, marginLeft: 44,
    x: { label: 'Age when they won', type: 'band', padding: 0.25 }, y: { label: 'Champions', grid: true },
    marks: [
      Plot.gridY({ stroke: t.grid, strokeOpacity: 1 }),
      Plot.barY(data, { x: 'age', y: 'n', fill: t.s[0], rx: 4, insetTop: 0 }),
      Plot.text(data, { x: 'age', y: 'n', text: 'n', dy: -8, fill: t.text, fontWeight: 600 }),
      Plot.ruleY([0], { stroke: t.text2 }),
      Plot.tip(data, Plot.pointerX({ x: 'age', y: 'n', ...tip(t), title: (d) => `Age ${d.age}: ${d.n} champions` })),
    ],
  }), `Bar chart of champion ages: ${data.map((d) => `${d.n} at ${d.age}`).join(', ')}.`);
}
table(ageEl, [['Year', (d) => d.year], ['Champion', (d) => d.name], ['Age', (d) => d.age]], champions);

// ---------- 4. region by decade -------------------------------------------------
const G = F.region;
const REGIONS = ['Midwest', 'South', 'Northeast', 'West', 'Outside the 50 states'];
const regEl = section('region', {
  title: 'The Bee’s center of gravity moved from the Midwest to the South',
  caption: `Before 1960, <b>${G.midwest_share_pre1960}%</b> of champions had Midwestern sponsors. Since 2000 it’s <b>${G.midwest_share_2000s}%</b>. Southern sponsors went from ${G.south_share_pre1960}% to ${G.south_share_2000s}%, and Texas alone accounts for ${G.texas_2000s} of the ${G.recent_count} champions since 2000.`,
  source: `${SRC_LIST} Regions are U.S. Census Bureau regions of the sponsor’s location.`,
});
function drawRegion() {
  const t = theme();
  const colors = [t.s[0], t.s[1], t.s[2], t.s[3], t.s[4]];
  legend(regEl, REGIONS.map((r, i) => [r, colors[i]]));
  const data = G.by_decade.filter((d) => d.count > 0);
  mount(regEl, Plot.plot({
    ...baseOpts(t, regEl), height: 320,
    x: { label: null, type: 'band', tickFormat: (d) => `${d}s`, padding: 0.18 },
    y: { label: 'Share of champions (%)', grid: true, domain: [0, 100] },
    color: { domain: REGIONS, range: colors },
    marks: [
      Plot.barY(data, Plot.stackY({ order: REGIONS, x: 'decade', y: 'share', fill: 'region', stroke: t.surface, strokeWidth: 2,
        title: (d) => `${d.decade}s · ${d.region}\n${d.count} champions (${d.share}%)`, tip: tip(t) })),
      Plot.ruleY([0], { stroke: t.text2 }),
    ],
  }), 'Stacked bar chart of champions’ sponsor region by decade; the Midwest share shrinks while the South grows.');
}
table(regEl, [['Decade', (d) => `${d.decade}s`], ['Region', (d) => d.region], ['Champions', (d) => d.count], ['Share', (d) => `${d.share}%`]], G.by_decade.filter((d) => d.count));

// ---------- 5. map --------------------------------------------------------------
const M = F.geography;
const top = M.top_states[0];
const stateName = Object.fromEntries(Object.entries(states).map(([n, c]) => [c, n]));
const mapEl = section('map', {
  title: `${stateName[top.state]} has produced the most champions: ${top.count}`,
  caption: `Champions have come from ${M.states_with_champion} states. Next after ${stateName[top.state]} are ${list(M.top_states.slice(1, 4).map((s) => `${stateName[s.state]} (${s.count})`))}. The most successful single city is ${M.top_cities[0].place.split(',')[0]}, with ${M.top_cities[0].count} champions.`,
  source: `${SRC_LIST} Places are the sponsor’s location, which is usually but not always the champion’s hometown.`,
  note: `Not shown on the U.S. map: ${list(M.outside_us_states.map((c) => `${c.name} (${c.year}, ${c.place})`))}. Circle size is champions per city; state shade is champions per state.`,
});
const stateCount = Object.fromEntries(Object.entries(champions.filter((c) => c.state).reduce((m, c) => ((m[c.state] = (m[c.state] ?? 0) + 1), m), {})));
const nation = topojson.feature(us, us.objects.states);
function drawMapSvg() {
  const t = theme();
  const max = Math.max(...Object.values(stateCount));
  const cities = M.cities.filter((c) => c.lat != null && !M.outside_us_states.some((o) => c.place.startsWith(o.place.split(',')[0])));
  mount(mapEl, Plot.plot({
    width: width(mapEl), projection: 'albers-usa', style: { background: 'transparent', color: t.text2, fontSize: '12px' },
    color: { type: 'linear', domain: [0, max], range: [t.seq[0], t.seq[3]], unknown: t.grid, legend: true, label: 'Champions per state', width: 260 },
    r: { range: [3, 14] },
    marks: [
      Plot.geo(nation.features, { fill: (d) => stateCount[states[d.properties.name]] ?? null, stroke: t.surface, strokeWidth: 1 }),
      Plot.dot(cities, { x: 'lon', y: 'lat', r: 'count', fill: t.s[1], fillOpacity: 0.9, stroke: t.surface, strokeWidth: 1.5 }),
      Plot.tip(cities, Plot.pointer({ x: 'lon', y: 'lat', ...tip(t), title: (d) => `${d.place}\n${d.count} champion${d.count > 1 ? 's' : ''}: ${d.years.join(', ')}` })),
    ],
  }), `Map of the United States shaded by champions per state; ${stateName[top.state]} is darkest.`);
}
table(mapEl, [['Place', (d) => d.place], ['Champions', (d) => d.count], ['Years', (d) => d.years.join(', ')]], M.cities);

// ---------- 6. newspapers -------------------------------------------------------
const N = F.newspapers;
const newsEl = section('newspapers', {
  title: `Newspapers sponsored every champion for ${N.unbroken_newspaper_until - H.first_year + 1} years. Then they disappeared`,
  caption: `Every champion from ${H.first_year} through ${N.unbroken_newspaper_until} was sponsored by a newspaper; the Rocky Mountain News alone produced ${N.rocky_mountain_news}. The streak broke in ${N.first_non_newspaper.year}, when ${N.first_non_newspaper.name} won for ${N.first_non_newspaper.sponsor} of Kingston, Jamaica. The last newspaper-sponsored champion was ${N.last_newspaper.name} (${N.last_newspaper.sponsor}, ${N.last_newspaper.year}). The ${N.since_last_newspaper} champions since have been sponsored by tourism and sports bodies, schools, libraries, regional bees and civic groups.`,
  source: `${SRC_LIST} Sponsor type classified by hand (data/raw/sponsor_types.tsv).`,
});
function drawNews() {
  const t = theme();
  const kinds = ['Newspaper', 'Other sponsor'];
  const colors = [t.s[0], t.s[1]];
  legend(newsEl, kinds.map((k, i) => [k, colors[i]]));
  const data = N.by_decade.flatMap((d) => [
    { decade: d.decade, kind: 'Newspaper', n: d.newspaper, total: d.champions },
    { decade: d.decade, kind: 'Other sponsor', n: d.champions - d.newspaper, total: d.champions },
  ]);
  mount(newsEl, Plot.plot({
    ...baseOpts(t, newsEl), height: 300,
    x: { label: null, type: 'band', tickFormat: (d) => `${d}s`, padding: 0.18 }, y: { label: 'Champions', grid: true },
    color: { domain: kinds, range: colors },
    marks: [
      Plot.barY(data, Plot.stackY({ order: kinds, x: 'decade', y: 'n', fill: 'kind', stroke: t.surface, strokeWidth: 2,
        title: (d) => `${d.decade}s · ${d.kind}\n${d.n} of ${d.total} champions`, tip: tip(t) })),
      Plot.ruleY([0], { stroke: t.text2 }),
      Plot.text(N.by_decade, { x: 'decade', y: 'champions', text: (d) => `${d.share}% news`, dy: -8, fill: t.text2, fontSize: 11 }),
    ],
  }), 'Stacked bar chart of champions by decade, split into newspaper and other sponsors; newspapers fall to zero in the 2020s.');
}
table(newsEl, [['Year', (d) => d.year], ['Champion', (d) => d.name], ['Sponsor', (d) => d.sponsor], ['Type', (d) => d.sponsor_type]], champions);

// ---------- draw + redraw on theme/resize ----------------------------------------
let googleMap = false;
async function drawAll() {
  const draws = [drawLength, drawRarity, drawAges, drawRegion, drawNews, ...(googleMap ? [] : [drawMapSvg])];
  for (const d of draws) {
    try { d(); } catch (err) { console.error(`${d.name} failed`, err); }
  }
}
drawAll();
renderGoogleMap($('.plot.map', mapEl), M.cities.filter((c) => c.lat != null), stateCount).then((ok) => { googleMap = ok; });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawAll);
new MutationObserver(drawAll).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(drawAll, 150); });

initGame({ words, champions });
