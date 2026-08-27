import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PUBLIC_DIR = path.join(projectRoot, "public");
const DEFAULT_OUTPUT_DIR = path.join(DEFAULT_PUBLIC_DIR, "images/products-responsive");
const DEFAULT_MANIFEST_FILE = path.join(projectRoot, "src/data/image-metadata.generated.json");
const DEFAULT_CATALOG_FILE = path.join(projectRoot, "src/data/catalog.generated.json");
const SOURCE_URL_PREFIX = "/images/products/";
const OUTPUT_URL_PREFIX = "/images/products-responsive/";
const STANDARD_WIDTHS = Object.freeze([320, 480, 640, 800, 1200]);
const MAX_DERIVATIVE_WIDTH = 1200;

function assertPositiveWidth(value) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid image width: ${value}.`);
}

function normalizeSourceUrl(sourceUrl) {
  if (typeof sourceUrl !== "string" || !sourceUrl.startsWith(SOURCE_URL_PREFIX)) {
    throw new Error(`Source image must use ${SOURCE_URL_PREFIX}: ${sourceUrl}.`);
  }
  const normalized = path.posix.normalize(sourceUrl);
  if (normalized !== sourceUrl || normalized.includes("..") || sourceUrl.includes("?") || sourceUrl.includes("#")) {
    throw new Error(`Unsafe source image URL: ${sourceUrl}.`);
  }
  return normalized;
}

export function selectDerivativeWidths(sourceWidth) {
  assertPositiveWidth(sourceWidth);
  const cap = Math.min(sourceWidth, MAX_DERIVATIVE_WIDTH);
  const widths = STANDARD_WIDTHS.filter((width) => width <= cap);
  if (!widths.includes(cap)) widths.push(cap);
  return widths;
}

export function derivativeUrl(sourceUrl, width) {
  const normalized = normalizeSourceUrl(sourceUrl);
  assertPositiveWidth(width);
  const relative = normalized.slice(SOURCE_URL_PREFIX.length);
  const parsed = path.posix.parse(relative);
  return `${OUTPUT_URL_PREFIX}${parsed.dir ? `${parsed.dir}/` : ""}${parsed.name}-w${width}.webp`;
}

function publicFile(publicDir, url) {
  const root = path.resolve(publicDir);
  const target = path.resolve(root, `.${url}`);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error(`Image path escapes public directory: ${url}.`);
  return target;
}

function sha256File(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function orientedDimensions(metadata, sourceUrl) {
  const width = metadata.autoOrient?.width ?? metadata.width;
  const height = metadata.autoOrient?.height ?? metadata.height;
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Source image has invalid dimensions: ${sourceUrl}.`);
  }
  return { width, height };
}

async function mapConcurrent(items, concurrency, operation) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await operation(items[index], index);
    }
  });
  await Promise.all(workers);
}

