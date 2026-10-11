import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (file) => JSON.parse(readFileSync(path.join(projectRoot, file), "utf8"));

test("every category has a unique Vietnamese URL path", () => {
  const { _comment, ...paths } = readJson("src/data/category-paths.json");
  assert.ok(_comment);
  const categories = readJson("src/data/categories.json");
  for (const category of categories) assert.ok(paths[category.slug], `missing path for ${category.slug}`);
  const values = Object.values(paths);
  assert.equal(new Set(values).size, values.length, "category paths must be unique");
  for (const value of values) assert.match(value, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${value} must be a plain lowercase slug`);
  const english = /\b(tools?|equipment|power|ppe|accessories|platform)\b/;
  for (const value of values) assert.doesNotMatch(value.replace(/-/g, " "), english, `${value} still looks English`);
});

function pageFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) return pageFiles(file);
    return name === "page.tsx" ? [file] : [];
  });
}

test("pages build metadata through pageMetadata() instead of partial openGraph objects", () => {
  for (const file of pageFiles(path.join(projectRoot, "src/app"))) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /openGraph:/, `${path.relative(projectRoot, file)} sets openGraph directly`);
  }
});
