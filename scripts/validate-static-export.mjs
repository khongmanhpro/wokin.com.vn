import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATIC_ROUTES = ["/", "/san-pham/", "/san-pham-moi/", "/gp20v/", "/gioi-thieu/", "/lien-he/", "/nha-phan-phoi/"];
const LEGACY_STATIC_ROUTES = new Set(["/about/", "/contact/", "/distributors/"]);
const PRODUCTS_PER_PAGE = 20;
const TEXT_EXTENSIONS = new Set([".html", ".js", ".json", ".xml", ".txt", ".css", ".map"]);

function parseArgs(argv) {
  const options = {
    outDir: path.join(projectRoot, "out"),
    dataDir: path.join(projectRoot, "src/data"),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://wokin.vn",
  };
  for (let index = 0; index < argv.length; index += 2) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (!value) throw new Error(`Thiếu giá trị cho ${argument}.`);
    if (argument === "--out-dir") options.outDir = path.resolve(value);
    else if (argument === "--data-dir") options.dataDir = path.resolve(value);
    else if (argument === "--site-url") options.siteUrl = value;
    else throw new Error(`Đối số không hợp lệ: ${argument}.`);
  }
  return options;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function routePath(value) {
  let pathname = new URL(value, "https://validation.invalid").pathname;
  if (pathname !== "/" && !path.extname(pathname) && !pathname.endsWith("/")) pathname += "/";
  return pathname;
}

function expectedRoutes(dataDir) {
  const snapshotFile = path.join(dataDir, "catalog.generated.json");
  const snapshot = existsSync(snapshotFile) ? readJson(snapshotFile) : undefined;
  const products = snapshot
    ? snapshot.products.map((product) => ({
      categories: product.categoryRelations,
      id: product.legacySourceId,
      sku: product.productCode ?? "",
    }))
    : readJson(path.join(dataDir, "products.json"));
  const translations = snapshot
    ? snapshot.products.map((product) => ({
      id: product.legacySourceId,
      slug_vi: product.translation.canonicalSlug,
    }))
    : readJson(path.join(dataDir, "products_vi.json"));
  const categories = snapshot?.categories ?? readJson(path.join(dataDir, "categories.json"));
  const slugsById = new Map(translations.map((translation) => [translation.id, translation.slug_vi]));
  const routes = new Set(STATIC_ROUTES);
  for (const product of products) {
    const slug = slugsById.get(product.id);
    if (!slug) throw new Error(`Thiếu slug_vi cho product ID ${product.id}.`);
    routes.add(`/san-pham/${slug}/`);
  }
  for (const category of categories) {
    const count = products.filter((product) => product.categories?.some((reference) => reference.slug === category.slug)).length;
    const pages = Math.max(1, Math.ceil(count / PRODUCTS_PER_PAGE));
    routes.add(`/danh-muc/${category.slug}/`);
    for (let page = 2; page <= pages; page += 1) routes.add(`/danh-muc/${category.slug}/trang/${page}/`);
  }
  return { routes, products, translations };
}

function htmlFileForRoute(outDir, route) {
  return route === "/" ? path.join(outDir, "index.html") : path.join(outDir, route.slice(1), "index.html");
}

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(target));
    else files.push(target);
  }
  return files;
}

function decodeHtml(value) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function canonicalFromHtml(html) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const canonicalTags = tags.filter((tag) => /\brel=["']canonical["']/i.test(tag));
  return canonicalTags.map((tag) => decodeHtml(tag.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? ""));
}

function titleFromHtml(html) {
  return decodeHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "");
}

