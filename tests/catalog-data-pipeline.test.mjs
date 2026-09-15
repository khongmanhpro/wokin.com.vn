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
    terms: [["color box", "hộp màu"], ["satin finish", "hoàn thiện satin"], ["stain finish", "hoàn thiện satin"], ["wrench", "cờ lê"]],
    spec_labels: { Voltage: "Điện áp", Packing: "Đóng gói", "Magazine capacity": "Sức chứa hộp đạn" },
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
    await assert.rejects(buildCatalogData(fixture), /bản dịch làm mất số liệu 20v|target làm mất token số/i);

    writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: {},
      cells: { "TEST-101": "Mã kiểm thử" },
    });
    await assert.rejects(buildCatalogData(fixture), /packaging row 2 cell 1: bản dịch làm mất số liệu 101|cells target làm mất token số/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("catalog build applies reviewed labels and treats pc/pcs as Vietnamese quantity words", async () => {
  const { buildCatalogData } = await loadBuilder();
  const fixture = makeFixture();
  try {
    const productsFile = path.join(fixture.sourceDir, "products.json");
    const products = JSON.parse(readFileSync(productsFile, "utf8"));
    products[0].short_description = "<p>&gt; Input power: 20W<br>&gt; Magazine capacity: 125pcs<br>&gt; With 2pcs battery pack<br>&gt; Packing: 100pcs in one bag</p>";
    writeJson(productsFile, products);
    writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: {
        "> With 2pcs battery pack": "> Kèm 2 bộ pin",
        "> Packing: 100pcs in one bag": "> Đóng gói: 100 chiếc/túi",
      },
      labels: { "input power": "Công suất đầu vào" },
      cells: {},
    });
    await buildCatalogData(fixture);
    const snapshot = JSON.parse(readFileSync(path.join(fixture.outputDir, "catalog.generated.json"), "utf8"));
    assert.deepEqual(snapshot.products[0].technicalSpecs.lines, [
      "> Công suất đầu vào: 20W",
      "> Magazine capacity: 125pcs",
      "> Kèm 2 bộ pin",
      "> Đóng gói: 100 chiếc/túi",
    ]);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("numeric token gate accepts natural Vietnamese quantity words and rejects dropped counts", async () => {
  const { buildCatalogData } = await loadBuilder();
  const fixture = makeFixture();
  try {
    const productsFile = path.join(fixture.sourceDir, "products.json");
    const products = JSON.parse(readFileSync(productsFile, "utf8"));
    products[0].short_description = "<p>&gt; With 2pcs battery pack<br>&gt; Packing: 100pcs in one bag</p>";
    writeJson(productsFile, products);
    writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: {
        "> With 2pcs battery pack": "> Kèm 2 bộ pin",
        "> Packing: 100pcs in one bag": "> Đóng gói: 100 chiếc/túi",
      },
      cells: {},
    });
    await buildCatalogData(fixture);
    writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: { "> With 2pcs battery pack": "> Kèm bộ pin" },
      cells: {},
    });
    await assert.rejects(buildCatalogData(fixture), /bản dịch làm mất số liệu 2|target làm mất token số/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("catalog build rejects pcs in Vietnamese dictionary targets", async () => {
  const { buildCatalogData } = await loadBuilder();
  const fixture = makeFixture();
  try {
    for (const kind of ["lines", "cells", "labels"]) {
      writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), {
        schemaVersion: 1,
        lines: kind === "lines" ? { "> Voltage: 20V": "> Điện áp: 20pcs" } : {},
        cells: kind === "cells" ? { "STOCK NO.": "Mã 1pcs" } : {},
        labels: kind === "labels" ? { voltage: "Điện áp 1pcs" } : {},
      });
      await assert.rejects(buildCatalogData(fixture), /pcs.*target|target.*pcs/i);
    }
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("catalog build rejects English remainder and hybrid tokens in dictionary targets", async () => {
  const { buildCatalogData } = await loadBuilder();
  const fixture = makeFixture();
  try {
    writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: { "> Voltage: 20V": "> Kích thước with case: 20V" },
      cells: {},
    });
    await assert.rejects(buildCatalogData(fixture), /target.*English|English.*target|còn English/i);

    writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: { "> Voltage: 20V": "> 2 chi tiết lục giács: 20V" },
      cells: {},
    });
    await assert.rejects(buildCatalogData(fixture), /lai|hybrid|English/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("untranslated spec fallback keeps source instead of creating a hybrid sentence", async () => {
  const { buildCatalogData, createTranslator } = await loadBuilder();
  const fixture = makeFixture();
  try {
    const productsFile = path.join(fixture.sourceDir, "products.json");
    const products = JSON.parse(readFileSync(productsFile, "utf8"));
    products[0].short_description = "<p>&gt; These face frame hinges provide a wide opening.<br>&gt; Packing: color box<br>&gt; satin finish<br>&gt; stain finish</p>";
    writeJson(productsFile, products);
    writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), { schemaVersion: 1, lines: {}, cells: {} });
    await buildCatalogData(fixture);
    const snapshot = JSON.parse(readFileSync(path.join(fixture.outputDir, "catalog.generated.json"), "utf8"));
    assert.deepEqual(snapshot.products[0].technicalSpecs.lines, [
      "> These face frame hinges provide a wide opening.",
      "> Đóng gói: hộp màu",
      "> hoàn thiện satin",
      "> hoàn thiện satin",
    ]);
    const glossary = JSON.parse(readFileSync(path.join(fixture.sourceDir, "vi-glossary.json"), "utf8"));
    const translator = createTranslator(glossary, {});
    assert.equal(translator.translateText("satin finish"), "hoàn thiện satin");
    assert.equal(translator.translateText("stain finish"), "hoàn thiện satin");
    assert.equal(translator.translateSpecLine("> 1pc wrench"), "> 1pc wrench");
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("spec fallback does not emit hybrid tokens for real catalog sources", async () => {
  const { createTranslator, parseLegacySpec } = await loadBuilder();
  const { needsTranslation, hasHybridToken } = await import(new URL("../scripts/spec-translation-utils.mjs", import.meta.url));
  const products = JSON.parse(readFileSync(path.join(projectRoot, "data/products.json"), "utf8"));
  const glossary = JSON.parse(readFileSync(path.join(projectRoot, "data/vi-glossary.json"), "utf8"));
  const translator = createTranslator(glossary, { lines: {}, cells: {} });
  const examples = ["hex keys", "SAE combination spanners", "φ3hex wrench", "screwdrivers"];
  for (const example of examples) {
    const product = products.find((candidate) => candidate.short_description.toLowerCase().includes(example.toLowerCase()));
    assert.ok(product, `missing real source example: ${example}`);
    const source = parseLegacySpec(product.short_description).lines.find((line) => line.toLowerCase().includes(example.toLowerCase()));
    assert.ok(source, `missing parsed source example: ${example}`);
    const output = translator.translateSpecLine(source);
    assert.ok(output === source || !needsTranslation(output), `${example} produced unresolved English: ${output}`);
    if (output !== source) assert.equal(hasHybridToken(output), false, `${example} produced hybrid token: ${output}`);
  }
});

test("C1.3.0 hard-coded phrases respect Unicode boundaries and spec spacing", async () => {
  const { createTranslator } = await loadBuilder();
  const { hasHybridToken } = await import(new URL("../scripts/spec-translation-utils.mjs", import.meta.url));
  const fixture = makeFixture();
  try {
    const glossary = JSON.parse(readFileSync(path.join(fixture.sourceDir, "vi-glossary.json"), "utf8"));
    const translator = createTranslator(glossary, {});
    assert.equal(hasHybridToken("Khởi động êmer"), true);
    assert.equal(translator.translateSpecLine("> Soft starter"), "> Soft starter");
    assert.equal(translator.translateSpecLine("> Packing:color box"), "> Đóng gói: hộp màu");
    assert.equal(translator.translateSpecLine("> Timer: 1:10"), "> Timer: 1:10");
    assert.equal(translator.translateSpecLine("> URL: https://example.test/a:b"), "> URL: https://example.test/a:b");
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("C1.3.1 keeps SL semantics, code colons, and rejects dead label translations", async () => {
  const { buildCatalogData, createTranslator } = await loadBuilder();
  const fixture = makeFixture();
  try {
    const glossary = JSON.parse(readFileSync(path.join(fixture.sourceDir, "vi-glossary.json"), "utf8"));
    const translator = createTranslator(glossary, { labels: { sl: "Dẹt (SL)" } });
    assert.equal(translator.translateSpecLine("> SL: 3, 4, 5, 6mm"), "> Dẹt (SL): 3, 4, 5, 6mm");
    assert.equal(translator.translateSpecLine("> EN149:2001+A1:2009"), "> EN149:2001+A1:2009");
    assert.equal(translator.translateSpecLine("> D:S : 12:1"), "> D:S : 12:1");
    assert.equal(translator.translateSpecLine("> Tiêu chuẩn EN149:2001"), "> Tiêu chuẩn EN149:2001");
    const productionGlossary = JSON.parse(readFileSync(path.join(projectRoot, "data/vi-glossary.json"), "utf8"));
    const productionTranslator = createTranslator(productionGlossary, {});
    assert.equal(productionTranslator.translateSpecLine("> EN149:2001+A1:2009 Certification"), "> EN149:2001+A1:2009 Chứng nhận");

    const productsFile = path.join(fixture.sourceDir, "products.json");
    const products = JSON.parse(readFileSync(productsFile, "utf8"));
    products[0].short_description = "<p>&gt; 13pcs 1/4″ cr-v sockets: 1/4″</p>";
    writeJson(productsFile, products);
    writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: {},
      labels: { "13pcs 1/4″ cr-v sockets": "13 đầu tuýp 1/4" },
      cells: {},
    });
    await assert.rejects(buildCatalogData(fixture), /labels.*numeric|numeric.*labels|13pcs 1\/4/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("C1.3.2 treats curly inch quotes as numeric tokens", async () => {
  const { buildCatalogData } = await loadBuilder();
  const { numericTokens, preservesNumericTokens, preservesTechnicalTokens } = await import(new URL("../scripts/spec-translation-utils.mjs", import.meta.url));
  assert.deepEqual(numericTokens("1/2”"), numericTokens("1/2″"));
  assert.deepEqual(numericTokens("454kgs"), numericTokens("454 kg"));
  assert.deepEqual(numericTokens("1000-Pounds"), numericTokens("1000 lb"));
  assert.deepEqual(numericTokens("13,mm"), numericTokens("13 mm"));
  assert.equal(
    preservesTechnicalTokens(
      "with 3-in-1 indicator light (overload + output + oil alarm light)",
      "có đèn báo 3 trong 1 (quá tải + đầu ra + báo động dầu)",
    ),
    true,
  );
  assert.equal(
    preservesTechnicalTokens("1000-Pounds/454kgs Weight Capacity", "Tải trọng 1000 lb/454 kg"),
    true,
  );
  assert.equal(
    preservesNumericTokens("1000-Pounds/454kgs Weight Capacity", "Tải trọng 1000 lb/454 kg"), true);
  assert.equal(
    preservesTechnicalTokens("120X60X180CM(LxWxH)", "Kích thước 120×60×180cm (D×R×C)"),
    true,
  );
  assert.equal(
    preservesTechnicalTokens("0-300N.M/0-220Lb•ft", "Dải mô-men xoắn: 0-300 N·m/0-220 lb-ft"),
    true,
  );
  const fixture = makeFixture();
  try {
    const productsFile = path.join(fixture.sourceDir, "products.json");
    const products = JSON.parse(readFileSync(productsFile, "utf8"));
    products[0].short_description = "<p>&gt; 1pc 1/2” dr. socket adapter: 1/2”</p>";
    writeJson(productsFile, products);
    writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: {},
      labels: { "1pc 1/2” dr. socket adapter": "1 đầu chuyển tuýp truyền động 1/2" },
      cells: {},
    });
    await assert.rejects(buildCatalogData(fixture), /labels.*numeric|numeric.*labels|1pc 1\/2/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("C1.3.2 enforces Bộ only for source labels containing set", async () => {
  const { buildCatalogData } = await loadBuilder();
  const fixture = makeFixture();
  try {
    const productsFile = path.join(fixture.sourceDir, "products.json");
    const products = JSON.parse(readFileSync(productsFile, "utf8"));
    products[0].short_description = "<p>&gt; 12pcs combination spanners: 8, 10, 12mm<br>&gt; 6pcs punch set: 6mm</p>";
    writeJson(productsFile, products);
    writeJson(path.join(fixture.sourceDir, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: {},
      labels: {
        "12pcs combination spanners": "Bộ 12 cờ lê kết hợp",
        "6pcs punch set": "6 mũi đột",
      },
      cells: {},
    });
    await assert.rejects(buildCatalogData(fixture), /Bộ|set|lượng từ|quantity/i);
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
