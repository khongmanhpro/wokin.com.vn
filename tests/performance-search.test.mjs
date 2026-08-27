import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const readJson = (relativePath) => JSON.parse(readFileSync(path.join(projectRoot, relativePath), "utf8"));

test("search index is lightweight and contains only searchable catalog fields", () => {
  const index = readJson("src/data/search-index.json");
  assert.equal(index.length, 1357);
  for (const product of index) {
    assert.deepEqual(Object.keys(product).sort(), ["categories", "id", "name", "sku", "slug"]);
    assert.equal(typeof product.id, "number");
    assert.equal(typeof product.name, "string");
    assert.equal(typeof product.sku, "string");
    assert.equal(typeof product.slug, "string");
    assert.ok(Array.isArray(product.categories));
  }
});

test("search index supports Vietnamese name and SKU matching", () => {
  const index = readJson("src/data/search-index.json");
  const search = (query) => index.filter((product) => `${product.name} ${product.sku}`.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi")));
  assert.ok(search("máy thổi dùng pin 20v").some((product) => product.id === 10463));
  assert.ok(search("621821").some((product) => product.slug === "may-thoi-dung-pin-20v-li-ion-khong-choi-than-cong-nghiep"));
});

test("Header lazy-loads search data instead of bundling the full product catalog", () => {
  const header = readFileSync(path.join(projectRoot, "src/components/Header.tsx"), "utf8");
  assert.doesNotMatch(header, /products_vi\.json|catalog\.generated\.json/);
  assert.match(header, /import\("@\/data\/search-index\.json"\)/);
  assert.match(header, /setSearchProducts\(module\.default as SearchProduct\[\]\)/);
});

test("catalog image components declare responsive display sizes", () => {
  const cards = readFileSync(path.join(projectRoot, "src/components/CatalogCards.tsx"), "utf8");
  const gallery = readFileSync(path.join(projectRoot, "src/components/ProductGallery.tsx"), "utf8");
  assert.match(cards, /sizes="\(max-width: 767px\) 50vw/);
  assert.match(gallery, /sizes="\(max-width: 767px\) 100vw, 800px"/);
  assert.match(gallery, /sizes="120px"/);
});
