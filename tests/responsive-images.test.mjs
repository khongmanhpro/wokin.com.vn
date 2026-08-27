import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(import.meta.dirname, "..");
const pipelineUrl = pathToFileURL(path.join(projectRoot, "scripts/build-responsive-images.mjs"));

let pipeline;
let pipelineLoadError;
try {
  pipeline = await import(pipelineUrl.href);
} catch (error) {
  pipelineLoadError = error;
}

function requirePipeline() {
  assert.ok(pipeline, `responsive image pipeline must load: ${pipelineLoadError?.message ?? "unknown error"}`);
  return pipeline;
}

async function fixture(sourceWidth = 800, sourceHeight = sourceWidth) {
  const root = mkdtempSync(path.join(os.tmpdir(), "wokin-responsive-images-"));
  const publicDir = path.join(root, "public");
  const sourceUrl = "/images/products/TEST-001/0.jpg";
  const sourceFile = path.join(publicDir, sourceUrl.slice(1));
  mkdirSync(path.dirname(sourceFile), { recursive: true });
  await sharp({
    create: {
      width: sourceWidth,
      height: sourceHeight,
      channels: 3,
      background: { r: 254, g: 119, b: 0 },
    },
  }).jpeg({ quality: 90 }).toFile(sourceFile);
  return {
    manifestFile: path.join(root, "image-metadata.generated.json"),
    outputDir: path.join(publicDir, "images/products-responsive"),
    publicDir,
    root,
    sourceFile,
    sourceUrl,
  };
}

test("responsive image pipeline module is available", () => {
  requirePipeline();
});

test("derivative naming is deterministic and isolated from source images", () => {
  const { derivativeUrl } = requirePipeline();
  assert.equal(
    derivativeUrl("/images/products/TEST-001/0.jpg", 480),
    "/images/products-responsive/TEST-001/0-w480.webp",
  );
  assert.equal(
    derivativeUrl("/images/products/TEST-001/detail.view.jpg", 1200),
    "/images/products-responsive/TEST-001/detail.view-w1200.webp",
  );
});

test("width selection never upscales and retains a useful native-width candidate", () => {
  const { selectDerivativeWidths } = requirePipeline();
  assert.deepEqual(selectDerivativeWidths(200), [200]);
  assert.deepEqual(selectDerivativeWidths(600), [320, 480, 600]);
  assert.deepEqual(selectDerivativeWidths(800), [320, 480, 640, 800]);
  assert.deepEqual(selectDerivativeWidths(1800), [320, 480, 640, 800, 1200]);
  for (const sourceWidth of [200, 600, 800, 1800]) {
    assert.ok(selectDerivativeWidths(sourceWidth).every((width) => width <= sourceWidth));
  }
});

test("pipeline rejects a catalog reference whose source file does not exist", async () => {
  const { buildResponsiveImages } = requirePipeline();
  const root = mkdtempSync(path.join(os.tmpdir(), "wokin-responsive-images-missing-"));
  try {
    await assert.rejects(
      buildResponsiveImages({
        manifestFile: path.join(root, "manifest.json"),
        outputDir: path.join(root, "public/images/products-responsive"),
        publicDir: path.join(root, "public"),
        sourceUrls: ["/images/products/MISSING/0.jpg"],
      }),
      /Source image does not exist/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("generated metadata preserves dimensions and every derivative reference exists", async () => {
  const { buildResponsiveImages } = requirePipeline();
  const current = await fixture(600, 300);
  try {
    const report = await buildResponsiveImages({
      manifestFile: current.manifestFile,
      outputDir: current.outputDir,
      publicDir: current.publicDir,
      sourceUrls: [current.sourceUrl],
    });
    assert.equal(report.sourceFiles, 1);
    assert.equal(report.generatedFiles, 3);

    const metadata = JSON.parse(readFileSync(current.manifestFile, "utf8"));
    assert.deepEqual(metadata[current.sourceUrl].slice(0, 2), [600, 300]);
    assert.match(metadata[current.sourceUrl][2], /^[a-f0-9]{64}$/);
    for (const width of [320, 480, 600]) {
      const url = pipeline.derivativeUrl(current.sourceUrl, width);
      const file = path.join(current.publicDir, url.slice(1));
      assert.ok(existsSync(file), `missing generated derivative ${url}`);
      const dimensions = await sharp(file).metadata();
      assert.equal(dimensions.width, width);
      assert.equal(dimensions.height, Math.round(300 * width / 600));
      assert.equal(dimensions.format, "webp");
    }
  } finally {
    rmSync(current.root, { recursive: true, force: true });
  }
});
