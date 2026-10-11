import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const settings = JSON.parse(readFileSync(path.join(projectRoot, "src/data/site-settings.json"), "utf8"));
const parser = readFileSync(path.join(projectRoot, "src/lib/site-settings.ts"), "utf8");
const header = readFileSync(path.join(projectRoot, "src/components/Header.tsx"), "utf8");
const footer = readFileSync(path.join(projectRoot, "src/components/Footer.tsx"), "utf8");

const isSafeHref = (url) => (url.startsWith("/") && !url.startsWith("//")) || /^https?:\/\//.test(url);

test("committed site settings keep the current menu and only safe links", () => {
  assert.equal(settings.version, 1);
  const header = settings.navigation.header;
  assert.deepEqual(header.map((item) => item.url), ["/san-pham", "/gp20v", "/san-pham-moi", "/gioi-thieu/"]);
  assert.deepEqual(header[3].children.map((item) => item.url), ["/gioi-thieu/", "/lien-he/", "/nha-phan-phoi/"]);
  const links = [...header, ...header.flatMap((item) => item.children), ...settings.navigation.footer];
  assert.ok(links.every((item) => item.label.trim() && isSafeHref(item.url)));
  assert.ok(Object.values(settings.company.social).every((url) => !url || isSafeHref(url)));
});

test("site settings parser validates at build time and rejects script URLs", () => {
  assert.match(parser, /export const siteSettings = parseSiteSettings\(siteSettingsJson\)/);
  assert.match(parser, /url\.protocol === "https:" \|\| url\.protocol === "http:"/);
  assert.match(parser, /href\.startsWith\("\/"\) && !href\.startsWith\("\/\/"\)/);
});

test("header and footer render editable menus with safe new-tab links", () => {
  assert.match(header, /siteSettings\.navigation\.header/);
  assert.match(footer, /siteSettings\.navigation\.footer/);
  for (const source of [header, footer]) {
    assert.match(source, /target: "_blank", rel: "noreferrer"/);
    assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
  }
});