function metaDescriptionFromHtml(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const description = tags.find((tag) => /\bname=["']description["']/i.test(tag));
  return decodeHtml(description?.match(/\bcontent=["']([^"']*)["']/i)?.[1]?.trim() ?? "");
}

function h1FromHtml(html) {
  const matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  return matches.map((match) => decodeHtml(match[1].replace(/<[^>]*>/g, "").trim()));
}

function jsonLdFromHtml(html, route, errors) {
  const values = [];
  for (const match of html.matchAll(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      values.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch (error) {
      errors.push(`JSON-LD không parse được cho ${route}: ${error.message}.`);
    }
  }
  return values;
}

function targetExists(outDir, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  if (decoded.split("/").includes("..")) return false;
  const relative = decoded.replace(/^\/+/, "");
  if (!relative) return existsSync(path.join(outDir, "index.html"));
  const direct = path.join(outDir, relative);
  if (path.extname(decoded)) return existsSync(direct) && statSync(direct).isFile();
  return existsSync(path.join(direct, "index.html"));
}

export function validateStaticExport(options) {
  const errors = [];
  const reports = [];
  if (!existsSync(options.outDir)) return { errors: [`Export directory không tồn tại: ${options.outDir}.`], reports };
  const site = new URL(options.siteUrl);
  const { routes, products, translations } = expectedRoutes(options.dataDir);
  const productRoutes = new Set(translations.map((translation) => `/san-pham/${translation.slug_vi}/`));
  const productById = new Map(products.map((product) => [product.id, product]));
  const productByRoute = new Map(translations.map((translation) => [
    `/san-pham/${translation.slug_vi}/`,
    productById.get(translation.id),
  ]));
  const productTitles = new Map();
  const productH1s = new Map();
  let validProductJsonLd = 0;

  for (const route of LEGACY_STATIC_ROUTES) {
    const file = htmlFileForRoute(options.outDir, route);
    if (existsSync(file)) errors.push(`Legacy route vẫn có HTML output: ${route} (${file}).`);
  }

  for (const route of routes) {
    const file = htmlFileForRoute(options.outDir, route);
    if (!existsSync(file)) {
      errors.push(`Expected route thiếu target: ${route} (${file}).`);
      continue;
    }
    const html = readFileSync(file, "utf8");
    const canonicals = canonicalFromHtml(html);
    const expectedCanonical = new URL(route, site).toString();
    if (canonicals.length !== 1 || canonicals[0] !== expectedCanonical) errors.push(`Canonical sai cho ${route}: expected ${expectedCanonical}; found ${canonicals.join(", ") || "none"}.`);
    if (canonicals.some((canonical) => canonical.includes(".html"))) errors.push(`Canonical chứa .html cho ${route}.`);
    if (productRoutes.has(route)) {
      const title = titleFromHtml(html);
      if (!title) errors.push(`Product title trống cho ${route}.`);
      productTitles.set(route, title);
      const descriptions = metaDescriptionFromHtml(html);
      if (!descriptions) errors.push(`Meta description trống cho ${route}.`);
      const h1s = h1FromHtml(html);
      if (h1s.length !== 1 || !h1s[0]) errors.push(`Product H1 không hợp lệ cho ${route}: found ${h1s.length}.`);
      else {
        productH1s.set(route, h1s[0]);
        if (title !== `${h1s[0]} | WOKIN TOOLS`) errors.push(`Product title không khớp H1 cho ${route}: ${title}.`);
      }

      const jsonLd = jsonLdFromHtml(html, route, errors);
      const productRecords = jsonLd.filter((record) => record && typeof record === "object" && record["@type"] === "Product");
      if (productRecords.length !== 1) errors.push(`Product JSON-LD không hợp lệ cho ${route}: found ${productRecords.length} Product record(s).`);
      else {
        const record = productRecords[0];
        const sourceProduct = productByRoute.get(route);
        const expectedSku = sourceProduct?.sku?.trim() ?? "";
        const requiredStringFields = ["name", "description", "url"];
        for (const field of requiredStringFields) {
          if (typeof record[field] !== "string" || !record[field].trim()) errors.push(`Product JSON-LD thiếu ${field} cho ${route}.`);
        }
        if (record.name !== h1s[0]) errors.push(`Product JSON-LD name không khớp H1 cho ${route}.`);
        if (record.description !== descriptions) errors.push(`Product JSON-LD description không khớp meta description cho ${route}.`);
        if (record.url !== expectedCanonical) errors.push(`Product JSON-LD url không khớp canonical cho ${route}.`);
        if (!Array.isArray(record.image) || record.image.length === 0 || record.image.some((image) => typeof image !== "string" || !image.trim())) errors.push(`Product JSON-LD image không hợp lệ cho ${route}.`);
        if (!record.brand || typeof record.brand !== "object" || typeof record.brand.name !== "string" || !record.brand.name.trim()) errors.push(`Product JSON-LD brand không hợp lệ cho ${route}.`);
        if (Object.hasOwn(record, "sku") && (typeof record.sku !== "string" || !record.sku.trim())) {
          errors.push(`Product JSON-LD có sku trống cho ${route}.`);
        } else if (expectedSku) {
          if (record.sku !== expectedSku) errors.push(`Product JSON-LD sku sai cho ${route}: expected ${expectedSku}; found ${record.sku ?? "none"}.`);
        } else if (Object.hasOwn(record, "sku")) {
          errors.push(`Product JSON-LD không được chứa sku trống cho ${route}.`);
        }
        for (const forbidden of ["offers", "price", "availability", "review", "reviews", "aggregateRating"]) {
          if (Object.hasOwn(record, forbidden)) errors.push(`Product JSON-LD không được chứa ${forbidden} cho ${route}.`);
        }
        validProductJsonLd += 1;
      }

      const breadcrumbs = jsonLd.filter((record) => record && typeof record === "object" && record["@type"] === "BreadcrumbList");
      if (breadcrumbs.length !== 1) errors.push(`Breadcrumb JSON-LD không hợp lệ cho ${route}: found ${breadcrumbs.length} record(s).`);
      else {
        const items = breadcrumbs[0].itemListElement;
        const lastItem = Array.isArray(items) ? items.at(-1) : undefined;
        if (!lastItem || lastItem.name !== h1s[0]) errors.push(`Breadcrumb JSON-LD không khớp H1 cho ${route}.`);
        if (lastItem?.item !== undefined && lastItem.item !== expectedCanonical) errors.push(`Breadcrumb JSON-LD không khớp canonical cho ${route}.`);
      }
    }
  }

  const sitemapFile = path.join(options.outDir, "sitemap.xml");
  if (!existsSync(sitemapFile)) errors.push("Thiếu sitemap.xml.");
  else {
    const sitemap = readFileSync(sitemapFile, "utf8");
    const locations = [...sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => decodeHtml(match[1].trim()));
    const sitemapRoutes = new Set();
    for (const location of locations) {
      let url;
      try { url = new URL(location); } catch { errors.push(`Sitemap URL không hợp lệ: ${location}.`); continue; }
      if (url.origin !== site.origin) errors.push(`Sitemap URL sai origin: ${location}.`);
      if (url.pathname.includes(".html")) errors.push(`Sitemap URL chứa .html: ${location}.`);
      sitemapRoutes.add(routePath(url.toString()));
    }
    for (const route of routes) if (!sitemapRoutes.has(route)) errors.push(`Sitemap thiếu expected route: ${route}.`);
    for (const route of sitemapRoutes) if (!routes.has(route)) errors.push(`Sitemap có route ngoài expected set: ${route}.`);
    if (locations.length !== sitemapRoutes.size) errors.push(`Sitemap có URL trùng: ${locations.length - sitemapRoutes.size}.`);
  }

  const robotsFile = path.join(options.outDir, "robots.txt");
  if (!existsSync(robotsFile)) errors.push("Thiếu robots.txt.");
  else {
    const robots = readFileSync(robotsFile, "utf8");
    if (!/^User-Agent:\s*\*/im.test(robots)) errors.push("robots.txt thiếu User-Agent: *.");
    if (/^Disallow:\s*\/_next\//im.test(robots)) errors.push("robots.txt không được chặn /_next/.");
    if (!/^Disallow:\s*\/api\//im.test(robots)) errors.push("robots.txt thiếu Disallow: /api/.");
    const sitemapLine = robots.match(/^Sitemap:\s*(\S+)/im)?.[1];
    if (sitemapLine !== new URL("/sitemap.xml", site).toString()) errors.push(`robots.txt sitemap sai: ${sitemapLine ?? "none"}.`);
  }

  const files = walk(options.outDir);
  for (const file of files) {
    if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
    const content = readFileSync(file, "utf8");
    const relativeFile = path.relative(options.outDir, file);
    if (/\b(?:www\.)?wokintools\.com\b/i.test(content)) errors.push(`Source-domain leak trong ${relativeFile}.`);
    if (path.extname(file) !== ".html") continue;
    const pageRoute = `/${path.relative(options.outDir, path.dirname(file)).split(path.sep).filter(Boolean).join("/")}${path.dirname(file) === options.outDir ? "" : "/"}`;
    for (const match of content.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
      for (const candidate of decodeHtml(match[1]).split(",")) {
        const reference = candidate.trim().split(/\s+/, 1)[0];
        if (!reference) continue;
        let url;
        try { url = new URL(reference, new URL(pageRoute, site)); } catch { errors.push(`Responsive image URL không parse được trong ${relativeFile}: ${reference}.`); continue; }
        if (url.origin === site.origin && url.pathname.startsWith("/images/products-responsive/") && !targetExists(options.outDir, url.pathname)) {
          errors.push(`Responsive image derivative target bị thiếu trong ${relativeFile}: ${url.pathname}.`);
        }
      }
    }
    for (const match of content.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
      const reference = decodeHtml(match[1]);
      if (!reference || reference.startsWith("#") || /^(?:mailto|tel|data|javascript):/i.test(reference)) continue;
      let url;
      try { url = new URL(reference, new URL(pageRoute, site)); } catch { errors.push(`URL nội bộ không parse được trong ${relativeFile}: ${reference}.`); continue; }
      if (url.origin !== site.origin) continue;
      if (url.pathname.startsWith("/images/products-responsive/") && !targetExists(options.outDir, url.pathname)) {
        errors.push(`Responsive image derivative target bị thiếu trong ${relativeFile}: ${url.pathname}.`);
        continue;
      }
      if (url.pathname.startsWith("/images/") || url.pathname.startsWith("/_next/")) continue;
      if (LEGACY_STATIC_ROUTES.has(routePath(url.toString()))) errors.push(`Internal URL dùng legacy route trong ${relativeFile}: ${url.pathname}.`);
      if (url.pathname.endsWith(".html")) errors.push(`Internal URL chứa .html trong ${relativeFile}: ${url.pathname}.`);
      if (!targetExists(options.outDir, url.pathname)) errors.push(`Internal target bị thiếu trong ${relativeFile}: ${url.pathname}.`);
    }
  }

  const titlesToRoutes = new Map();
  for (const [route, title] of productTitles) titlesToRoutes.set(title, [...(titlesToRoutes.get(title) ?? []), route]);
  const duplicateTitles = [...titlesToRoutes.entries()].filter(([, groupedRoutes]) => groupedRoutes.length > 1);
  if (duplicateTitles.length) {
    const summary = duplicateTitles.map(([title, groupedRoutes]) => `${title} [${groupedRoutes.join(", ")}]`).join("; ");
    errors.push(`Duplicate product titles: ${summary}`);
  }
  const h1sToRoutes = new Map();
  for (const [route, h1] of productH1s) h1sToRoutes.set(h1, [...(h1sToRoutes.get(h1) ?? []), route]);
  const duplicateH1s = [...h1sToRoutes.entries()].filter(([, groupedRoutes]) => groupedRoutes.length > 1);
  if (duplicateH1s.length) {
    const summary = duplicateH1s.map(([h1, groupedRoutes]) => `${h1} [${groupedRoutes.join(", ")}]`).join("; ");
    errors.push(`Duplicate product H1 values: ${summary}`);
  }

  return { errors: [...new Set(errors)], reports, summary: { expectedRoutes: routes.size, checkedFiles: files.length, productRoutes: productRoutes.size, duplicateTitleGroups: duplicateTitles.length, duplicateH1Groups: duplicateH1s.length, validProductJsonLd } };
}

function main() {
  let options;
  try { options = parseArgs(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; return; }
  let result;
  try { result = validateStaticExport(options); }
  catch (error) { console.error(`Static export validation crashed: ${error.message}`); process.exitCode = 1; return; }
  for (const report of result.reports) console.log(`REPORT: ${report}`);
  if (result.errors.length) {
    for (const error of result.errors) console.error(`ERROR: ${error}`);
    console.error(`Static export validation failed with ${result.errors.length} error(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`Static export validation passed: ${result.summary.expectedRoutes} expected routes, ${result.summary.checkedFiles} artifact files checked, ${result.summary.productRoutes} product routes, ${result.summary.duplicateTitleGroups} duplicate product title group(s), ${result.summary.duplicateH1Groups} duplicate product H1 group(s), ${result.summary.validProductJsonLd} Product JSON-LD record(s) validated.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
