import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizedSpecText, parseLegacySpec } from "./build-catalog-data.mjs";
import {
  hasHybridToken,
  hasVietnameseText,
  englishWordTokens,
  needsTranslation,
  normalizeLabelKey,
  parseLabeledSpecLine,
  summarizeEnglishRemainder,
  VIETNAMESE_ASCII_WORDS,
} from "./spec-translation-utils.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSourceDir = path.join(projectRoot, "data");
const defaultTranslationFile = path.join(defaultSourceDir, "spec-translations-vi.json");
const defaultGeneratedFile = path.join(projectRoot, "src/data/catalog.generated.json");

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function parseArgs(argv) {
  const options = {
    sourceDir: defaultSourceDir,
    translationFile: defaultTranslationFile,
    generatedFile: defaultGeneratedFile,
    nextBatch: 0,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--source-dir" && value) options.sourceDir = path.resolve(value);
    else if (argument === "--translation-file" && value) options.translationFile = path.resolve(value);
    else if (argument === "--generated-file" && value) options.generatedFile = path.resolve(value);
    else if (argument === "--next-batch" && value && Number.isInteger(Number(value)) && Number(value) > 0) options.nextBatch = Number(value);
    else throw new Error(`Đối số không hợp lệ hoặc thiếu giá trị: ${argument}`);
    index += 1;
  }
  return options;
}

function addOccurrence(map, source, productId) {
  const key = normalizedSpecText(source);
  if (!key) return;
  const entry = map.get(key) ?? { count: 0, productIds: new Set() };
  entry.count += 1;
  entry.productIds.add(productId);
  map.set(key, entry);
}

function sortEntries(entries) {
  return [...entries].sort((left, right) =>
    right.count - left.count || left.source.localeCompare(right.source, "en"),
  );
}

function translationMap(translations, kind) {
  const values = translations?.[kind];
  if (!values || typeof values !== "object" || Array.isArray(values)) return new Map();
  return new Map(Object.entries(values).map(([source, target]) => [normalizedSpecText(source), target]));
}

function labelMap(translations, glossary) {
  return new Map([
    ...Object.entries(glossary?.spec_labels ?? {}),
    ...Object.entries(translations?.labels ?? {}),
  ].map(([source, target]) => [normalizeLabelKey(source), target]));
}

function generatedEnglishRemainder(generatedFile, translations, glossary) {
  if (!existsSync(generatedFile)) return {
    unique: 0,
    occurrences: 0,
    lines: { unique: 0, occurrences: 0 },
    cells: { unique: 0, occurrences: 0 },
    topWords: [],
    hybrid: { unique: 0, occurrences: 0 },
    mixedVietnameseEnglish: { unique: 0, occurrences: 0 },
    vietnamesePcs: { unique: 0, occurrences: 0 },
    autoChiTiet: { unique: 0, occurrences: 0 },
  };
  const snapshot = readJson(generatedFile);
  const lineValues = [];
  const cellValues = [];
  for (const product of snapshot.products ?? []) {
    lineValues.push(...(product.technicalSpecs?.lines ?? []));
    for (const row of product.packaging?.table ?? []) cellValues.push(...row);
  }
  const ignoredWords = VIETNAMESE_ASCII_WORDS;
  const lines = summarizeEnglishRemainder(lineValues, ignoredWords);
  const cells = summarizeEnglishRemainder(cellValues, ignoredWords);
  const total = summarizeEnglishRemainder([...lineValues, ...cellValues], ignoredWords);
  const dictionaryTargets = new Set([
    ...Object.values(translations?.lines ?? {}),
    ...Object.values(translations?.labels ?? {}),
    ...Object.values(translations?.cells ?? {}),
  ].map((value) => String(value).trim()));
  const summarizeQuality = (predicate) => {
    const counts = new Map();
    for (const value of [...lineValues, ...cellValues]) {
      const source = String(value ?? "").trim();
      if (!predicate(source)) continue;
      counts.set(source, (counts.get(source) ?? 0) + 1);
    }
    return { unique: counts.size, occurrences: [...counts.values()].reduce((sum, count) => sum + count, 0) };
  };
  return {
    ...total,
    lines: { unique: lines.unique, occurrences: lines.occurrences },
    cells: { unique: cells.unique, occurrences: cells.occurrences },
    hybrid: summarizeQuality((value) => hasVietnameseText(value) && hasHybridToken(value)),
    mixedVietnameseEnglish: summarizeQuality((value) => hasVietnameseText(value) && englishWordTokens(value, new Set(), 3).length > 0),
    vietnamesePcs: summarizeQuality((value) => hasVietnameseText(value) && /\d\s?pcs?\b/i.test(value)),
    autoChiTiet: summarizeQuality((value) => /\b\d+\s+chi tiết\b/i.test(value) && !dictionaryTargets.has(value)),
  };
}

