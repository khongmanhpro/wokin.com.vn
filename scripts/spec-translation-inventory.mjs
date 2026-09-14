import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizedSpecText, parseLegacySpec } from "./build-catalog-data.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSourceDir = path.join(projectRoot, "data");
const defaultTranslationFile = path.join(defaultSourceDir, "spec-translations-vi.json");
const commonEnglishRemainder = /\b(?:and|with|for|from|into|only|not|included|material|steel|iron|aluminum|handle|packing|size|speed|design|motor|control|suitable|surface|blade|cutting|voltage|power|length|diameter|approval|soft|start|blowing|volume|dust|bag|variable|switch|makes|can|will|color|box|chrome|finish|made|high|quality|plastic|rubber|packed|feature|features)\b/i;

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function parseArgs(argv) {
  const options = {
    sourceDir: defaultSourceDir,
    translationFile: defaultTranslationFile,
    nextBatch: 0,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--source-dir" && value) options.sourceDir = path.resolve(value);
    else if (argument === "--translation-file" && value) options.translationFile = path.resolve(value);
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

function hasLetters(value) {
  // Source tables contain many numeric measurements (20V, 90mm) and stock
  // quantities. A translation is only needed when a cell has a real word/code
  // token, matching the project inventory definition of "có chữ".
  return /[A-Za-z]{2,}/.test(value);
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

export function collectSpecTranslationInventory({
  sourceDir = defaultSourceDir,
  translationFile = defaultTranslationFile,
} = {}) {
  const products = readJson(path.join(sourceDir, "products.json"));
  const translations = existsSync(translationFile) ? readJson(translationFile) : {};
  const lines = new Map();
  const cells = new Map();
  const parserErrors = [];

  for (const product of products) {
    const parsed = parseLegacySpec(product.short_description ?? "");
    for (const error of parsed.parserErrors) parserErrors.push(`product ${product.id}: ${error}`);
    for (const line of parsed.lines) addOccurrence(lines, line, product.id);
    for (const row of parsed.table) {
      for (const cell of row) {
        if (hasLetters(normalizedSpecText(cell))) addOccurrence(cells, cell, product.id);
      }
    }
  }

  const lineTranslations = translationMap(translations, "lines");
  const cellTranslations = translationMap(translations, "cells");
  const lineEntries = sortEntries([...lines].map(([source, entry]) => ({
    count: entry.count,
    kind: "line",
    productCount: entry.productIds.size,
    source,
    translated: typeof lineTranslations.get(source) === "string" && lineTranslations.get(source).trim().length > 0,
  })));
  const cellEntries = sortEntries([...cells].map(([source, entry]) => ({
    count: entry.count,
    kind: "cell",
    productCount: entry.productIds.size,
    source,
    translated: typeof cellTranslations.get(source) === "string" && cellTranslations.get(source).trim().length > 0,
  })));
  const allMissing = [...lineEntries, ...cellEntries]
    .filter((entry) => !entry.translated)
    .sort((left, right) => right.count - left.count || left.kind.localeCompare(right.kind) || left.source.localeCompare(right.source, "en"));
  const remainingEnglishLines = lineEntries.filter((entry) => !entry.translated && commonEnglishRemainder.test(entry.source));

  const summarize = (entries) => ({
    unique: entries.length,
    translated: entries.filter((entry) => entry.translated).length,
    missing: entries.filter((entry) => !entry.translated).length,
    occurrences: entries.reduce((total, entry) => total + entry.count, 0),
  });

  return {
    cells: cellEntries,
    lines: lineEntries,
    missing: allMissing,
    parserErrors,
    summary: {
      cells: summarize(cellEntries),
      lines: summarize(lineEntries),
      total: summarize([...lineEntries, ...cellEntries]),
      remainingEnglishLines: {
        unique: remainingEnglishLines.length,
        occurrences: remainingEnglishLines.reduce((total, entry) => total + entry.count, 0),
      },
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
  console.log(`Spec inventory: ${total.unique} chuỗi nguồn không trùng (${lines.unique} dòng, ${cells.unique} ô bảng); ${total.translated} đã dịch; ${total.missing} còn thiếu.`);
  console.log(`Occurrences: ${total.occurrences} (${lines.occurrences} dòng, ${cells.occurrences} ô bảng).`);
  console.log(`Missing: ${lines.missing} dòng, ${cells.missing} ô bảng.`);
  console.log(`English remainder: ${inventory.summary.remainingEnglishLines.unique} chuỗi dòng (${inventory.summary.remainingEnglishLines.occurrences} occurrences).`);
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
