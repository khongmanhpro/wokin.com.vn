export const UNIT_WORDS = new Set([
  "vac",
  "mm", "cm", "m", "km", "kg", "kgs", "g", "mg", "l", "ml", "v", "w", "kw", "a", "ah", "mah", "hz", "rpm", "bpm", "min", "bar", "psi", "mpa", "nm", "lb", "lbs", "oz", "hp", "db", "dba", "ft", "awg", "pa",
]);

export const CODE_WORDS = new Set([
  "crv", "cr-v", "cr-mo", "s2", "sk5", "hss", "abs", "pvc", "tpr", "pp", "tpe", "ce", "gs", "din", "iso", "ansi", "sae", "en", "vde", "wokin", "loncin", "lifan", "aaa", "bspt", "aws", "ph", "pz", "tx", "torx", "dr", "sl", "tig",
]);

const SIZE_WORDS = new Set(["xl", "xxl", "s", "m", "l"]);

// Technical loanwords, standards, and material names intentionally retained
// in Vietnamese copy. These are safe globally, unlike unaccented Vietnamese
// words which can collide with ordinary English prose.
export const LOANWORDS = Object.freeze(new Set([
  // Material names and certification marks present in reviewed source specs.
  "eva", "opp", "lithium", "polystyrene", "mid", "type-c", "latex", "ptfe", "pu", "pet", "diesel", "lumen",
  // Source-only unit typo retained in two reviewed router specifications.
  "mim",
  "ac", "acrylic", "bmc", "bpm", "carbon", "carton", "cdi", "cfm", "cb", "cotton", "crmo", "dc", "etl", "hepa", "hcs", "hdpe", "hex", "ii", "iec", "inch", "ipm", "kg", "laser", "lcd", "lb", "led", "li-ion", "mdf", "nh", "nr", "nylon", "od", "oxford", "pa", "pc", "pe",
  "lithium-ion", "npt", "phillips", "poly", "polyester", "polyurethane", "pozidriv", "rpm",
  "satin", "scfm", "sds-plus", "sds-max", "skin", "snr", "tci", "tct", "ul", "usb",
]));

const TECHNICAL_CODE_WORDS = new Set([
  "abs", "ansi", "as/nzs", "ce", "cr-mo", "cr-v", "crv", "din", "en", "gs", "hss", "ip", "iso", "ph", "phillips", "poly", "pozidriv", "pp", "pvc", "pz", "sae", "s2", "scfm", "sds-plus", "sds-max", "sk5", "sl", "tig", "torx", "tpr", "tpe", "tx", "vde",
]);
const PAREN_TECHNICAL_TOKENS = new Set([...UNIT_WORDS, "ft-lb", "inch", ...TECHNICAL_CODE_WORDS]);

const VIETNAMESE_DIACRITIC_RE = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/iu;
const HYBRID_SUFFIX_RE = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ][a-z]*s(?![\p{L}\d])/iu;
const HYBRID_FINAL_CONSONANT_RE = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ][a-z]*[bdfjklqrswxz](?![\p{L}\d])/iu;
// A Greek phi followed directly by a size/code (for example φ3hex) is a
// common source typo. Do not treat full-width punctuation before a normal
// numeric unit (：600ML, ≥100Nm) as a hybrid token.
const GLUED_ENGLISH_CODE_RE = /[φΦ]\d+[a-z]{3,}(?![\p{L}\d])/u;

export function hasVietnameseText(value) {
  return VIETNAMESE_DIACRITIC_RE.test(String(value ?? ""));
}

export function hasHybridToken(value) {
  const source = String(value ?? "");
  return HYBRID_SUFFIX_RE.test(source) || HYBRID_FINAL_CONSONANT_RE.test(source) || GLUED_ENGLISH_CODE_RE.test(source);
}

function normalizeWord(value) {
  return value.toLowerCase().replace(/[‐‑‒–—―]/g, "-");
}

function isNumericPrefix(value, index) {
  return /\d\s*$/.test(value.slice(0, index));
}

function parentheticalRangeAt(source, index) {
  for (const match of source.matchAll(/\(([^)]*)\)/gu)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (index > start && index < end) return { content: match[1], start, end };
  }
  return undefined;
}

function isTechnicalParentheticalToken(token, source, index) {
  const range = parentheticalRangeAt(source, index);
  if (!range) return false;
  const normalized = normalizeWord(token);
  if (PAREN_TECHNICAL_TOKENS.has(normalized)) return true;
  if (/^[a-z]+\d+$/i.test(token)) return true;
  // AS/NZS1716 is tokenized as `AS`, `NZS1716` because `/` separates words.
  // Accept the short prefix only when the complete standards code is present.
  if ((normalized === "as" || normalized === "nzs") && /\bas\/nzs\d+\b/i.test(range.content)) return true;
  return false;
}

