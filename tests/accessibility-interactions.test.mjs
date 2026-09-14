import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const readSource = (relativePath) => readFileSync(path.join(projectRoot, relativePath), "utf8");

function loadFocusTrapTarget(headerSource) {
  const match = headerSource.match(/function getFocusTrapTarget\([^)]*\) \{([\s\S]*?)\n\}/);
  assert.ok(match, "Header must define the focus trap boundary helper");
  return new Function("currentIndex", "focusableCount", "shiftKey", match[1]);
}

test("search dialog and mobile drawer expose modal semantics and focus lifecycle", () => {
  const header = readSource("src/components/Header.tsx");

  assert.match(header, /role="dialog"[\s\S]*aria-modal="true"[\s\S]*aria-labelledby=/);
  assert.match(header, /className="mobile-drawer"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(header, /onKeyDown=\{trapFocus/);
  assert.match(header, /event\.key === "Escape"/);
  assert.match(header, /event\.key !== "Tab"/);
  assert.match(header, /\.focus\(\)/);
  assert.match(header, /\.inert = true/);
  assert.match(header, /setAttribute\("aria-hidden", "true"\)/);
  assert.match(header, /aria-controls="search-dialog"/);
  assert.match(header, /aria-controls="category-drawer"/);
});

test("search input and dynamic results have explicit labels and polite status", () => {
  const header = readSource("src/components/Header.tsx");

  assert.match(header, /<label[^>]+htmlFor="product-search-input"/);
  assert.match(header, /id="product-search-input"/);
  assert.match(header, /role="status"/);
  assert.match(header, /aria-live="polite"/);
  assert.match(header, /aria-atomic="true"/);
});

test("focus trap helper loops at both boundaries in a minimal DOM harness", () => {
  const getFocusTrapTarget = loadFocusTrapTarget(readSource("src/components/Header.tsx"));
  let activeIndex = 0;
  const focusable = Array.from({ length: 4 }, (_, index) => ({
    focus() {
      activeIndex = index;
    },
  }));

  const moveThroughTrap = (shiftKey) => {
    const target = getFocusTrapTarget(activeIndex, focusable.length, shiftKey);
    if (target >= 0) focusable[target].focus();
  };

  activeIndex = 3;
  moveThroughTrap(false);
  assert.equal(activeIndex, 0, "Tab from the last control must loop to the first");

  activeIndex = 0;
  moveThroughTrap(true);
  assert.equal(activeIndex, 3, "Shift+Tab from the first control must loop to the last");

  activeIndex = -1;
  const outsideTarget = getFocusTrapTarget(activeIndex, focusable.length, false);
  assert.equal(outsideTarget, 0, "focus entering from outside must be redirected inside");
});

test("hero carousel announces state, supports keyboard control, and gates autoplay", () => {
  const hero = readSource("src/components/HeroSlider.tsx");

  assert.match(hero, /aria-roledescription="carousel"/);
  assert.match(hero, /aria-roledescription="slide"/);
  assert.match(hero, /role="group"/);
  assert.match(hero, /aria-current=\{index === active \? "true" : undefined\}/);
  assert.match(hero, /inert=\{index !== active\}/);
  assert.match(hero, /event\.key === "ArrowLeft"/);
  assert.match(hero, /event\.key === "ArrowRight"/);
  assert.match(hero, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(hero, /if \(reducedMotion \|\| paused\) return/);
  assert.match(hero, /aria-pressed=\{paused\}/);
  assert.match(hero, /aria-live=\{paused \|\| reducedMotion \? "polite" : "off"\}/);
  assert.match(hero, /const move = \(direction: number\) => \{[\s\S]*setPaused\(true\)/);
});

test("global interaction styles provide visible focus, touch targets, and reduced motion", () => {
  const css = readSource("src/app/globals.css");

  assert.match(css, /:focus-visible/);
  assert.match(css, /outline:\s*3px solid #fff/);
  assert.match(css, /box-shadow:[^;]+var\(--title\)[^;]+var\(--primary\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /scroll-behavior:\s*auto/);
  assert.match(css, /\.slider-dots button[\s\S]*min-width:\s*44px/);
  assert.match(css, /\.drawer-list a[\s\S]*min-height:\s*44px/);
});

test("home hero exposes a single h1 and packaging tables expose column headers", () => {
  const hero = readSource("src/components/HeroSlider.tsx");
  assert.match(hero, /index === 0 \? <h1 className="hero-title">/, "only the first hero slide may render an h1");
  assert.equal(hero.match(/<h1\b/g)?.length, 1);

  const productPage = readSource("src/app/san-pham/[slug_vi]/page.tsx");
  assert.match(productPage, /<th scope="col"/);
  assert.match(productPage, /glossary\.ui\["STOCK NO\."\]/);
});
