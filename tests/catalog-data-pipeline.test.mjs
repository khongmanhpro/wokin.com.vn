import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const builderUrl = new URL("../scripts/build-catalog-data.mjs", import.meta.url);

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function makeFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "wokin-data-pipeline-"));
  const sourceDir = path.join(root, "data");
  const outputDir = path.join(root, "generated");
  const publicDir = path.join(root, "public");
  const product = {
    id: 101,
    name: "20V TEST TOOL",
    slug: "20v-test-tool",
    sku: "TEST-101",
    type: "simple",
    categories: [{ name: "HAND TOOLS", slug: "hand-tools" }],
    images: [{ src: "https://source.invalid/test.jpg", alt: "Source alt" }],
    short_description: "<p>&gt; Voltage: 20V<br>&gt; Packing: color box</p><table><tr><td>STOCK NO.</td><td>QTY./CARTON</td></tr><tr><td>TEST-101</td><td>6</td></tr></table>",
    description: "",
    attributes: [],
  };
  const localImage = "images/products/TEST-101/0.jpg";

  writeJson(path.join(sourceDir, "products.json"), [product]);
  const translations = [{
    id: 101,
    sku: "TEST-101",
    name_en: "20V TEST TOOL",
    name_vi: "Dụng cụ kiểm thử 20V",
    slug_vi: "dung-cu-kiem-thu-20v",
  }];
  writeJson(path.join(sourceDir, "products_vi.json"), translations);
  writeJson(path.join(sourceDir, "categories.json"), [{
    id: 10,
    name: "HAND TOOLS",
    slug: "hand-tools",
    count: 1,
    parent: 0,
  }]);
  writeJson(path.join(sourceDir, "product_dates.json"), [{
    id: 101,
    slug: "20v-test-tool",
    date: "2026-01-01T00:00:00",
  }]);
  writeJson(path.join(sourceDir, "image_manifest.json"), {
    "20v-test-tool": { sku: "TEST-101", images: [localImage] },
  });
  writeJson(path.join(sourceDir, "vi-glossary.json"), {
    _comment: "Fixture source.invalid must never reach generated output.",
    categories: { "hand-tools": "Dụng cụ cầm tay" },
    ui: { "STOCK NO.": "MÃ SẢN PHẨM", "QTY./CARTON": "SL/THÙNG" },
    marketing: {},
    terms: [["color box", "hộp màu"]],
    spec_labels: { Voltage: "Điện áp", Packing: "Đóng gói" },
  });
  writeJson(path.join(sourceDir, "spec-translations-vi.json"), {
    schemaVersion: 1,
    lines: {},
    cells: {},
  });
  writeJson(path.join(sourceDir, "catalog-baseline.json"), {
    schemaVersion: 1,
    expected: {
      products: 1,
      categories: 1,
      localImageReferences: 1,
      canonicalSlugSha256: createHash("sha256")
        .update("101|dung-cu-kiem-thu-20v\n")
        .digest("hex"),
    },
    allowedMissingProductCodeLegacyIds: [],
    allowedDuplicateProductCodes: {},
  });
  const imageTarget = path.join(publicDir, localImage);
  mkdirSync(path.dirname(imageTarget), { recursive: true });
  writeFileSync(imageTarget, "fixture image");

  return { root, sourceDir, outputDir, publicDir };
}

async function loadBuilder() {
  try {
    return await import(`${builderUrl.href}?test=${Date.now()}`);
  } catch {
    return {};
  }
}