function statusForLine(source, lineTranslations, labels) {
  const reviewed = typeof lineTranslations.get(source) === "string" && lineTranslations.get(source).trim().length > 0;
  const labeled = parseLabeledSpecLine(source);
  const labelApplicable = Boolean(labeled && !needsTranslation(labeled.value) && !/\d\s?pcs?\b/i.test(labeled.value));
  const labelTranslated = Boolean(labelApplicable && labels.get(labeled.labelKey));
  const notNeeded = !needsTranslation(source);
  return {
    labelKey: labelApplicable ? labeled.labelKey : undefined,
    labelTranslated,
    notNeeded,
    translated: !notNeeded && (reviewed || labelTranslated),
  };
}

function summarize(entries) {
  return {
    unique: entries.length,
    translated: entries.filter((entry) => entry.translated).length,
    notNeeded: entries.filter((entry) => entry.notNeeded).length,
    missing: entries.filter((entry) => !entry.translated && !entry.notNeeded).length,
    occurrences: entries.reduce((total, entry) => total + entry.count, 0),
  };
}

export function collectSpecTranslationInventory({
  sourceDir = defaultSourceDir,
  translationFile = defaultTranslationFile,
  generatedFile = defaultGeneratedFile,
} = {}) {
  const products = readJson(path.join(sourceDir, "products.json"));
  const translations = existsSync(translationFile) ? readJson(translationFile) : {};
  const glossaryFile = path.join(sourceDir, "vi-glossary.json");
  const glossary = existsSync(glossaryFile) ? readJson(glossaryFile) : {};
  const lines = new Map();
  const cells = new Map();
  const parserErrors = [];

  for (const product of products) {
    const parsed = parseLegacySpec(product.short_description ?? "");
    for (const error of parsed.parserErrors) parserErrors.push(`product ${product.id}: ${error}`);
    for (const line of parsed.lines) addOccurrence(lines, line, product.id);
    for (const row of parsed.table) {
      for (const cell of row) {
        // Keep historical inventory scope focused on cells containing letters;
        // pure quantity cells still remain data but need no language work.
        if (/[A-Za-z]{2,}/.test(normalizedSpecText(cell))) addOccurrence(cells, cell, product.id);
      }
    }
  }

  const lineTranslations = translationMap(translations, "lines");
  const cellTranslations = translationMap(translations, "cells");
  const labels = labelMap(translations, glossary);
  const lineEntries = sortEntries([...lines].map(([source, entry]) => ({
    ...statusForLine(source, lineTranslations, labels),
    count: entry.count,
    kind: "line",
    productCount: entry.productIds.size,
    source,
  })));
  const cellEntries = sortEntries([...cells].map(([source, entry]) => {
    const reviewed = typeof cellTranslations.get(source) === "string" && cellTranslations.get(source).trim().length > 0;
    const notNeeded = !needsTranslation(source);
    return {
      count: entry.count,
      kind: "cell",
      notNeeded,
      productCount: entry.productIds.size,
      source,
      translated: !notNeeded && reviewed,
    };
  }));

  const missingLabels = new Map();
  for (const entry of lineEntries) {
    if (!entry.labelKey || entry.labelTranslated || entry.translated || entry.notNeeded) continue;
    const aggregate = missingLabels.get(entry.labelKey) ?? { count: 0, productCount: 0 };
    aggregate.count += entry.count;
    aggregate.productCount = Math.max(aggregate.productCount, entry.productCount);
    missingLabels.set(entry.labelKey, aggregate);
  }
  const labelEntries = sortEntries([...missingLabels].map(([source, entry]) => ({
    count: entry.count,
    kind: "label",
    productCount: entry.productCount,
    source,
    translated: false,
    notNeeded: false,
  })));
  const missingLines = lineEntries.filter((entry) => !entry.translated && !entry.notNeeded && !entry.labelKey);
  const missingCells = cellEntries.filter((entry) => !entry.translated && !entry.notNeeded);
  const allMissing = [
    ...labelEntries,
    ...sortEntries(missingLines),
    ...sortEntries(missingCells),
  ];
  const generatedRemainder = generatedEnglishRemainder(generatedFile, translations, glossary);

  return {
    cells: cellEntries,
    lines: lineEntries,
    missing: allMissing,
    parserErrors,
    summary: {
      cells: summarize(cellEntries),
      lines: summarize(lineEntries),
      total: summarize([...lineEntries, ...cellEntries]),
      labels: { unique: labels.size, missing: labelEntries.length },
      remainingEnglish: generatedRemainder,
      remainingEnglishLines: generatedRemainder,
    },
  };
}

