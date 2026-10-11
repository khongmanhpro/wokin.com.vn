import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(path.join(projectRoot, file), "utf8");

test("footer policy labels link to real Vietnamese policy pages", () => {
  const footer = read("src/components/Footer.tsx");
  assert.match(footer, /<Link href="\/chinh-sach-cookie\/">/);
  assert.match(footer, /<Link href="\/chinh-sach-bao-mat\/">/);
  for (const route of ["chinh-sach-bao-mat", "chinh-sach-cookie"]) {
    const page = read(`src/app/${route}/page.tsx`);
    assert.match(page, new RegExp(`const canonical = "/${route}/"`));
    assert.match(page, /<h1 className="page-title">/);
  }
  assert.match(read("src/lib/site.ts"), /"\/chinh-sach-bao-mat",\n\s*"\/chinh-sach-cookie"/);
});

test("floating quick actions use verified contact links and respect reduced motion", () => {
  const actions = read("src/components/FloatingActions.tsx");
  assert.match(read("src/app/layout.tsx"), /<FloatingActions \/>/);
  assert.match(actions, /href=\{companyContact\.zaloHref\} target="_blank" rel="noreferrer"/);
  assert.match(actions, /href=\{companyContact\.hotlineHref\}/);
  assert.match(actions, /prefers-reduced-motion: reduce/);
  assert.match(actions, /aria-label="Về đầu trang"/);
});

test("search results show the product's own thumbnail", () => {
  const header = read("src/components/Header.tsx");
  assert.match(header, /src=\{product\.image \?\? "\/images\/logo\.png"\}/);
});
