import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const contactPage = readFileSync(path.join(projectRoot, "src/app/lien-he/page.tsx"), "utf8");
const contactForm = readFileSync(path.join(projectRoot, "src/components/ContactForm.tsx"), "utf8");
const contactData = readFileSync(path.join(projectRoot, "src/lib/contact.ts"), "utf8");

test("contact page replaces the distributor network with a compact contact form", () => {
  assert.match(contactPage, /<ContactForm\s*\/>/);
  assert.doesNotMatch(contactPage, /MẠNG LƯỚI PHÂN PHỐI/i);
  assert.match(contactForm, /name="fullName"/);
  assert.match(contactForm, /name="phone"/);
  assert.match(contactForm, /name="subject"/);
  assert.match(contactForm, /name="message"/);
});

test("contact form sends only through the configured backend and keeps an honest fallback", () => {
  assert.match(contactForm, /onSubmit=\{handleSubmit\}/);
  assert.doesNotMatch(contactForm, /\b(?:action|formAction)\s*=/i);
  assert.match(contactForm, /fetch\(contactApiUrl/);
  assert.match(contactForm, /backendMissingStatus/);
  assert.match(contactForm, /name="website"/);
  assert.doesNotMatch(contactForm, /mailto:|XMLHttpRequest|formsubmit\.co/i);
  assert.doesNotMatch(contactForm, /https:\/\/admin\.[A-Za-z0-9.-]+\/api\/contact-submissions/);
});

test("contact page keeps safe navigation CTAs", () => {
  assert.match(contactPage, /href="\/san-pham\/"/);
  assert.match(contactPage, /zaloHref/);
});

test("contact page uses the verified Workman contact details", () => {
  assert.match(contactPage, /companyContact/);
  assert.match(contactData, /CÔNG TY CỔ PHẦN THIẾT BỊ CÔNG NGHIỆP WORKMAN/);
  assert.match(contactData, /T2\/D3B\/31, Đường Bình Chuẩn 62/);
  assert.match(contactData, /0978\.390\.339/);
  assert.match(contactData, /3702963744/);
  assert.match(contactData, /zalo\.me\/0978390339/);
});

test("contact page keeps its Vietnamese canonical metadata", () => {
  assert.match(contactPage, /const canonical = "\/lien-he\/"/);
  assert.match(contactPage, /alternates:\s*\{ canonical \}/);
  assert.match(contactPage, /openGraph:\s*\{ title, description, url: canonical \}/);
});
