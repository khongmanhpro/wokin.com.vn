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

test("contact form does not claim to send data before a backend is approved", () => {
  assert.match(contactForm, /onSubmit=\{handleSubmit\}/);
  assert.doesNotMatch(contactForm, /\b(?:action|formAction)\s*=/i);
  assert.doesNotMatch(contactForm, /mailto:|fetch\(|XMLHttpRequest/i);
  assert.match(contactForm, /chờ kết nối máy chủ tiếp nhận/i);
  assert.doesNotMatch(contactForm, /(?:gửi|đã gửi)\s+thành công|yêu cầu\s+đã\s+(?:được\s+)?gửi/iu);
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
