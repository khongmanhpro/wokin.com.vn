import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const inventoryUrl = new URL("../scripts/spec-translation-inventory.mjs", import.meta.url);
const utilsUrl = new URL("../scripts/spec-translation-utils.mjs", import.meta.url);

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
    assert.deepEqual(inventory.summary.lines, { unique: 3, translated: 1, notNeeded: 0, missing: 2, occurrences: 4 });
    assert.deepEqual(inventory.summary.cells, { unique: 3, translated: 1, notNeeded: 1, missing: 1, occurrences: 5 });
    assert.deepEqual(inventory.missing.slice(0, 3).map(({ kind, source }) => `${kind}:${source}`), [
      "line:> Suitable for workshop use.",
      "line:> Thermal motor protection.",
      "cell:QTY./CARTON",
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

test("needsTranslation ignores measurements, units, and model codes but keeps real words", async () => {
  const { needsTranslation } = await import(`${utilsUrl.href}?test=${Date.now()}-allowlist`);
  assert.equal(needsTranslation("115×22.2mm"), false);
  assert.equal(needsTranslation("100pcs"), false);
  assert.equal(needsTranslation("ABC-2"), false);
  assert.equal(needsTranslation("GP20V"), false);
  assert.equal(needsTranslation("M14"), false);
  assert.equal(needsTranslation("ABC-2"), false);
  assert.equal(needsTranslation("40Cr"), false);
  assert.equal(needsTranslation("Cr-V"), false);
  assert.equal(needsTranslation("2Tx3M-Green"), true);
  assert.equal(needsTranslation("4 inch"), false);
  assert.equal(needsTranslation("Suitable for workshop use."), true);
  assert.equal(needsTranslation("2 pcs battery pack"), true);
  assert.equal(needsTranslation("in one bag"), true);
  assert.equal(needsTranslation("> Đầu phun: 2mm"), false);
  assert.equal(needsTranslation("> Đầu ren NPT 1/4″"), false);
  assert.equal(needsTranslation("> Đèn LED tích hợp"), false);
  assert.equal(needsTranslation("> Kích thước with case"), true);
  assert.equal(needsTranslation("The size"), true);
});

test("inventory applies label translations before listing free lines", async () => {
  const { collectSpecTranslationInventory } = await import(`${inventoryUrl.href}?test=${Date.now()}-labels`);
  const root = mkdtempSync(path.join(tmpdir(), "wokin-spec-inventory-labels-"));
  try {
    writeJson(path.join(root, "products.json"), [
      { id: 1, short_description: "<p>&gt; Input power: 20W<br>&gt; Magazine capacity: 125pcs<br>&gt; Rated current: 2A<br>&gt; Suitable for workshop use.<br>&gt; Size: 115mm</p><table><tr><td>ABC-2</td><td>RED</td></tr></table>" },
    ]);
    writeJson(path.join(root, "spec-translations-vi.json"), {
      schemaVersion: 1,
      lines: {},
      labels: { "input power": "Công suất đầu vào", "magazine capacity": "Sức chứa hộp đạn", size: "Kích thước" },
      cells: {},
    });
    const inventory = collectSpecTranslationInventory({
      sourceDir: root,
      translationFile: path.join(root, "spec-translations-vi.json"),
      generatedFile: path.join(root, "missing-generated.json"),
    });
    assert.deepEqual(inventory.summary.lines, { unique: 5, translated: 2, notNeeded: 0, missing: 3, occurrences: 5 });
    assert.deepEqual(inventory.summary.cells, { unique: 2, translated: 0, notNeeded: 1, missing: 1, occurrences: 2 });
    assert.equal(inventory.summary.labels.missing, 1);
    assert.ok(inventory.missing.some((entry) => entry.kind === "label" && entry.source === "rated current"));
    assert.ok(inventory.missing.some((entry) => entry.kind === "line" && entry.source === "> Magazine capacity: 125pcs"));
    assert.ok(inventory.missing.some((entry) => entry.kind === "line" && entry.source === "> Suitable for workshop use."));
    assert.equal(inventory.missing.at(-1).kind, "cell");
    assert.equal(inventory.missing.at(-1).source, "RED");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("English remainder is measured from the generated snapshot and exposes top words", async () => {
  const { collectSpecTranslationInventory } = await import(`${inventoryUrl.href}?test=${Date.now()}-generated-remainder`);
  const root = mkdtempSync(path.join(tmpdir(), "wokin-spec-inventory-generated-"));
  try {
    writeJson(path.join(root, "products.json"), [{ id: 1, short_description: "<p>&gt; Voltage: 20V</p>" }]);
    writeJson(path.join(root, "spec-translations-vi.json"), { schemaVersion: 1, lines: {}, cells: {} });
    writeJson(path.join(root, "catalog.generated.json"), {
      products: [{ technicalSpecs: { lines: ["> Suitable for workshop use.", "> Điện áp: 20V", "> Hoàn thiện satin", "> Đóng gói: 1 hộp"], }, packaging: { table: [["RED", "20mm"]] } }],
    });
    const inventory = collectSpecTranslationInventory({
      sourceDir: root,
      translationFile: path.join(root, "spec-translations-vi.json"),
      generatedFile: path.join(root, "catalog.generated.json"),
    });
    assert.equal(inventory.summary.remainingEnglish.unique, 2);
    assert.equal(inventory.summary.remainingEnglish.occurrences, 2);
    assert.deepEqual(inventory.summary.remainingEnglish.mixedVietnameseEnglish, { unique: 0, occurrences: 0 });
    assert.ok(inventory.summary.remainingEnglish.topWords.some(([word, count]) => word === "suitable" && count === 1));
    assert.ok(inventory.summary.remainingEnglish.topWords.some(([word, count]) => word === "workshop" && count === 1));
    assert.ok(!inventory.summary.remainingEnglish.topWords.some(([word]) => word === "satin"));
    assert.ok(!inventory.summary.remainingEnglish.topWords.some(([word]) => word === "hop"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
