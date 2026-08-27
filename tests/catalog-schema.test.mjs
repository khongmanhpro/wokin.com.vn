import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const projectRoot = path.resolve(import.meta.dirname, "..");
const nativeRequire = createRequire(import.meta.url);

function loadSchemaModule() {
  const filename = path.join(projectRoot, "src/lib/catalog-schema.ts");
  if (!existsSync(filename)) return {};
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    console,
    exports: module.exports,
    module,
    require: nativeRequire,
  }, { filename });
  return module.exports;
}

function validSnapshot() {
  return {
    schemaVersion: 1,
    sourceChecksum: "a".repeat(64),
    canonicalSlugSha256: "b".repeat(64),
    categories: [{
      internalId: "category:10",
      legacySourceId: 10,
      sourceName: "HAND TOOLS",
      slug: "hand-tools",
      count: 1,
      parentInternalId: null,
      translation: { locale: "vi", name: "Dụng cụ cầm tay" },
    }],
    products: [{
      internalId: "product:101",
      legacySourceId: 101,
      legacySlug: "test-tool",
      sourceType: "simple",
      productCode: "TEST-101",
      publishedAt: "2026-01-01T00:00:00",
      legacyDescription: "",
      translation: {
        locale: "vi",
        name: "Dụng cụ kiểm thử",
        sourceName: "TEST TOOL",
        canonicalSlug: "dung-cu-kiem-thu",
      },
      categoryRelations: [{
        categoryInternalId: "category:10",
        legacySourceId: 10,
        name: "HAND TOOLS",
        slug: "hand-tools",
      }],
      media: [{ kind: "image", path: "images/products/TEST-101/0.jpg", alt: "Dụng cụ kiểm thử", position: 0 }],
      technicalSpecs: { lines: ["> Điện áp: 20V"] },
      packaging: { table: [["MÃ SẢN PHẨM", "SL/THÙNG"], ["TEST-101", "6"]] },
      attributes: [],
    }],
  };
}

test("catalog schema accepts a complete normalized snapshot", () => {
  const { assertCatalogSnapshot } = loadSchemaModule();
  assert.equal(typeof assertCatalogSnapshot, "function", "assertCatalogSnapshot export must exist");
  assert.doesNotThrow(() => assertCatalogSnapshot(validSnapshot()));
});

test("catalog schema reports malformed normalized product fields", () => {
  const { assertCatalogSnapshot } = loadSchemaModule();
  const snapshot = validSnapshot();
  delete snapshot.products[0].translation.canonicalSlug;
  snapshot.products[0].technicalSpecs.lines = [];
  snapshot.products[0].packaging.table = [];
  assert.throws(
    () => assertCatalogSnapshot(snapshot),
    /products\[0\]\.translation\.canonicalSlug.*products\[0\].*structured technicalSpecs\.lines or packaging\.table/s,
  );
});

test("catalog schema accepts table-only structured specifications", () => {
  const { assertCatalogSnapshot } = loadSchemaModule();
  const snapshot = validSnapshot();
  snapshot.products[0].technicalSpecs.lines = [];
  assert.doesNotThrow(() => assertCatalogSnapshot(snapshot));
});
