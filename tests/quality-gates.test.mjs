import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const catalogScript = path.join(projectRoot, "scripts/validate-catalog.mjs");
const exportScript = path.join(projectRoot, "scripts/validate-static-export.mjs");
const smokeScript = path.join(projectRoot, "scripts/smoke-static-server.mjs");
const hostingerConfig = path.join(projectRoot, "deploy/hostinger/.htaccess");

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: projectRoot,
    encoding: "utf8",
  });
}

function product(id, slug, sku, category = "hand-tools") {
  return {
    id,
    name: `PRODUCT ${id}`,
    slug,
    sku,
    type: "simple",
    categories: [{ name: "HAND TOOLS", slug: category }],
    images: [{ src: `https://example.test/${slug}.jpg`, alt: `Product ${id}` }],
    short_description: "<p>&gt; Test</p>",
    description: "",
    attributes: [],
  };
}

function makeCatalogFixture(products = [product(1, "product-one", "SKU-1")]) {
  const root = mkdtempSync(path.join(tmpdir(), "wokin-catalog-"));
  const dataDir = path.join(root, "data");
  const publicDir = path.join(root, "public");
  const translations = products.map((item) => ({
    id: item.id,
    sku: item.sku,
    name_en: item.name,
    name_vi: `Sản phẩm ${item.id}`,
    slug_vi: `san-pham-${item.id}`,
  }));
  const manifest = Object.fromEntries(products.map((item) => [
    item.slug,
    { sku: item.sku, images: [`images/products/${item.sku || `missing-${item.id}`}/0.jpg`] },
  ]));

  writeJson(path.join(dataDir, "products.json"), products);
  writeJson(path.join(dataDir, "products_vi.json"), translations);
  writeJson(path.join(dataDir, "categories.json"), [
    { id: 10, name: "HAND TOOLS", slug: "hand-tools", count: products.length, parent: 0 },
  ]);
  writeJson(path.join(dataDir, "product_dates.json"), products.map((item) => ({
    id: item.id,
    slug: item.slug,
    date: "2026-01-01T00:00:00",
  })));
  writeJson(path.join(dataDir, "image_manifest.json"), manifest);
  for (const entry of Object.values(manifest)) {
    for (const image of entry.images) {
      const target = path.join(publicDir, image);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, "fixture image");
    }
  }
  return { root, dataDir, publicDir };
}

function catalogArgs(fixture, ...extra) {
  return ["--data-dir", fixture.dataDir, "--public-dir", fixture.publicDir, ...extra];
}