export async function buildResponsiveImages({
  manifestFile = DEFAULT_MANIFEST_FILE,
  outputDir = DEFAULT_OUTPUT_DIR,
  publicDir = DEFAULT_PUBLIC_DIR,
  sourceUrls,
} = {}) {
  const sources = [...new Set(sourceUrls ?? [])].sort();
  if (!sources.length) throw new Error("No source images were provided.");

  const resolvedOutputDir = path.resolve(outputDir);
  const expectedOutputDir = path.resolve(publicDir, `.${OUTPUT_URL_PREFIX}`);
  if (resolvedOutputDir !== expectedOutputDir) {
    throw new Error(`Output directory must map to ${OUTPUT_URL_PREFIX}: ${resolvedOutputDir}.`);
  }

  const sourceRecords = [];
  for (const sourceUrl of sources) {
    const normalized = normalizeSourceUrl(sourceUrl);
    const sourceFile = publicFile(publicDir, normalized);
    if (!existsSync(sourceFile) || !statSync(sourceFile).isFile()) {
      throw new Error(`Source image does not exist: ${normalized}.`);
    }
    const metadata = await sharp(sourceFile).metadata();
    const dimensions = orientedDimensions(metadata, normalized);
    sourceRecords.push({
      ...dimensions,
      sourceBytes: statSync(sourceFile).size,
      sourceSha256: sha256File(sourceFile),
      sourceFile,
      sourceUrl: normalized,
      widths: selectDerivativeWidths(dimensions.width),
    });
  }

  const outputParent = path.dirname(resolvedOutputDir);
  const imageMetadata = Object.fromEntries(
    sourceRecords.map((record) => [record.sourceUrl, [record.width, record.height, record.sourceSha256]]),
  );
  const existingMetadata = existsSync(manifestFile)
    ? JSON.parse(readFileSync(manifestFile, "utf8"))
    : undefined;
  const derivativesReady = sourceRecords.every((record) => record.widths.every((width) => (
    existsSync(publicFile(publicDir, derivativeUrl(record.sourceUrl, width)))
  )));
  const existingMetadataMatches = existingMetadata && Object.entries(imageMetadata).every(([sourceUrl, metadata]) => {
    const existing = existingMetadata[sourceUrl];
    return Array.isArray(existing)
      && existing[0] === metadata[0]
      && existing[1] === metadata[1]
      && (existing.length < 3 || existing[2] === metadata[2]);
  }) && Object.keys(existingMetadata).length === Object.keys(imageMetadata).length;
  if (existingMetadataMatches && derivativesReady) {
    writeFileSync(manifestFile, `${JSON.stringify(imageMetadata, null, 2)}\n`);
    return {
      derivativeBytes: sourceRecords.reduce((sum, record) => sum + record.widths.reduce((inner, width) => inner + statSync(publicFile(publicDir, derivativeUrl(record.sourceUrl, width))).size, 0), 0),
      generatedFiles: sourceRecords.reduce((sum, record) => sum + record.widths.length, 0),
      sourceBytes: sourceRecords.reduce((sum, record) => sum + record.sourceBytes, 0),
      sourceFiles: sourceRecords.length,
    };
  }
  mkdirSync(outputParent, { recursive: true });
  const temporaryRoot = mkdtempSync(path.join(outputParent, ".responsive-images-"));
  const temporaryOutput = path.join(temporaryRoot, path.basename(resolvedOutputDir));
  const temporaryManifest = path.join(temporaryRoot, "image-metadata.generated.json");
  mkdirSync(temporaryOutput, { recursive: true });

  let derivativeBytes = 0;
  let generatedFiles = 0;
  try {
    const jobs = sourceRecords.flatMap((record) => record.widths.map((width) => ({ record, width })));
    await mapConcurrent(jobs, 4, async ({ record, width }) => {
      const url = derivativeUrl(record.sourceUrl, width);
      const relative = url.slice(OUTPUT_URL_PREFIX.length);
      const target = path.join(temporaryOutput, ...relative.split("/"));
      mkdirSync(path.dirname(target), { recursive: true });
      await sharp(record.sourceFile)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ effort: 4, quality: 82, smartSubsample: true })
        .toFile(target);
      derivativeBytes += statSync(target).size;
      generatedFiles += 1;
    });

    writeFileSync(temporaryManifest, `${JSON.stringify(imageMetadata, null, 2)}\n`);

    if (existsSync(resolvedOutputDir)) rmSync(resolvedOutputDir, { recursive: true, force: true });
    renameSync(temporaryOutput, resolvedOutputDir);
    mkdirSync(path.dirname(manifestFile), { recursive: true });
    renameSync(temporaryManifest, manifestFile);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }

  return {
    derivativeBytes,
    generatedFiles,
    sourceBytes: sourceRecords.reduce((sum, record) => sum + record.sourceBytes, 0),
    sourceFiles: sourceRecords.length,
  };
}

function catalogSourceUrls(catalogFile) {
  const catalog = JSON.parse(readFileSync(catalogFile, "utf8"));
  if (!Array.isArray(catalog.products)) throw new Error(`Catalog products are invalid: ${catalogFile}.`);
  return catalog.products.flatMap((product) => product.media.map((media) => (
    media.path.startsWith("/") ? media.path : `/${media.path}`
  )));
}

async function main() {
  const report = await buildResponsiveImages({ sourceUrls: catalogSourceUrls(DEFAULT_CATALOG_FILE) });
  console.log(JSON.stringify(report));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
