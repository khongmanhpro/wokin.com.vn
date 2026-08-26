import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultDataDir = path.join(projectRoot, "src/data");
const defaultPublicDir = path.join(projectRoot, "public");

// Phase 1 baseline from the checked-in catalog and project specification. These
// values intentionally make unexpected, coordinated data loss fail the gate.
const PROJECT_BASELINE = Object.freeze({
  products: 1357,
  categories: 30,
  manifestImages: 1720,
  missingSkuIds: new Set([8998, 9002, 9005, 9007, 9493]),
  duplicateSkuIds: new Map([
    ["789501", new Set([5784, 6263])],
    ["789506", new Set([5785, 6264])],
    ["789511", new Set([5786, 6265])],
  ]),
});

function parseArgs(argv) {
  const options = {
    dataDir: defaultDataDir,
    publicDir: defaultPublicDir,
    allowedDuplicateSkus: new Set(),
    allowedMissingSkuIds: new Set(),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--data-dir" && value) options.dataDir = path.resolve(value);
    else if (argument === "--public-dir" && value) options.publicDir = path.resolve(value);
    else if (argument === "--allow-duplicate-sku" && value) options.allowedDuplicateSkus.add(value);
    else if (argument === "--allow-missing-sku-id" && value && Number.isInteger(Number(value))) options.allowedMissingSkuIds.add(Number(value));
    else throw new Error(`Đối số không hợp lệ hoặc thiếu giá trị: ${argument}`);
    index += 1;
  }
  return options;
}

function readJson(dataDir, name, errors) {
  const file = path.join(dataDir, name);
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`Không đọc được ${file}: ${error.message}`);
    return null;
  }
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function duplicateGroups(items, keyOf) {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    const values = groups.get(key) ?? [];
    values.push(item);
    groups.set(key, values);
  }
  return [...groups.entries()].filter(([, values]) => values.length > 1);
}

function sameNumberSet(actual, expected) {
  return actual.size === expected.size && [...actual].every((value) => expected.has(value));
}