test("catalog build is deterministic and emits normalized lossless specs", async () => {
  const builder = await loadBuilder();
  assert.equal(typeof builder.buildCatalogData, "function", "buildCatalogData export must exist");
  const fixture = makeFixture();
  const secondOutputDir = path.join(fixture.root, "generated-second");
  try {
    const first = await builder.buildCatalogData(fixture);
    const second = await builder.buildCatalogData({ ...fixture, outputDir: secondOutputDir });
    assert.equal(first.outputChecksum, second.outputChecksum);
    assert.deepEqual(first.counts, { products: 1, categories: 1, localImageReferences: 1 });

    const snapshot = JSON.parse(readFileSync(path.join(fixture.outputDir, "catalog.generated.json"), "utf8"));
    assert.equal(snapshot.products[0].internalId, "product:101");
    assert.equal(snapshot.products[0].legacySourceId, 101);
    assert.equal(snapshot.products[0].productCode, "TEST-101");
    assert.equal(snapshot.products[0].translation.canonicalSlug, "dung-cu-kiem-thu-20v");
    assert.deepEqual(snapshot.products[0].technicalSpecs.lines, ["> Điện áp: 20V", "> Đóng gói: hộp màu"]);
    assert.deepEqual(snapshot.products[0].packaging.table, [
      ["MÃ SẢN PHẨM", "SL/THÙNG"],
      ["TEST-101", "6"],
    ]);
    assert.equal(snapshot.products[0].media.length, 1);

    const generatedText = readFileSync(path.join(fixture.outputDir, "catalog.generated.json"), "utf8");
    assert.doesNotMatch(generatedText, /source\.invalid|@[a-z0-9.-]+\.[a-z]{2,}/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("catalog build reports a missing translation with product context", async () => {
  const { buildCatalogData } = await loadBuilder();
  const fixture = makeFixture();
  try {
    writeJson(path.join(fixture.sourceDir, "products_vi.json"), []);
    await assert.rejects(
      buildCatalogData(fixture),
      /product legacy ID 101: missing translation record/i,
    );
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("catalog build fails when non-empty spec source would be silently dropped", async () => {
  const { buildCatalogData } = await loadBuilder();
  const fixture = makeFixture();
  try {
    const productsFile = path.join(fixture.sourceDir, "products.json");
    const products = JSON.parse(readFileSync(productsFile, "utf8"));
    products[0].short_description = "<script>only blocked content</script>";
    writeJson(productsFile, products);
    await assert.rejects(
      buildCatalogData(fixture),
      /product legacy ID 101: technical spec parse produced no structured content.*silently dropped/i,
    );
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("catalog build preserves a table-only product spec", async () => {
  const { buildCatalogData } = await loadBuilder();
  const fixture = makeFixture();
  try {
    const productsFile = path.join(fixture.sourceDir, "products.json");
    const products = JSON.parse(readFileSync(productsFile, "utf8"));
    products[0].short_description = "<table><tr><td>STOCK NO.</td><td>QTY./CARTON</td></tr><tr><td>TEST-101</td><td>6</td></tr></table>";
    writeJson(productsFile, products);
    await buildCatalogData(fixture);
    const snapshot = JSON.parse(readFileSync(path.join(fixture.outputDir, "catalog.generated.json"), "utf8"));
    assert.deepEqual(snapshot.products[0].technicalSpecs.lines, []);
    assert.deepEqual(snapshot.products[0].packaging.table[1], ["TEST-101", "6"]);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("catalog build prefers reviewed spec translations and rejects numeric loss", async () => {
  const { buildCatalogData } = await loadBuilder();
  const fixture = makeFixture();
  try {
    writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: {
        "> Voltage: 20V": "> Điện áp danh định: 20V",
        "> Packing: color box": "> Đóng gói: hộp màu",
      },
      cells: { "STOCK NO.": "MÃ SẢN PHẨM", "QTY./CARTON": "SL/THÙNG" },
    });
    await buildCatalogData(fixture);
    const snapshot = JSON.parse(readFileSync(path.join(fixture.outputDir, "catalog.generated.json"), "utf8"));
    assert.deepEqual(snapshot.products[0].technicalSpecs.lines, ["> Điện áp danh định: 20V", "> Đóng gói: hộp màu"]);
    assert.deepEqual(snapshot.products[0].packaging.table[0], ["MÃ SẢN PHẨM", "SL/THÙNG"]);

    writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: { "> Voltage: 20V": "> Đặc tính kỹ thuật: 20V" },
      cells: {},
    });
    await assert.rejects(buildCatalogData(fixture), /technical spec placeholder is not allowed/i);

    writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: { "> Voltage: 20V": "> Điện áp danh định: 10V" },
      cells: {},
    });
    await assert.rejects(buildCatalogData(fixture), /bản dịch làm mất số liệu 20v/i);

    writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: {},
      cells: { "TEST-101": "TEST" },
    });
    await assert.rejects(buildCatalogData(fixture), /packaging row 2 cell 1: bản dịch làm mất số liệu 101/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("catalog check detects manual edits in generated data", async () => {
  const { buildCatalogData } = await loadBuilder();
  const fixture = makeFixture();
  try {
    await buildCatalogData(fixture);
    const generatedFile = path.join(fixture.outputDir, "catalog.generated.json");
    writeFileSync(generatedFile, `${readFileSync(generatedFile, "utf8")} `);
    await assert.rejects(
      buildCatalogData({ ...fixture, check: true }),
      /catalog\.generated\.json: generated content is stale or edited/i,
    );
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("runtime catalog imports only the normalized generated snapshot", () => {
  const source = readFileSync(path.join(projectRoot, "src/lib/catalog.ts"), "utf8");
  assert.match(source, /@\/data\/catalog\.generated\.json/);
  for (const obsoleteImport of ["products.json", "product_dates.json", "image_manifest.json"]) {
    assert.doesNotMatch(source, new RegExp(`@/data/${obsoleteImport.replace(".", "\\.")}`));
  }
  assert.match(source, /assertCatalogSnapshot/);
});
