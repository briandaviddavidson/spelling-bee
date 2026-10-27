// "Can you spell the winner?" — hear a winning word via the browser's speech
// synthesis, type it, and see the champion. No audio files are shipped.
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const RARITY = (z) => (z === 0 ? 'not found in modern English text' : z >= 3 ? 'an everyday word' : z >= 2 ? 'uncommon' : 'rare');

export function initGame({ words, champions }) {
  const $ = (id) => document.getElementById(id);
  const decadeSel = $('g-decade');
  const decades = [...new Set(words.map((w) => w.decade))].sort();
  decadeSel.insertAdjacentHTML('beforeend', decades.map((d) => `<option value="${d}">${d}s</option>`).join(''));

  let current = null, right = 0, tried = 0, revealed = false;
  const canSpeak = 'speechSynthesis' in window;
  if (!canSpeak) $('g-say').textContent = 'Show a hint';

  function pool() {
    const d = decadeSel.value;
    return d === 'all' ? words : words.filter((w) => w.decade === +d);
  }
  function next() {
    const p = pool().filter((w) => w !== current);
    current = p[Math.floor(Math.random() * p.length)] ?? current;
    revealed = false;
    $('g-input').value = '';
    $('g-result').innerHTML = '<span class="meta">Press “Hear the word,” then type your spelling.</span>';
  }
  function say() {
    if (!current) return;
    if (!canSpeak) {
      $('g-result').innerHTML = `<span class="meta">Your browser can’t read words aloud. Hint: it starts with “${current.word[0]}” and won in ${current.year}.</span>`;
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(current.word);
    u.lang = 'en-US';
    u.rate = 0.75;
    speechSynthesis.speak(u);
  }
  function reveal(ok) {
    const champs = champions.filter((c) => c.year === current.year && fold(c.word) === fold(current.word));
    const who = champs.map((c) => `${c.name}, ${c.age}, sponsored from ${c.city}, ${c.region}`).join('; ');
    const origin = current.origin && current.origin !== 'Unknown' ? ` Origin: ${current.origin}.` : '';
    $('g-result').innerHTML = `
      <div class="verdict ${ok ? 'ok' : 'no'}">${ok ? '✓ Correct!' : '✗ Not quite. The winning spelling:'}</div>
      <div class="big">${current.word}</div>
      <div class="meta">${current.year} championship word · ${current.letters} letters · ${RARITY(current.zipf)}.${origin}<br>Won by ${who}.</div>`;
  }
  $('g-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const guess = $('g-input').value;
    if (!guess.trim() || !current) return;
    const ok = fold(guess) === fold(current.word);
    if (!revealed) { tried++; if (ok) right++; revealed = true; }
    $('g-score').textContent = `${right} of ${tried} spelled correctly`;
    reveal(ok);
  });
  $('g-say').addEventListener('click', say);
  $('g-skip').addEventListener('click', () => { next(); say(); });
  $('g-def').addEventListener('click', () => {
    if (current) $('g-result').innerHTML = `<span class="meta">${current.letters} letters, won in ${current.year}.</span>`;
  });
  decadeSel.addEventListener('change', next);
  next();

  const rows = words.map((w) => `<tr><td>${w.year}</td><td><span class="word">${w.word}</span></td><td>${w.letters}</td><td>${w.origin}</td><td>${w.champions.join(', ')}</td></tr>`).join('');
  $('g-table').innerHTML = `<table><thead><tr><th>Year</th><th>Word</th><th>Letters</th><th>Origin</th><th>Champion(s)</th></tr></thead><tbody>${rows}</tbody></table>`;
}
