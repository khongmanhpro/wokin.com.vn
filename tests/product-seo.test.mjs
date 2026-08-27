import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const projectRoot = path.resolve(import.meta.dirname, "..");
const nativeRequire = createRequire(import.meta.url);

function loadTypeScriptModule(relativePath) {
  const filename = path.join(projectRoot, relativePath);
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

  function localRequire(specifier) {
    if (specifier.startsWith("@/data/") && specifier.endsWith(".json")) {
      return JSON.parse(readFileSync(path.join(projectRoot, "src", specifier.slice(2)), "utf8"));
    }
    if (specifier.startsWith("@/lib/")) {
      return loadTypeScriptModule(path.join("src", `${specifier.slice(2)}.ts`));
    }
    return nativeRequire(specifier);
  }

  vm.runInNewContext(output, { console, exports: module.exports, module, require: localRequire }, { filename });
  return module.exports;
}

function loadCatalog() {
  return loadTypeScriptModule("src/lib/catalog.ts");
}

test("product SEO names disambiguate only repeated Vietnamese names", () => {
  const { getAllProducts, productSeoName } = loadCatalog();
  assert.equal(typeof productSeoName, "function");
  const products = getAllProducts();
  const groups = new Map();
  for (const product of products) groups.set(product.name, [...(groups.get(product.name) ?? []), product]);

  const seoNames = products.map((product) => {
    const group = groups.get(product.name);
    const result = productSeoName(product);
    if (group.length === 1) assert.equal(result, product.name);
    else {
      const sameSku = group.filter((candidate) => candidate.sku && candidate.sku === product.sku);
      if (product.sku && sameSku.length === 1) assert.equal(result, `${product.name} – SKU ${product.sku}`);
      else assert.equal(result, `${product.name} – ID ${product.id}`);
    }
    return result;
  });

  assert.equal(new Set(seoNames).size, products.length);
});

test("product descriptions are factual, non-empty, and unique", () => {
  const { getAllProducts, productDescription } = loadCatalog();
  const descriptions = getAllProducts().map((product) => productDescription(product));
  assert.ok(descriptions.every((description) => description.trim().length > 0));
  assert.ok(descriptions.every((description) => !/mã\s*,/i.test(description)));
  assert.equal(new Set(descriptions).size, descriptions.length);
});