export function validateCatalog(options) {
  const errors = [];
  const reports = [];
  const products = readJson(options.dataDir, "products.json", errors);
  const translations = readJson(options.dataDir, "products_vi.json", errors);
  const categories = readJson(options.dataDir, "categories.json", errors);
  const dates = readJson(options.dataDir, "product_dates.json", errors);
  const manifest = readJson(options.dataDir, "image_manifest.json", errors);
  if (![products, translations, categories, dates].every(Array.isArray) || !manifest || Array.isArray(manifest)) {
    errors.push("Catalog JSON phải có đúng kiểu array/object theo schema hiện tại.");
    return { errors, reports };
  }

  const isProjectCatalog = path.resolve(options.dataDir) === defaultDataDir;
  const expectedProducts = isProjectCatalog ? PROJECT_BASELINE.products : products.length;
  const expectedCategories = isProjectCatalog ? PROJECT_BASELINE.categories : categories.length;
  if (products.length !== expectedProducts) errors.push(`Sai product count: ${products.length}; expected ${expectedProducts}.`);
  if (categories.length !== expectedCategories) errors.push(`Sai category count: ${categories.length}; expected ${expectedCategories}.`);
  if (translations.length !== products.length) errors.push(`products_vi count ${translations.length} không khớp products ${products.length}.`);
  if (dates.length !== products.length) errors.push(`product_dates count ${dates.length} không khớp products ${products.length}.`);
  if (Object.keys(manifest).length !== products.length) errors.push(`image manifest entries ${Object.keys(manifest).length} không khớp products ${products.length}.`);

  const categorySlugs = new Set();
  const categoryIds = new Set(categories.map((category) => category.id));
  for (const category of categories) {
    if (!Number.isInteger(category.id) || !nonEmptyString(category.name) || !nonEmptyString(category.slug) || !Number.isInteger(category.count)) {
      errors.push(`Danh mục thiếu required fields: ${JSON.stringify(category)}`);
    }
    if (categorySlugs.has(category.slug)) errors.push(`Category slug không duy nhất: ${category.slug}.`);
    categorySlugs.add(category.slug);
    if (category.parent !== 0 && !categoryIds.has(category.parent)) errors.push(`Danh mục ${category.slug} tham chiếu parent không tồn tại: ${category.parent}.`);
  }

  const ids = new Set();
  const originalSlugs = new Set();
  const productById = new Map();
  const productsBySku = new Map();
  const productsPerCategory = new Map();
  const missingSkuIds = new Set();
  for (const product of products) {
    if (!Number.isInteger(product.id) || !nonEmptyString(product.name) || !nonEmptyString(product.slug) || !Array.isArray(product.categories) || product.categories.length === 0 || !Array.isArray(product.images) || product.images.length === 0) {
      errors.push(`Sản phẩm thiếu required fields: ID ${product?.id ?? "unknown"}.`);
    }
    if (ids.has(product.id)) errors.push(`Internal product ID không duy nhất: ${product.id}.`);
    if (originalSlugs.has(product.slug)) errors.push(`Product source slug không duy nhất: ${product.slug}.`);
    ids.add(product.id);
    originalSlugs.add(product.slug);
    productById.set(product.id, product);
    const sku = typeof product.sku === "string" ? product.sku.trim() : "";
    if (!sku) missingSkuIds.add(product.id);
    else productsBySku.set(sku, [...(productsBySku.get(sku) ?? []), product]);
    for (const reference of product.categories ?? []) {
      if (!nonEmptyString(reference.slug) || !categorySlugs.has(reference.slug)) errors.push(`Sản phẩm ${product.id} tham chiếu danh mục không tồn tại: ${reference.slug}.`);
      productsPerCategory.set(reference.slug, (productsPerCategory.get(reference.slug) ?? 0) + 1);
    }
  }

  if (isProjectCatalog) {
    if (!sameNumberSet(missingSkuIds, PROJECT_BASELINE.missingSkuIds)) {
      errors.push(`Danh sách sản phẩm thiếu SKU đã drift: [${[...missingSkuIds].sort((a, b) => a - b).join(", ")}].`);
    } else {
      reports.push(`SKU trống được cho phép có chủ đích cho ID: ${[...missingSkuIds].sort((a, b) => a - b).join(", ")}.`);
    }
  } else if (missingSkuIds.size) {
    const unexpected = new Set([...missingSkuIds].filter((id) => !options.allowedMissingSkuIds.has(id)));
    if (unexpected.size) errors.push(`Sản phẩm thiếu SKU: ${[...unexpected].join(", ")}.`);
    const allowed = [...missingSkuIds].filter((id) => options.allowedMissingSkuIds.has(id));
    if (allowed.length) reports.push(`SKU trống được cho phép có chủ đích cho ID: ${allowed.join(", ")}.`);
  }

  for (const [sku, group] of productsBySku) {
    if (group.length < 2) continue;
    const actualIds = new Set(group.map((product) => product.id));
    const projectAllowed = isProjectCatalog && PROJECT_BASELINE.duplicateSkuIds.has(sku) && sameNumberSet(actualIds, PROJECT_BASELINE.duplicateSkuIds.get(sku));
    const cliAllowed = options.allowedDuplicateSkus.has(sku);
    if (!projectAllowed && !cliAllowed) errors.push(`SKU trùng không được allowlist: ${sku} (IDs ${[...actualIds].join(", ")}).`);
    else reports.push(`SKU trùng được cho phép có chủ đích: ${sku} (IDs ${[...actualIds].join(", ")}).`);
  }
  if (isProjectCatalog) {
    const duplicateSurplus = products.length - new Set(products.map((product) => product.sku)).size;
    reports.push(`SKU duplicate baseline: ${duplicateSurplus} records beyond unique keys (gồm SKU trống và 3 nhóm SKU có giá trị).`);
    if (duplicateSurplus !== 7) errors.push(`SKU duplicate baseline đã drift: ${duplicateSurplus}; expected 7.`);
  }

  for (const category of categories) {
    const actual = productsPerCategory.get(category.slug) ?? 0;
    if (actual !== category.count) errors.push(`Category count sai cho ${category.slug}: ${category.count}; derived ${actual}.`);
  }

  const translationIds = new Set();
  const viSlugs = new Set();
  for (const translation of translations) {
    if (!Number.isInteger(translation.id) || !nonEmptyString(translation.name_en) || !nonEmptyString(translation.name_vi) || !nonEmptyString(translation.slug_vi)) {
      errors.push(`Bản dịch thiếu required fields: ID ${translation?.id ?? "unknown"}.`);
    }
    if (translationIds.has(translation.id)) errors.push(`Translation ID không duy nhất: ${translation.id}.`);
    if (viSlugs.has(translation.slug_vi)) errors.push(`slug_vi phải duy nhất: ${translation.slug_vi}.`);
    translationIds.add(translation.id);
    viSlugs.add(translation.slug_vi);
    const product = productById.get(translation.id);
    if (!product) errors.push(`Bản dịch tham chiếu product ID không tồn tại: ${translation.id}.`);
    else if ((translation.sku ?? "") !== (product.sku ?? "")) errors.push(`SKU bản dịch không khớp product ID ${translation.id}.`);
  }
  for (const product of products) if (!translationIds.has(product.id)) errors.push(`Thiếu bản dịch cho product ID ${product.id}.`);

  const dateIds = new Set();
  for (const entry of dates) {
    if (!Number.isInteger(entry.id) || !nonEmptyString(entry.date) || !nonEmptyString(entry.slug)) errors.push(`product_dates thiếu required fields: ID ${entry?.id ?? "unknown"}.`);
    if (dateIds.has(entry.id)) errors.push(`product_dates ID không duy nhất: ${entry.id}.`);
    dateIds.add(entry.id);
    const product = productById.get(entry.id);
    if (!product) errors.push(`product_dates tham chiếu ID không tồn tại: ${entry.id}.`);
    else if (entry.slug !== product.slug) errors.push(`product_dates slug không khớp ID ${entry.id}.`);
  }

  let manifestImages = 0;
  for (const [slug, entry] of Object.entries(manifest)) {
    const product = products.find((candidate) => candidate.slug === slug);
    if (!product) {
      errors.push(`Image manifest tham chiếu product slug không tồn tại: ${slug}.`);
      continue;
    }
    // Missing-SKU products use their unique source slug as the local directory
    // key. Every product with a SKU must retain that SKU in the manifest.
    const expectedImageKey = product.sku?.trim() || product.slug;
    if (entry.sku !== expectedImageKey) errors.push(`Image manifest SKU/key không khớp product ${slug}: ${entry.sku}; expected ${expectedImageKey}.`);
    if (!Array.isArray(entry.images) || entry.images.length === 0) {
      errors.push(`Image manifest thiếu ảnh cho ${slug}.`);
      continue;
    }
    for (const image of entry.images) {
      manifestImages += 1;
      if (!nonEmptyString(image) || path.isAbsolute(image) || image.split(/[\\/]/).includes("..")) {
        errors.push(`Image manifest path không an toàn cho ${slug}: ${image}.`);
      } else if (!existsSync(path.join(options.publicDir, image))) {
        errors.push(`Ảnh local không tồn tại cho ${slug}: ${image}.`);
      }
    }
  }
  if (isProjectCatalog && manifestImages !== PROJECT_BASELINE.manifestImages) errors.push(`Manifest image count ${manifestImages}; expected ${PROJECT_BASELINE.manifestImages}.`);

  return {
    errors: [...new Set(errors)],
    reports,
    summary: { products: products.length, categories: categories.length, manifestImages, duplicateSkuSurplus: products.length - new Set(products.map((product) => product.sku)).size },
  };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  const result = validateCatalog(options);
  for (const report of result.reports) console.log(`REPORT: ${report}`);
  if (result.errors.length) {
    for (const error of result.errors) console.error(`ERROR: ${error}`);
    console.error(`Catalog validation failed with ${result.errors.length} error(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`Catalog validation passed: ${result.summary.products} products, ${result.summary.categories} categories, ${result.summary.manifestImages} local image references.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
