import fs from 'node:fs';

export function readTsv(file) {
  const [head, ...lines] = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
  const cols = head.split('\t');
  return lines.map((l) => {
    const v = l.split('\t');
    return Object.fromEntries(cols.map((c, i) => [c, (v[i] ?? '').trim()]));
  });
}

export const writeJson = (file, obj) => fs.writeFileSync(file, JSON.stringify(obj, null, 1) + '\n');

// Lowercase, strip accents and punctuation — used for matching and letter counts.
export const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const letters = (w) => fold(w).replace(/[^a-z]/g, '');

const SUFFIX = /^(jr|sr|ii|iii|iv)$/i;
export function surname(name) {
  const parts = fold(name).replace(/[.,]/g, '').split(/\s+/).filter((p) => !SUFFIX.test(p));
  return parts.at(-1);
}
