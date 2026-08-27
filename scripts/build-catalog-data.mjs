import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_SOURCE_DIR = path.join(projectRoot, "data");
const DEFAULT_OUTPUT_DIR = path.join(projectRoot, "src/data");
const DEFAULT_PUBLIC_DIR = path.join(projectRoot, "public");
const SCHEMA_VERSION = 1;

const SOURCE_FILES = Object.freeze([
  "catalog-baseline.json",
  "categories.json",
  "image_manifest.json",
  "product_dates.json",
  "products.json",
  "products_vi.json",
  "vi-glossary.json",
]);

const OBSOLETE_GENERATED_FILES = Object.freeze([
  "image_manifest.json",
  "product_dates.json",
  "products.json",
]);

const namedEntities = Object.freeze({
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
});

const blockedSpecElements = new Set(["iframe", "script", "style"]);
const forbiddenRuntimeText = /\b(?:www\.)?wokintools\.com\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const englishRemainder = /\b(?:and|with|for|from|into|only|not|included|material|steel|iron|aluminum|handle|packing|size|speed|design|motor|control|suitable|surface|blade|cutting|voltage|power|length|diameter|approval|soft|start|blowing|volume|dust|bag|variable|switch|makes|can|will|color|box|chrome|finish|made|high|quality|plastic|rubber|packed|feature|features)\b/i;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((key) => [key, stableValue(value[key])]),
  );
}

function stableJson(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function readJson(sourceDir, name, errors) {
  const file = path.join(sourceDir, name);
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`${name}: không đọc được JSON (${error.message}).`);
    return null;
  }
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function decodeHtmlEntities(value) {
  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z][\da-z]+));/gi, (entity, decimal, hex, named) => {
    if (named) return namedEntities[named.toLowerCase()] ?? entity;
    const codePoint = Number.parseInt(decimal ?? hex, decimal ? 10 : 16);
    if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return "�";
    return String.fromCodePoint(codePoint);
  });
}

function normalizedSpecText(value) {
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}

function tagEnd(html, start) {
  let quote = "";
  for (let index = start + 1; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (character === quote) quote = "";
    } else if (character === '"' || character === "'") quote = character;
    else if (character === ">") return index;
  }
  return -1;
}

function tagName(rawTag) {
  const value = rawTag.trim();
  if (!value || value[0] === "!" || value[0] === "?") return undefined;
  const closing = value[0] === "/";
  let index = closing ? 1 : 0;
  while (index < value.length && /\s/.test(value[index])) index += 1;
  const start = index;
  while (index < value.length && /[a-z0-9:-]/i.test(value[index])) index += 1;
  if (start === index) return undefined;
  return { closing, name: value.slice(start, index).toLowerCase(), selfClosing: value.endsWith("/") };
}

