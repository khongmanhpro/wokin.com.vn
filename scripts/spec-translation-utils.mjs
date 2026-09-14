const UNIT_WORDS = new Set([
  "mm", "cm", "m", "km", "kg", "g", "mg", "l", "ml", "v", "w", "kw", "a", "ah", "mah", "hz", "rpm", "min", "bar", "psi", "mpa", "nm", "lb", "lbs", "oz", "hp", "db",
]);

const CODE_WORDS = new Set([
  "crv", "cr-v", "cr-mo", "s2", "sk5", "hss", "abs", "pvc", "tpr", "pp", "tpe", "ce", "gs", "din", "iso", "ansi", "sae", "en", "vde", "wokin", "loncin", "ph", "pz", "tx", "torx", "dr",
]);

const SIZE_WORDS = new Set(["xl", "xxl", "s", "m", "l"]);

// Technical loanwords, standards, and material names intentionally retained
// in Vietnamese copy. These are safe globally, unlike unaccented Vietnamese
// words which can collide with ordinary English prose.
export const LOANWORDS = Object.freeze(new Set([
  "ac", "acrylic", "carbon", "carton", "crmo", "dc", "led", "li-ion", "pa", "pc",
  "lithium-ion", "npt", "phillips", "poly", "polyester", "pozidriv", "rpm",
  "satin", "skin", "tct", "torx", "usb",
]));

const VIETNAMESE_DIACRITIC_RE = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/iu;
const HYBRID_SUFFIX_RE = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ][a-z]*s(?![\p{L}\d])/iu;
// A Greek phi followed directly by a size/code (for example φ3hex) is a
// common source typo. Do not treat full-width punctuation before a normal
// numeric unit (：600ML, ≥100Nm) as a hybrid token.
const GLUED_ENGLISH_CODE_RE = /[φΦ]\d+[a-z]{3,}(?![\p{L}\d])/u;

export function hasVietnameseText(value) {
  return VIETNAMESE_DIACRITIC_RE.test(String(value ?? ""));
}

export function hasHybridToken(value) {
  const source = String(value ?? "");
  return HYBRID_SUFFIX_RE.test(source) || GLUED_ENGLISH_CODE_RE.test(source);
}

function normalizeWord(value) {
  return value.toLowerCase().replace(/[‐‑‒–—―]/g, "-");
}

function isNumericPrefix(value, index) {
  return /\d\s*$/.test(value.slice(0, index));
}

function isAllowedToken(token, source, index) {
  const normalized = normalizeWord(token);
  if (SIZE_WORDS.has(normalized) || CODE_WORDS.has(normalized)) return true;
  if (UNIT_WORDS.has(normalized)) return isNumericPrefix(source, index);
  if (normalized === "in" || normalized === "inch" || normalized === "pc" || normalized === "pcs") return isNumericPrefix(source, index);
  // Product/model codes are data, not prose: ABC-2, GP20V, M14, 40Cr.
  // Hyphenated tokens need a stricter shape: 2Tx3M-Green is a description,
  // while ABC-2 remains a code. Full material/code allowlist entries above
  // (for example Cr-V) are always accepted.
  if (normalized.includes("-")) {
    if (/^[a-z\d]+-\d+$/i.test(token)) return true;
    return false;
  }
  if (/^(?=.*[a-z])(?=.*\d)[a-z\d]+$/i.test(token)) return true;
  return false;
}

// Verified Vietnamese words that are intentionally ASCII-only in generated
// copy. This is explicit by design: do not derive it from glossary targets,
// otherwise an English word such as "satin" could be hidden from the audit.
export const VIETNAMESE_ASCII_WORDS = Object.freeze(new Set([
  // Verified Vietnamese words found in reviewed technical copy. Ambiguous
  // collisions (the, in, than, go, may, con, pin, ...) are only ignored when
  // the surrounding string already contains Vietnamese diacritics.
  "an", "bao", "bugi", "cao", "cam", "che", "chia", "chi", "chiec", "cho", "con", "danh", "dau", "dao",
  "den", "di", "dung", "gian", "go", "hai", "hop", "in", "kho", "khoan", "khi", "khop",
  "khung", "kim", "kinh", "leo", "loai", "lon", "luong", "ly", "may", "men", "mo", "nang",
  "nhanh", "phu", "phe", "phun", "pin", "quang", "quay", "ra", "ram", "ren", "rung",
  "sau", "sac", "sinh", "suat", "tay", "thanh", "than", "the", "theo", "thiet", "thay", "xe",
  "tia", "tiet", "tinh", "treo", "trong", "trung", "tua", "va", "vao", "vi", "xo", "xuat",
  "xi-lanh", "xy-lanh", "sl", "niken", "molypden", "nung",
]));

export function englishWordTokens(value, ignoredWords = new Set(), minimumLetters = 2) {
  const source = String(value ?? "");
  const contextualIgnored = new Set(LOANWORDS);
  if (hasVietnameseText(source)) {
    for (const word of VIETNAMESE_ASCII_WORDS) contextualIgnored.add(word);
    for (const word of ignoredWords) contextualIgnored.add(normalizeWord(word));
  }
  const tokens = [];
  for (const match of source.matchAll(/[\p{L}\d]+(?:[-][\p{L}\d]+)*/gu)) {
    const token = match[0];
    // A Vietnamese word may contain short ASCII fragments around a diacritic;
    // only inspect tokens made entirely from ASCII letters/digits/hyphens.
    if (!/^[A-Za-z\d-]+$/.test(token)) continue;
    if (!new RegExp(`[A-Za-z]{${minimumLetters},}`).test(token)) continue;
    if (!isAllowedToken(token, source, match.index ?? 0) && !contextualIgnored.has(normalizeWord(token))) tokens.push(token);
  }
  return tokens;
}

export function needsTranslation(value) {
  return englishWordTokens(value).length > 0;
}

export function normalizeLabelKey(value) {
  return String(value ?? "")
    .replace(/^>\s*/, "")
    .replace(/\s+/g, " ")
    .replace(/:\s*$/, "")
    .trim()
    .toLowerCase();
}

export function parseLabeledSpecLine(value) {
  const normalized = String(value ?? "").replace(/^>\s*/, "").trim();
  const match = normalized.match(/^([^:]+):\s*(.*)$/);
  if (!match) return undefined;
  return {
    label: match[1].trim(),
    labelKey: normalizeLabelKey(match[1]),
    value: match[2].trim(),
  };
}

export function summarizeEnglishRemainder(values, ignoredWords = new Set()) {
  const strings = new Map();
  const words = new Map();
  for (const value of values) {
    const source = String(value ?? "").trim();
    const tokens = englishWordTokens(source, ignoredWords, 3);
    if (!tokens.length) continue;
    const entry = strings.get(source) ?? { occurrences: 0, words: new Set() };
    entry.occurrences += 1;
    for (const token of tokens) {
      const word = normalizeWord(token);
      entry.words.add(word);
      words.set(word, (words.get(word) ?? 0) + 1);
    }
    strings.set(source, entry);
  }
  return {
    unique: strings.size,
    occurrences: [...strings.values()].reduce((total, entry) => total + entry.occurrences, 0),
    topWords: [...words.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "en")).slice(0, 20),
  };
}

export const SPEC_TRANSLATION_ALLOWLIST = Object.freeze({
  units: [...UNIT_WORDS],
  codes: [...CODE_WORDS],
  sizes: [...SIZE_WORDS],
});