test("catalog validator accepts a complete catalog fixture", () => {
  const fixture = makeCatalogFixture();
  try {
    const result = run(catalogScript, catalogArgs(fixture));
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Catalog validation passed/);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("catalog validator rejects duplicate Vietnamese slugs", () => {
  const fixture = makeCatalogFixture([
    product(1, "product-one", "SKU-1"),
    product(2, "product-two", "SKU-2"),
  ]);
  try {
    const translationsFile = path.join(fixture.dataDir, "products_vi.json");
    const translations = JSON.parse(readFileSync(translationsFile, "utf8"));
    translations[1].slug_vi = translations[0].slug_vi;
    writeJson(translationsFile, translations);
    const result = run(catalogScript, catalogArgs(fixture));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /slug_vi.*duy nhất/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("catalog validator rejects unknown category references", () => {
  const fixture = makeCatalogFixture([product(1, "product-one", "SKU-1", "unknown")]);
  try {
    const result = run(catalogScript, catalogArgs(fixture));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /danh mục.*không tồn tại/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("catalog validator rejects missing local image targets", () => {
  const fixture = makeCatalogFixture();
  try {
    rmSync(path.join(fixture.publicDir, "images/products/SKU-1/0.jpg"));
    const result = run(catalogScript, catalogArgs(fixture));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ảnh local không tồn tại/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("duplicate SKUs fail unless explicitly allowlisted and remain reported", () => {
  const fixture = makeCatalogFixture([
    product(1, "product-one", "SHARED"),
    product(2, "product-two", "SHARED"),
  ]);
  try {
    const rejected = run(catalogScript, catalogArgs(fixture));
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /SKU trùng.*SHARED/i);

    const allowed = run(catalogScript, catalogArgs(fixture, "--allow-duplicate-sku", "SHARED"));
    assert.equal(allowed.status, 0, allowed.stderr || allowed.stdout);
    assert.match(allowed.stdout, /SKU trùng được cho phép.*SHARED/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("an explicitly allowlisted missing SKU uses the product slug as its image key", () => {
  const fixture = makeCatalogFixture([product(1, "product-one", "")]);
  try {
    const manifestFile = path.join(fixture.dataDir, "image_manifest.json");
    const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
    manifest["product-one"].sku = "product-one";
    writeJson(manifestFile, manifest);
    const result = run(catalogScript, catalogArgs(fixture, "--allow-missing-sku-id", "1"));
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /SKU trống được cho phép.*1/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

function pageHtml(route, { title = route || "Trang chủ", body = "" } = {}) {
  const pathname = route ? `/${route}/` : "/";
  return `<!doctype html><html lang="vi"><head><title>${title} | WOKIN TOOLS</title><link rel="canonical" href="https://wokin.com.vn${pathname}"></head><body>${body}</body></html>`;
}

function writeRoute(outDir, route, html) {
  const directory = path.join(outDir, route.replace(/^\//, ""));
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "index.html"), html);
}

function makeExportFixture() {
  const catalog = makeCatalogFixture([
    product(1, "product-one", "SKU-1"),
    product(2, "product-two", "SKU-2"),
  ]);
  const outDir = path.join(catalog.root, "out");
  const routes = [
    "", "san-pham", "san-pham-moi", "gp20v", "gioi-thieu", "lien-he", "nha-phan-phoi",
    "danh-muc/hand-tools", "san-pham/san-pham-1", "san-pham/san-pham-2",
  ];
  const links = routes.map((route) => `<a href="/${route}${route ? "/" : ""}">${route || "home"}</a>`).join("");
  for (const route of routes) {
    const title = route.startsWith("san-pham/san-pham-") ? "Sản phẩm trùng" : (route || "Trang chủ");
    writeRoute(outDir, route, pageHtml(route, { title, body: route === "" ? links : '<img src="/images/logo.png">' }));
  }
  mkdirSync(path.join(outDir, "images"), { recursive: true });
  writeFileSync(path.join(outDir, "images/logo.png"), "fixture image");
  const urls = routes.map((route) => `<url><loc>https://wokin.com.vn/${route}${route ? "/" : ""}</loc></url>`).join("");
  writeFileSync(path.join(outDir, "sitemap.xml"), `<?xml version="1.0"?><urlset>${urls}</urlset>`);
  writeFileSync(path.join(outDir, "robots.txt"), "User-Agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://wokin.com.vn/sitemap.xml\n");
  return { ...catalog, outDir };
}

function exportArgs(fixture) {
  return ["--out-dir", fixture.outDir, "--data-dir", fixture.dataDir];
}

test("export validator accepts complete routes and reports temporary duplicate titles", () => {
  const fixture = makeExportFixture();
  try {
    const result = run(exportScript, exportArgs(fixture));
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Static export validation passed/);
    assert.match(result.stdout, /TODO Phase 5.*duplicate product title/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("export validator rejects canonical mismatches", () => {
  const fixture = makeExportFixture();
  try {
    const file = path.join(fixture.outDir, "lien-he/index.html");
    writeFileSync(file, readFileSync(file, "utf8").replace("/lien-he/", "/wrong/"));
    const result = run(exportScript, exportArgs(fixture));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /canonical.*lien-he/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("export validator rejects legacy HTML output", () => {
  const fixture = makeExportFixture();
  try {
    writeRoute(fixture.outDir, "about", pageHtml("about"));
    const result = run(exportScript, exportArgs(fixture));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /legacy route.*about/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("export validator rejects robots rules that block Next.js assets", () => {
  const fixture = makeExportFixture();
  try {
    writeFileSync(path.join(fixture.outDir, "robots.txt"), "User-Agent: *\nAllow: /\nDisallow: /_next/\nDisallow: /api/\nSitemap: https://wokin.com.vn/sitemap.xml\n");
    const result = run(exportScript, exportArgs(fixture));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /không được chặn \/_next\//i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("export validator rejects source-domain leaks", () => {
  const fixture = makeExportFixture();
  try {
    writeFileSync(path.join(fixture.outDir, "leak.js"), "const source = 'https://www.wokintools.com/leak';");
    const result = run(exportScript, exportArgs(fixture));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /source-domain leak.*leak\.js/i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("export validator rejects missing internal navigation targets", () => {
  const fixture = makeExportFixture();
  try {
    const file = path.join(fixture.outDir, "index.html");
    writeFileSync(file, readFileSync(file, "utf8").replace("</body>", '<a href="/missing/">Missing</a></body>'));
    const result = run(exportScript, exportArgs(fixture));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /internal target.*\/missing\//i);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("static server smoke-check serves clean trailing-slash routes", () => {
  const fixture = makeExportFixture();
  try {
    const result = run(smokeScript, exportArgs(fixture));
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Static server smoke passed/);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("Hostinger config declares exact one-step Vietnamese canonical redirects", () => {
  const config = readFileSync(hostingerConfig, "utf8");
  const expected = [
    ["about", "gioi-thieu"],
    ["contact", "lien-he"],
    ["distributors", "nha-phan-phoi"],
  ];
  for (const [legacy, canonical] of expected) {
    assert.match(config, new RegExp(`RewriteRule \\^${legacy}\\/\\?\\$ \\/${canonical}\\/ \\[R=301,L,NE\\]`));
  }
});