function parseLegacySpec(html) {
  const lines = [];
  const table = [];
  const parserErrors = [];
  let lineBuffer = "";
  let currentRow;
  let currentCell;
  let tableDepth = 0;
  let blockedElement = "";
  let blockedDepth = 0;

  const finishLine = () => {
    const line = normalizedSpecText(lineBuffer);
    lineBuffer = "";
    if (line) lines.push(line);
  };
  const finishCell = () => {
    if (currentCell === undefined || !currentRow) return;
    currentRow.push(normalizedSpecText(currentCell));
    currentCell = undefined;
  };
  const finishRow = () => {
    finishCell();
    if (currentRow?.some(Boolean)) table.push(currentRow);
    currentRow = undefined;
  };
  const appendText = (text) => {
    if (blockedElement) return;
    if (currentCell !== undefined) currentCell += text;
    else if (tableDepth === 0) lineBuffer += text;
  };

  for (let index = 0; index < html.length;) {
    if (html.startsWith("<!--", index)) {
      const commentEnd = html.indexOf("-->", index + 4);
      if (commentEnd === -1) parserErrors.push("HTML comment is not closed");
      index = commentEnd === -1 ? html.length : commentEnd + 3;
      continue;
    }
    if (html[index] !== "<") {
      const nextTag = html.indexOf("<", index);
      const end = nextTag === -1 ? html.length : nextTag;
      appendText(html.slice(index, end));
      index = end;
      continue;
    }
    const end = tagEnd(html, index);
    if (end === -1) {
      parserErrors.push(`HTML tag is not closed at offset ${index}`);
      break;
    }
    const tag = tagName(html.slice(index + 1, end));
    index = end + 1;
    if (!tag) continue;

    if (blockedElement) {
      if (tag.name === blockedElement) {
        if (tag.closing) blockedDepth -= 1;
        else if (!tag.selfClosing) blockedDepth += 1;
        if (blockedDepth === 0) blockedElement = "";
      }
      continue;
    }
    if (!tag.closing && blockedSpecElements.has(tag.name)) {
      if (!tag.selfClosing) {
        blockedElement = tag.name;
        blockedDepth = 1;
      }
      continue;
    }
    if (!tag.closing) {
      if (tag.name === "br") {
        if (currentCell !== undefined) currentCell += " ";
        else finishLine();
      } else if (tag.name === "table") {
        finishLine();
        tableDepth += 1;
      } else if (tag.name === "tr" && tableDepth > 0) {
        finishRow();
        currentRow = [];
      } else if ((tag.name === "td" || tag.name === "th") && tableDepth > 0) {
        finishCell();
        if (!currentRow) currentRow = [];
        currentCell = "";
      }
    } else if (tag.name === "td" || tag.name === "th") finishCell();
    else if (tag.name === "tr") finishRow();
    else if (tag.name === "table") {
      finishRow();
      tableDepth = Math.max(0, tableDepth - 1);
    } else if ((tag.name === "p" || tag.name === "div") && tableDepth === 0) finishLine();
  }

  finishRow();
  finishLine();
  if (blockedElement) parserErrors.push(`blocked element <${blockedElement}> is not closed`);
  if (tableDepth !== 0) parserErrors.push("table element is not balanced");
  return { lines, table, parserErrors };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createTranslator(glossary) {
  const terms = [...glossary.terms].sort((left, right) => right[0].length - left[0].length);
  const specLabels = Object.entries(glossary.spec_labels).sort((left, right) => right[0].length - left[0].length);
  const translateText = (text) => {
    let output = text
      .replace(/STOCK NO\./gi, glossary.ui["STOCK NO."])
      .replace(/QTY\.\/CARTON/gi, glossary.ui["QTY./CARTON"])
      .replace(/Brushless Motor/gi, "Động cơ không chổi than")
      .replace(/CE approval/gi, "Chứng nhận CE")
      .replace(/Soft start/gi, "Khởi động êm")
      .replace(/variable speed/gi, "điều tốc")
      .replace(/Blowing Speed/gi, "Tốc độ thổi")
      .replace(/Blowing Volume/gi, "Lưu lượng thổi")
      .replace(/3-Speed control for versatility to switch/gi, "Điều khiển 3 cấp tốc độ linh hoạt")
      .replace(/Folding handle design; 2-in-1 design makes blower &amp; vacuum can be switched at will/gi, "Tay cầm gập; thiết kế 2 trong 1 cho phép chuyển đổi chế độ thổi và hút")
      .replace(/With (\d+)pc dust bag/gi, "Kèm $1 túi chứa bụi")
      .replace(/Tool Only: Battery and Charger not included/gi, "Chỉ thân máy: không kèm pin và bộ sạc");
    for (const [source, target] of specLabels) output = output.replace(new RegExp(escapeRegExp(source), "gi"), target);
    for (const [source, target] of terms) output = output.replace(new RegExp(escapeRegExp(source), "gi"), target);
    return output
      .replace(/Brushless Motor/gi, "Động cơ không chổi than")
      .replace(/CE approval/gi, "Chứng nhận CE")
      .replace(/Soft start/gi, "Khởi động êm")
      .replace(/variable speed/gi, "điều tốc")
      .replace(/Blowing Speed/gi, "Tốc độ thổi")
      .replace(/Blowing Volume/gi, "Lưu lượng thổi")
      .replace(/3-Speed control for versatility to switch/gi, "Điều khiển 3 cấp tốc độ linh hoạt")
      .replace(/Folding handle design; 2-in-1 design makes (?:blower|máy thổi) &amp; vacuum can be switched at will/gi, "Tay cầm gập; thiết kế 2 trong 1 cho phép chuyển đổi chế độ thổi và hút")
      .replace(/With (\d+)pc dust bag/gi, "Kèm $1 túi chứa bụi")
      .replace(/Tool Only/gi, "Chỉ thân máy")
      .replace(/(?:Battery|Pin) and Charger not included/gi, "không kèm pin và bộ sạc")
      .replace(/color box/gi, "hộp màu")
      .replace(/\bSIZE\b/gi, "KÍCH THƯỚC")
      .replace(/\bTANK\b/gi, "BÌNH CHỨA")
      .replace(/\bMAX\. RPM\b/gi, "VÒNG\/PHÚT TỐI ĐA")
      .replace(/With (\d+)pc/gi, "Kèm $1 chi tiết");
  };
  const metricSummary = (text) => {
    const metrics = text.match(/\d+(?:[.,/×x*–-]\d+)*(?:\s?(?:V|W|kW|Hz|rpm|N[.·]?m|mm|cm|m|kg|g|L|min|bar|psi|A|Ah|mAh|°C|°|%|pcs?))?/gi) ?? [];
    return [...new Set(metrics)].join(" · ");
  };
  const translateSpecLine = (rawLine) => {
    const raw = rawLine.trim();
    if (!raw) return "";
    const translated = translateText(raw);
    if (!englishRemainder.test(translated)) return translated.replace(/^>\s*/, "> ");
    const metrics = metricSummary(raw);
    const [rawLabel] = raw.replace(/^>\s*/, "").split(":", 1);
    const translatedLabel = translateText(rawLabel).trim();
    const label = englishRemainder.test(translatedLabel) || translatedLabel === rawLabel
      ? (raw.includes(":") ? "Thông số kỹ thuật" : "Đặc tính kỹ thuật")
      : translatedLabel;
    return `> ${label}${metrics ? `: ${metrics}` : ""}`;
  };
  return { translateSpecLine, translateText };
}

function canonicalSlugChecksum(translations) {
  const lines = [...translations]
    .sort((left, right) => left.id - right.id)
    .map((entry) => `${entry.id}|${entry.slug_vi}`)
    .join("\n");
  return sha256(`${lines}\n`);
}

function sameNumberSet(actual, expected) {
  return actual.size === expected.size && [...actual].every((value) => expected.has(value));
}

function validateAndNormalize({ sourceDir, publicDir }) {
  const errors = [];
  const baseline = readJson(sourceDir, "catalog-baseline.json", errors);
  const categories = readJson(sourceDir, "categories.json", errors);
  const manifest = readJson(sourceDir, "image_manifest.json", errors);
  const dates = readJson(sourceDir, "product_dates.json", errors);
  const products = readJson(sourceDir, "products.json", errors);
  const translations = readJson(sourceDir, "products_vi.json", errors);
  const glossary = readJson(sourceDir, "vi-glossary.json", errors);
  if (errors.length) throw new Error(errors.join("\n"));
  if (!baseline || baseline.schemaVersion !== SCHEMA_VERSION) errors.push("catalog-baseline.json: schemaVersion phải là 1.");
  if (![categories, dates, products, translations].every(Array.isArray)) errors.push("Canonical arrays are malformed.");
  if (!manifest || Array.isArray(manifest) || typeof manifest !== "object") errors.push("image_manifest.json: root phải là object.");
  if (!glossary || typeof glossary !== "object" || Array.isArray(glossary)) errors.push("vi-glossary.json: root phải là object.");
  if (errors.length) throw new Error(errors.join("\n"));

  const expected = baseline.expected ?? {};
  if (products.length !== expected.products) errors.push(`products.json: count ${products.length}; expected ${expected.products}.`);
  if (categories.length !== expected.categories) errors.push(`categories.json: count ${categories.length}; expected ${expected.categories}.`);
  if (translations.length !== products.length) errors.push(`products_vi.json: count ${translations.length}; expected ${products.length}.`);
  if (dates.length !== products.length) errors.push(`product_dates.json: count ${dates.length}; expected ${products.length}.`);
  if (Object.keys(manifest).length !== products.length) errors.push(`image_manifest.json: entries ${Object.keys(manifest).length}; expected ${products.length}.`);

  const actualSlugChecksum = canonicalSlugChecksum(translations);
  if (actualSlugChecksum !== expected.canonicalSlugSha256) errors.push(`products_vi.json: canonical slug checksum ${actualSlugChecksum}; expected ${expected.canonicalSlugSha256}. Slug changes require a reviewed mapping.`);

  const categoryBySlug = new Map();
  const categoryIds = new Set();
  for (const category of categories) {
    if (!Number.isInteger(category?.id) || !nonEmptyString(category?.name) || !nonEmptyString(category?.slug) || !Number.isInteger(category?.count) || !Number.isInteger(category?.parent)) {
      errors.push(`categories.json: malformed category ${JSON.stringify(category)}.`);
      continue;
    }
    if (categoryIds.has(category.id)) errors.push(`categories.json: duplicate legacy source ID ${category.id}.`);
    if (categoryBySlug.has(category.slug)) errors.push(`categories.json: duplicate slug ${category.slug}.`);
    categoryIds.add(category.id);
    categoryBySlug.set(category.slug, category);
  }
  for (const category of categories) if (category.parent !== 0 && !categoryIds.has(category.parent)) errors.push(`categories.json: ${category.slug} references missing parent ${category.parent}.`);

  const translationById = new Map();
  const canonicalSlugs = new Set();
  for (const translation of translations) {
    if (!Number.isInteger(translation?.id) || !nonEmptyString(translation?.name_en) || !nonEmptyString(translation?.name_vi) || !nonEmptyString(translation?.slug_vi) || typeof translation?.sku !== "string") {
      errors.push(`products_vi.json: malformed translation for legacy ID ${translation?.id ?? "unknown"}.`);
      continue;
    }
    if (translationById.has(translation.id)) errors.push(`products_vi.json: duplicate legacy ID ${translation.id}.`);
    if (canonicalSlugs.has(translation.slug_vi)) errors.push(`products_vi.json: duplicate canonical slug ${translation.slug_vi}.`);
    translationById.set(translation.id, translation);
    canonicalSlugs.add(translation.slug_vi);
  }

  const dateById = new Map();
  for (const entry of dates) {
    if (!Number.isInteger(entry?.id) || !nonEmptyString(entry?.date) || !nonEmptyString(entry?.slug)) errors.push(`product_dates.json: malformed record for legacy ID ${entry?.id ?? "unknown"}.`);
    else if (dateById.has(entry.id)) errors.push(`product_dates.json: duplicate legacy ID ${entry.id}.`);
    else dateById.set(entry.id, entry);
  }

  const productIds = new Set();
  const legacySlugs = new Set();
  const productsByCode = new Map();
  const missingCodeIds = new Set();
  const categoryCounts = new Map();
  const normalizedProducts = [];
  const { translateSpecLine, translateText } = createTranslator(glossary);
  let localImageReferences = 0;

  for (const product of products) {
    const recordLabel = `products.json: product legacy ID ${product?.id ?? "unknown"}`;
    if (!Number.isInteger(product?.id) || !nonEmptyString(product?.name) || !nonEmptyString(product?.slug) || typeof product?.sku !== "string" || !nonEmptyString(product?.type) || !Array.isArray(product?.categories) || product.categories.length === 0 || !Array.isArray(product?.images) || product.images.length === 0 || !nonEmptyString(product?.short_description) || typeof product?.description !== "string" || !Array.isArray(product?.attributes)) {
      errors.push(`${recordLabel}: malformed or missing required field.`);
      continue;
    }
    if (productIds.has(product.id)) errors.push(`${recordLabel}: duplicate legacy source ID.`);
    if (legacySlugs.has(product.slug)) errors.push(`${recordLabel}: duplicate legacy slug ${product.slug}.`);
    productIds.add(product.id);
    legacySlugs.add(product.slug);

    const translation = translationById.get(product.id);
    const date = dateById.get(product.id);
    const mediaEntry = manifest[product.slug];
    if (!translation) errors.push(`${recordLabel}: missing translation record.`);
    else {
      if (translation.sku !== product.sku) errors.push(`${recordLabel}: translation product code mismatch.`);
      if (translation.name_en !== product.name) errors.push(`${recordLabel}: translation source name mismatch.`);
    }
    if (!date) errors.push(`${recordLabel}: missing product date record.`);
    else if (date.slug !== product.slug) errors.push(`${recordLabel}: product date slug mismatch.`);
    if (!mediaEntry || !Array.isArray(mediaEntry.images) || mediaEntry.images.length === 0) errors.push(`${recordLabel}: missing local media manifest entry.`);

    const code = product.sku.trim();
    if (code) productsByCode.set(code, [...(productsByCode.get(code) ?? []), product.id]);
    else missingCodeIds.add(product.id);

    const categoryRelations = [];
    for (const reference of product.categories) {
      const category = categoryBySlug.get(reference?.slug);
      if (!category) errors.push(`${recordLabel}: category relation ${reference?.slug ?? "unknown"} does not exist.`);
      else {
        categoryRelations.push({
          categoryInternalId: `category:${category.id}`,
          legacySourceId: category.id,
          name: category.name,
          slug: category.slug,
        });
        categoryCounts.set(category.slug, (categoryCounts.get(category.slug) ?? 0) + 1);
      }
    }

    const parsed = parseLegacySpec(product.short_description);
    for (const parserError of parsed.parserErrors) errors.push(`${recordLabel}: technical spec parse failed (${parserError}).`);
    if (parsed.lines.length === 0 && parsed.table.length === 0) errors.push(`${recordLabel}: technical spec parse produced no structured content; source content must not be silently dropped.`);
    if (/<table\b/i.test(product.short_description) && parsed.table.length === 0) errors.push(`${recordLabel}: packaging table parse produced no rows; source content must not be silently dropped.`);
    if (parsed.table.some((row) => row.length === 0)) errors.push(`${recordLabel}: packaging table contains an empty row.`);

    const media = [];
    if (mediaEntry?.images) {
      const expectedImageKey = code || product.slug;
      if (mediaEntry.sku !== expectedImageKey) errors.push(`${recordLabel}: media key ${mediaEntry.sku}; expected ${expectedImageKey}.`);
      for (let position = 0; position < mediaEntry.images.length; position += 1) {
        const image = mediaEntry.images[position];
        localImageReferences += 1;
        if (!nonEmptyString(image) || path.isAbsolute(image) || image.split(/[\\/]/).includes("..")) errors.push(`${recordLabel}: unsafe local media path ${image}.`);
        else if (!existsSync(path.join(publicDir, image))) errors.push(`${recordLabel}: local media file does not exist: ${image}.`);
        media.push({ alt: `${translation?.name_vi ?? product.name}${position ? ` - ảnh ${position + 1}` : ""}`, kind: "image", path: image, position });
      }
    }

    normalizedProducts.push({
      attributes: product.attributes.map((attribute) => ({
        legacySourceId: Number.isInteger(attribute?.id) ? attribute.id : null,
        name: String(attribute?.name ?? ""),
        values: Array.isArray(attribute?.options) ? attribute.options.map(String) : [],
      })),
      categoryRelations,
      internalId: `product:${product.id}`,
      legacyDescription: product.description,
      legacySlug: product.slug,
      legacySourceId: product.id,
      media,
      packaging: { table: parsed.table.map((row) => row.map(translateText)) },
      productCode: code || null,
      publishedAt: date?.date ?? "",
      sourceType: product.type,
      technicalSpecs: { lines: parsed.lines.map(translateSpecLine).filter(Boolean) },
      translation: {
        canonicalSlug: translation?.slug_vi ?? "",
        locale: "vi",
        name: translation?.name_vi ?? "",
        sourceName: product.name,
      },
    });
  }

  for (const translation of translations) if (!productIds.has(translation.id)) errors.push(`products_vi.json: orphan translation legacy ID ${translation.id}.`);
  for (const date of dates) if (!productIds.has(date.id)) errors.push(`product_dates.json: orphan date legacy ID ${date.id}.`);
  for (const slug of Object.keys(manifest)) if (!legacySlugs.has(slug)) errors.push(`image_manifest.json: orphan product slug ${slug}.`);
  for (const category of categories) {
    const actual = categoryCounts.get(category.slug) ?? 0;
    if (actual !== category.count) errors.push(`categories.json: ${category.slug} count ${category.count}; derived ${actual}.`);
  }

  const expectedMissing = new Set(baseline.allowedMissingProductCodeLegacyIds ?? []);
  if (!sameNumberSet(missingCodeIds, expectedMissing)) errors.push(`catalog-baseline.json: missing product-code allowlist drift; actual [${[...missingCodeIds].sort((a, b) => a - b).join(", ")}].`);
  const allowedDuplicates = baseline.allowedDuplicateProductCodes ?? {};
  const actualDuplicateCodes = new Set();
  for (const [code, ids] of productsByCode) {
    if (ids.length < 2) continue;
    actualDuplicateCodes.add(code);
    const allowedIds = new Set(allowedDuplicates[code] ?? []);
    if (!sameNumberSet(new Set(ids), allowedIds)) errors.push(`catalog-baseline.json: duplicate product code ${code} has legacy IDs [${ids.join(", ")}], not the reviewed allowlist.`);
  }
  for (const code of Object.keys(allowedDuplicates)) if (!actualDuplicateCodes.has(code)) errors.push(`catalog-baseline.json: stale duplicate product-code allowlist ${code}.`);
  if (localImageReferences !== expected.localImageReferences) errors.push(`image_manifest.json: local image references ${localImageReferences}; expected ${expected.localImageReferences}.`);

  if (errors.length) throw new Error(`Catalog data build failed with ${errors.length} error(s):\n${errors.map((error) => `- ${error}`).join("\n")}`);

  const normalizedCategories = categories.map((category) => ({
    count: category.count,
    internalId: `category:${category.id}`,
    legacySourceId: category.id,
    parentInternalId: category.parent === 0 ? null : `category:${category.parent}`,
    slug: category.slug,
    sourceName: category.name,
    translation: { locale: "vi", name: glossary.categories[category.slug] ?? category.name },
  }));
  return {
    baseline,
    categories,
    counts: { products: products.length, categories: categories.length, localImageReferences },
    glossary: Object.fromEntries(Object.entries(glossary).filter(([key]) => key !== "_comment")),
    snapshot: {
      canonicalSlugSha256: actualSlugChecksum,
      categories: normalizedCategories,
      products: normalizedProducts,
      schemaVersion: SCHEMA_VERSION,
    },
    translations,
  };
}

function sourceChecksums(sourceDir) {
  return Object.fromEntries(SOURCE_FILES.map((name) => [name, sha256(readFileSync(path.join(sourceDir, name)))]));
}

function outputPayload(normalized, sourceDir) {
  const sourceFileChecksums = sourceChecksums(sourceDir);
  const sourceChecksum = sha256(SOURCE_FILES.map((name) => `${name}\0${sourceFileChecksums[name]}\n`).join(""));
  const snapshot = { ...normalized.snapshot, sourceChecksum };
  const files = {
    "catalog.generated.json": stableJson(snapshot),
    "categories.json": stableJson(normalized.categories),
    "products_vi.json": stableJson(normalized.translations),
    "vi-glossary.json": stableJson(normalized.glossary),
  };
  const outputChecksum = sha256(Object.keys(files).sort().map((name) => `${name}\0${sha256(files[name])}\n`).join(""));
  files["README.md"] = [
    "# Generated catalog data",
    "",
    "Do not edit files in this directory by hand. Canonical editable inputs live in `data/`.",
    "Run `npm run build:data` to regenerate and `npm run check:data` to detect drift.",
    "",
    `Schema version: ${SCHEMA_VERSION}`,
    `Output checksum: ${outputChecksum}`,
    "",
  ].join("\n");
  const generatedFiles = Object.fromEntries(Object.entries(files).map(([name, content]) => [name, sha256(content)]));
  files["catalog-data.checksums.json"] = stableJson({
    counts: normalized.counts,
    generatedFiles,
    outputChecksum,
    schemaVersion: SCHEMA_VERSION,
    sourceChecksum,
    sourceFiles: sourceFileChecksums,
  });
  return { files, outputChecksum, sourceChecksum };
}

export async function buildCatalogData({
  sourceDir = DEFAULT_SOURCE_DIR,
  outputDir = DEFAULT_OUTPUT_DIR,
  publicDir = DEFAULT_PUBLIC_DIR,
  check = false,
} = {}) {
  const normalized = validateAndNormalize({ sourceDir: path.resolve(sourceDir), publicDir: path.resolve(publicDir) });
  const payload = outputPayload(normalized, path.resolve(sourceDir));
  const mismatches = [];
  for (const [name, content] of Object.entries(payload.files)) {
    const target = path.join(outputDir, name);
    if (check) {
      if (!existsSync(target)) mismatches.push(`${name}: missing generated file`);
      else if (readFileSync(target, "utf8") !== content) mismatches.push(`${name}: generated content is stale or edited`);
    } else {
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
  }
  for (const name of OBSOLETE_GENERATED_FILES) {
    const target = path.join(outputDir, name);
    if (check && existsSync(target)) mismatches.push(`${name}: obsolete generated duplicate must be removed`);
    else if (!check) rmSync(target, { force: true });
  }
  if (mismatches.length) throw new Error(`Generated catalog drift detected:\n${mismatches.map((item) => `- ${item}`).join("\n")}`);
  return { counts: normalized.counts, outputChecksum: payload.outputChecksum, sourceChecksum: payload.sourceChecksum };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check") options.check = true;
    else {
      const value = argv[index + 1];
      if (!value) throw new Error(`Missing value for ${argument}.`);
      if (argument === "--source-dir") options.sourceDir = path.resolve(value);
      else if (argument === "--output-dir") options.outputDir = path.resolve(value);
      else if (argument === "--public-dir") options.publicDir = path.resolve(value);
      else throw new Error(`Unknown argument: ${argument}.`);
      index += 1;
    }
  }
  return options;
}

async function main() {
  try {
    const result = await buildCatalogData(parseArgs(process.argv.slice(2)));
    const mode = process.argv.includes("--check") ? "check passed" : "build completed";
    console.log(`Catalog data ${mode}: ${result.counts.products} products, ${result.counts.categories} categories, ${result.counts.localImageReferences} local image references; checksum ${result.outputChecksum}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
