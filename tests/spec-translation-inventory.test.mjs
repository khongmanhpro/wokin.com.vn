import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const inventoryUrl = new URL("../scripts/spec-translation-inventory.mjs", import.meta.url);

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

test("inventory uses the shared legacy parser and reports deterministic missing batches", async () => {
  const { collectSpecTranslationInventory } = await import(`${inventoryUrl.href}?test=${Date.now()}`);
  const root = mkdtempSync(path.join(tmpdir(), "wokin-spec-inventory-"));
  try {
    writeJson(path.join(root, "products.json"), [
      { id: 2, short_description: "<p>&gt; Voltage: 20V<br>&gt; Suitable for workshop use.</p><table><tr><th>STOCK NO.</th><th>QTY./CARTON</th></tr><tr><td>ABC-2</td><td>6</td></tr></table>" },
      { id: 1, short_description: "<p>&gt; Voltage: 20V<br>&gt; Thermal motor protection.</p><table><tr><td>STOCK NO.</td><td>QTY./CARTON</td></tr></table>" },
    ]);
    writeJson(path.join(root, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: { "> Voltage: 20V": "> Điện áp: 20V" },
      cells: { "STOCK NO.": "MÃ SẢN PHẨM" },
    });
    const inventory = collectSpecTranslationInventory({
      sourceDir: root,
      translationFile: path.join(root, "spec-translations-vi.json"),
    });
    assert.deepEqual(inventory.summary.lines, { unique: 3, translated: 1, missing: 2, occurrences: 4 });
    assert.deepEqual(inventory.summary.cells, { unique: 3, translated: 1, missing: 2, occurrences: 5 });
    assert.deepEqual(inventory.missing.slice(0, 3).map(({ kind, source }) => `${kind}:${source}`), [
      "cell:QTY./CARTON",
      "cell:ABC-2",
      "line:> Suitable for workshop use.",
    ]);
    assert.equal(inventory.parserErrors.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("inventory exposes parser errors with product context", async () => {
  const { collectSpecTranslationInventory } = await import(`${inventoryUrl.href}?test=${Date.now()}-errors`);
  const root = mkdtempSync(path.join(tmpdir(), "wokin-spec-inventory-errors-"));
  try {
    writeJson(path.join(root, "products.json"), [{ id: 42, short_description: "<table><tr><td>broken" }]);
    const inventory = collectSpecTranslationInventory({ sourceDir: root });
    assert.match(inventory.parserErrors[0], /product 42: /);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