function isAllowedToken(token, source, index) {
  const normalized = normalizeWord(token);
  // A denominator in an actual measurement (e.g. 5.5L/min), not prose
  // such as "min speed" or "with/min". Keep the source unit verbatim.
  if (normalized === "min" && /\d\s*(?:[a-z]+[²³]?)?\s*\/\s*$/iu.test(source.slice(0, index))) return true;
  if (isTechnicalParentheticalToken(token, source, index)) return true;
  if (SIZE_WORDS.has(normalized) || CODE_WORDS.has(normalized)) return true;
  if (UNIT_WORDS.has(normalized)) return isNumericPrefix(source, index);
  if (normalized === "in" || normalized === "inch" || normalized === "pc" || normalized === "pcs") return isNumericPrefix(source, index);
  if (normalized === "as" && /\bas\/nzs\d+\b/i.test(source)) return true;
  // Product/model codes are data, not prose: ABC-2, GP20V, M14, 40Cr.
  // Hyphenated tokens need a stricter shape: 2Tx3M-Green is a description,
  // while ABC-2 remains a code. Full material/code allowlist entries above
  // (for example Cr-V) are always accepted.
  if (normalized.includes("-")) {
    const numericUnit = normalized.match(/^\d+(?:-\d+)*([a-z]+)$/i);
    if (numericUnit && UNIT_WORDS.has(numericUnit[1])) return true;
    const dimension = normalized.match(/^\d+(?:-\d+)?x\d+([a-z]+)$/i);
    if (dimension && UNIT_WORDS.has(dimension[1])) return true;
    if (/^[a-z\d]+-\d+$/i.test(token)) return true;
    const parts = normalized.split("-");
    if (parts.length > 1 && parts.every((part) =>
      SIZE_WORDS.has(part) || CODE_WORDS.has(part) || UNIT_WORDS.has(part) || /^(?=.*[a-z])(?=.*\d)[a-z\d]+$/i.test(part)
    )) return true;
    return false;
  }
  if (/^(?=.*[a-z])(?=.*\d)[a-z\d]+$/i.test(token)) return true;
  return false;
}

