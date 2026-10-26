"""npm run enrich

Adds two offline enrichments to data/processed/words.json:
  * origin  - the language English borrowed the word from, via the `ety`
              package (Etymological Wordnet, de Melo 2014). Words it doesn't
              know fall back to data/raw/etymology_overrides.tsv (each row
              cites a Wiktionary page). Still unknown -> "Unknown", flagged.
  * zipf    - how common the word is in modern English, via `wordfreq`
              (Zipf scale: 0 = not in corpus, 3 = ~1 per million words).
Results are cached in data/cache/enrichment.json.
"""
import csv, json, pathlib, unicodedata

import ety
import wordfreq

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / "data/cache/enrichment.json"
WORDS = ROOT / "data/processed/words.json"
OVERRIDES = ROOT / "data/raw/etymology_overrides.tsv"

# Collapse historical stages into the families readers know.
FAMILY = {
    "Latin": "Latin", "Late Latin": "Latin", "Medieval Latin": "Latin", "New Latin": "Latin",
    "Ancient Greek": "Greek", "Greek": "Greek",
    "French": "French", "Old French": "French", "Middle French": "French", "Anglo-Norman": "French",
    "German": "German", "Middle High German": "German", "Old High German": "German",
    "Italian": "Italian", "Spanish": "Spanish", "Dutch": "Dutch", "Middle Dutch": "Dutch",
    "Yiddish": "Yiddish", "Hebrew": "Hebrew", "Japanese": "Japanese",
    "Old English": "Old/Middle English", "Middle English": "Old/Middle English",
}


def fold(w):
    return "".join(c for c in unicodedata.normalize("NFD", w) if unicodedata.category(c) != "Mn").lower()


def ety_origin(word):
    try:
        origins = ety.origins(fold(word))
    except Exception:
        return None
    for o in origins or []:
        lang = o.language.name
        lang = lang.split(" (")[0]  # "Old French (842-ca. 1400)" -> "Old French"
        if lang != "English":
            return lang, str(o)
    return None


def main():
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    overrides = {}
    if OVERRIDES.exists():
        with OVERRIDES.open() as f:
            for r in csv.DictReader(f, delimiter="\t"):
                overrides[fold(r["word"])] = r
    words = json.loads(WORDS.read_text())
    unknown = []
    for w in words:
        key = fold(w["word"])
        if key not in cache:
            hit = ety_origin(w["word"])
            cache[key] = {"ety": hit[0] if hit else None, "ety_raw": hit[1] if hit else None,
                          "zipf": wordfreq.zipf_frequency(key, "en")}
        c = cache[key]
        src, lang = None, None
        if key in overrides:
            lang, src = overrides[key]["origin"], overrides[key]["source_url"]
        elif c["ety"]:
            lang, src = c["ety"], "Etymological Wordnet (ety)"
        w["origin_raw"] = lang
        w["origin"] = FAMILY.get(lang, lang) if lang else "Unknown"
        w["origin_source"] = src
        w["zipf"] = c["zipf"]
        if not lang:
            unknown.append(w["word"])
    CACHE.write_text(json.dumps(cache, indent=1, ensure_ascii=False) + "\n")
    WORDS.write_text(json.dumps(words, indent=1, ensure_ascii=False) + "\n")
    print(f"enriched {len(words)} words; origin unknown for {len(unknown)}: {', '.join(unknown)}")


if __name__ == "__main__":
    main()
