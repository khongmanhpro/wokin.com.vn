import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(path.join(projectRoot, file), "utf8");
const css = read("src/app/globals.css");

test("header uses the brand orange with the original white-on-orange logo", () => {
  assert.match(css, /\.site-header \{[^}]*background: var\(--primary\)/);
  assert.doesNotMatch(css, /filter: brightness\(0\) invert\(1\)/);
  assert.match(css, /\.trust-banner \{\s*background: var\(--primary\)/);
});

test("home categories render server-side inside an accessible carousel", () => {
  const home = read("src/app/page.tsx");
  const carousel = read("src/components/CategoryCarousel.tsx");
  assert.match(home, /<CategoryCarousel label="Danh mục sản phẩm">\{categories\.map\(\(category\) => <CategoryCard/);
  assert.match(carousel, /aria-roledescription="carousel"/);
  assert.match(carousel, /prefers-reduced-motion: reduce/);
  assert.match(css, /scroll-snap-type: x mandatory/);
});

test("category controls keep the static grid as the default and only sort client-side on request", () => {
  const archive = read("src/components/CategoryArchive.tsx");
  const browser = read("src/components/CategoryBrowser.tsx");
  assert.match(archive, /<CategoryBrowser slug=\{slug\}[\s\S]*<ProductGrid products=\{visible\}/);
  assert.match(browser, /\{!customised \? children/);
  assert.match(browser, /import\("@\/data\/search-index\.json"\)/);
  assert.match(browser, /\[20, 25, 30\]/);
});

test("product pages switch to two columns from tablet width and offer sharing", () => {
  const product = read("src/app/san-pham/[slug_vi]/page.tsx");
  assert.match(product, /<ShareButtons url=\{canonical\} title=\{name\} \/>/);
  assert.match(css, /@media \(max-width: 767px\) \{\s*\.product-layout \{ grid-template-columns: 1fr; \}/);
  assert.match(read("src/components/ShareButtons.tsx"), /facebook\.com\/sharer\/sharer\.php\?u=\$\{encodeURIComponent\(url\)\}/);
});

test("favicons are self-contained raster W marks for the site and the admin", () => {
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /url: "\/favicon\.ico"/);
  assert.doesNotMatch(layout, /favicon-w\.svg/);
  for (const file of ["public/favicon.ico", "admin/public/favicon.ico"]) {
    const bytes = readFileSync(path.join(projectRoot, file));
    assert.equal(bytes.readUInt16LE(2), 1, `${file} must be an ICO file`);
    assert.ok(bytes.length > 500, `${file} must contain image data`);
  }
  assert.match(read("admin/src/payload.config.ts"), /rel: 'icon', url: '\/favicon\.ico'/);
  assert.match(read("admin/Dockerfile"), /COPY --from=builder --chown=nextjs:nodejs \/app\/public \.\/public/);
});

test("round 2 matches the original's section styles and archive title band", () => {
  assert.match(css, /\.topbar \{ background: #2c333b; \}/);
  assert.match(css, /\.footer \{ background: #2c333b; \}/);
  assert.match(css, /\.split-banner-light \{ background: #ebf2f7;/);
  assert.match(read("src/app/page.tsx"), /reverse light \/>/);
  assert.match(read("src/components/DistributorCta.tsx"), /className="distributor-strip"/);
  assert.match(read("src/components/CategoryArchive.tsx"), /<PageBand title=\{category\.nameVi\} backHref="\/san-pham"/);
  assert.match(css, /\.page-band \{ background: #c8ced2; \}/);
});