function printEntry(entry, index) {
  return `${index + 1}. [${entry.kind}] x${entry.count} (${entry.productCount} SP) ${entry.source}`;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const inventory = collectSpecTranslationInventory(options);
  for (const error of inventory.parserErrors) console.error(`ERROR: ${error}`);
  const { lines, cells, total } = inventory.summary;
  console.log(`Spec inventory: ${total.unique} chuỗi nguồn không trùng (${lines.unique} dòng, ${cells.unique} ô bảng); ${total.translated} đã dịch, ${total.notNeeded} không cần dịch, ${total.missing} còn thiếu.`);
  console.log(`Occurrences: ${total.occurrences} (${lines.occurrences} dòng, ${cells.occurrences} ô bảng).`);
  console.log(`Missing: ${lines.missing} dòng, ${cells.missing} ô bảng; ${inventory.summary.labels.missing} nhãn.`);
  console.log(`English remainder trên generated: ${inventory.summary.remainingEnglish.unique} chuỗi (${inventory.summary.remainingEnglish.occurrences} occurrences; dòng ${inventory.summary.remainingEnglish.lines.unique}/${inventory.summary.remainingEnglish.lines.occurrences}, ô ${inventory.summary.remainingEnglish.cells.unique}/${inventory.summary.remainingEnglish.cells.occurrences}).`);
  console.log(`Quality gate generated: câu lai có dấu ${inventory.summary.remainingEnglish.hybrid.unique}/${inventory.summary.remainingEnglish.hybrid.occurrences}, câu Việt trộn English ngoài allowlist ${inventory.summary.remainingEnglish.mixedVietnameseEnglish.unique}/${inventory.summary.remainingEnglish.mixedVietnameseEnglish.occurrences}, câu tiếng Việt còn N pcs ${inventory.summary.remainingEnglish.vietnamesePcs.unique}/${inventory.summary.remainingEnglish.vietnamesePcs.occurrences}, N chi tiết tự động ngoài từ điển ${inventory.summary.remainingEnglish.autoChiTiet.unique}/${inventory.summary.remainingEnglish.autoChiTiet.occurrences}.`);
  if (inventory.summary.remainingEnglish.topWords.length) {
    console.log(`Top English remainder: ${inventory.summary.remainingEnglish.topWords.map(([word, count]) => `${word}(${count})`).join(", ")}`);
  }
  if (options.nextBatch > 0) {
    console.log(`Next batch (${Math.min(options.nextBatch, inventory.missing.length)}):`);
    for (const [index, entry] of inventory.missing.slice(0, options.nextBatch).entries()) console.log(printEntry(entry, index));
  } else {
    console.log("Top missing:");
    for (const [index, entry] of inventory.missing.slice(0, 20).entries()) console.log(printEntry(entry, index));
  }
  if (inventory.parserErrors.length) process.exitCode = 1;
  return inventory;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