// Verified Vietnamese words that are intentionally ASCII-only in generated
// copy. This is explicit by design: do not derive it from glossary targets,
// otherwise an English word such as "satin" could be hidden from the audit.
export const VIETNAMESE_ASCII_WORDS = Object.freeze(new Set([
  // Vietnamese words verified in the C1.3 continuation batch.
  "ga", "linh", "titan", "quanh", "quy", "tham", "qua", "song", "gai", "thao", "hay", "lao", "xanh", "puly", "ngay", "xa", "minh", "kia", "cacbua", "silic", "so", "mang", "ray", "thu", "gom", "axetic", "silicone", "khai", "bu", "cacbon", "gang", "xung",
  // Verified Vietnamese words found in reviewed technical copy. Ambiguous
  // collisions (the, in, than, go, may, con, pin, ...) are only ignored when
  // the surrounding string already contains Vietnamese diacritics.
  "an", "anh", "bao", "bugi", "cao", "cam", "che", "chia", "chi", "chiec", "cho", "con", "danh", "dau", "dao",
  "den", "di", "dung", "gian", "go", "hai", "hop", "in", "kho", "khoan", "khi", "khop",
  "khung", "kim", "kinh", "leo", "loai", "lon", "luong", "ly", "may", "men", "mo", "nang",
  "nhanh", "phu", "phe", "phun", "pin", "quang", "quay", "ra", "ram", "ren", "rung",
  "sau", "sac", "sinh", "suat", "tay", "thanh", "than", "the", "theo", "thiet", "thay", "xe",
  "tia", "tiet", "tinh", "treo", "trong", "trung", "tua", "va", "vao", "vi", "xo", "xuat",
  "xi-lanh", "xy-lanh", "sl", "niken", "molypden", "nung",
  // Additional unaccented Vietnamese words used in reviewed C1.3 labels.
  "ba", "ban", "bi", "bo", "chai", "chu", "co", "cong", "da", "gia", "ghim", "khe", "khay", "khu", "keo", "lanh", "loe", "nam", "ngang", "nhau", "ong", "pha", "phay", "phanh", "quan", "sang", "sao", "su", "sung", "tam", "taro", "thau", "then", "tra", "trang", "vai", "van", "vanadi", "berili", "que", "axit", "xi", "xoay",
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

const NUMERIC_UNITS = "kpa|rpm|mAh|pcs?|hp|kw|nm|mm|cm|km|kgs?|mg|ml|hz|psi|bar|ah|nm|lbs?|pounds?|kv|ma|°c|°|v|w|a|g|l|m|min|%";

export function numericTokens(value) {
  const source = String(value ?? "");
  const values = [...source.matchAll(new RegExp(`\\d+(?:[.,]\\d+)?(?:\\/\\d+(?:[.,]\\d+)?)?(?:(?:(?:\\s*|[-,])(?:${NUMERIC_UNITS})(?!\\p{L}))|°|[\"″”′'])?`, "giu"))]
    .map(([token]) => {
      const normalized = token.replace(/\s+/g, "").replace(/[”]/gu, "″").toLowerCase()
        .replace(/[-,](?=(?:kgs?|lbs?|pounds?)$)/u, "")
        .replace(/,(?=[a-z]+$)/u, "")
        .replace(/pounds?$/u, "lb")
        .replace(/kgs?$/u, "kg")
        .replace(/lbs?$/u, "lb");
      return /\d+(?:pcs?)$/i.test(normalized) ? normalized.replace(/pcs?$/i, "") : normalized;
    });
  const codes = [...source.matchAll(/\b(?:m|t|ph|pz|sl|s|n|x)\d+(?:[.,]\d+)?/gi)]
    .map(([token]) => token.toLowerCase());
  return [...values, ...codes];
}

function normalizeTechnicalToken(value) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[“”″′']/g, "")
    .replace(/\s+/g, "");
  if (normalized === "crv" || normalized === "cr-mo") return normalized.replace("cr-mo", "cr-mo");
  if (normalized === "pozi") return "pozidriv";
  if (normalized === "sdsplus") return "sds-plus";
  if (normalized === "sdsmax") return "sds-max";
  return normalized;
}

function technicalTokens(value) {
  const source = String(value ?? "");
  const tokens = new Set();
  const parentheticalRanges = [...source.matchAll(/\(([^)]*)\)/gu)].map((match) => [match.index ?? 0, (match.index ?? 0) + match[0].length]);
  for (const match of source.matchAll(/[A-Za-z][A-Za-z0-9]*(?:[-/][A-Za-z0-9]+)*/gu)) {
    const token = match[0];
    const normalized = normalizeTechnicalToken(token);
    const index = match.index ?? 0;
    const inParentheses = parentheticalRanges.some(([start, end]) => index >= start && index < end);
    // `in-1` is the prose tail of 3-in-1, not a model code. A phrase such
    // as Pounds/454kgs is a written weight conversion, not a technical ID.
    const proseMeasurement = /^in-\d+$/i.test(token)
      || /^[a-z]+\/\d+(?:[.,]\d+)?(?:kgs?|lbs?)$/i.test(token)
      // Fragments such as X60X180CM and M/0-220Lb are respectively a
      // dimension and a torque-range notation, not product/model codes.
      || /^x\d+(?:x\d+)+(?:mm|cm|m)?$/i.test(token)
      || /^[a-z]\/\d+-\d+(?:[a-z]+)?$/i.test(token);
    const codeLike = /[A-Za-z]/.test(token) && /\d/.test(token) && !/^(?:pc|pcs)$/i.test(token) && !proseMeasurement;
    if ((inParentheses && PAREN_TECHNICAL_TOKENS.has(normalized)) || TECHNICAL_CODE_WORDS.has(normalized) || codeLike) tokens.add(normalized);
  }
  return tokens;
}

function technicalTokenPresent(required, actual) {
  if (actual.has(required)) return true;
  if (required === "crv" || required === "cr-v") return actual.has("crv") || actual.has("cr-v");
  if (required === "pozi" || required === "pozidriv") return actual.has("pozi") || actual.has("pozidriv");
  if (required === "sdsplus" || required === "sds-plus") return actual.has("sdsplus") || actual.has("sds-plus");
  if (required === "sdsmax" || required === "sds-max") return actual.has("sdsmax") || actual.has("sds-max");
  if (required === "sl") return actual.has("sl") || actual.has("dẹt");
  return false;
}

export function preservesTechnicalTokens(source, translated) {
  const actual = technicalTokens(translated);
  return [...technicalTokens(source)].every((token) => technicalTokenPresent(token, actual));
}

export function preservesNumericTokens(source, translated) {
  const expected = numericTokens(source);
  const actual = numericTokens(translated);
  const counts = (tokens) => tokens.reduce((map, token) => map.set(token, (map.get(token) ?? 0) + 1), new Map());
  const actualCounts = counts(actual);
  return [...counts(expected)].every(([token, count]) => (actualCounts.get(token) ?? 0) >= count);
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
