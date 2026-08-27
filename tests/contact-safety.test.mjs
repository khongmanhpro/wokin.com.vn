import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const contactPage = readFileSync(path.join(projectRoot, "src/app/lien-he/page.tsx"), "utf8");

test("contact page does not collect or submit personal data without an approved backend", () => {
  assert.doesNotMatch(contactPage, /<(?:form|input|select|textarea|button)\b/i);
  assert.doesNotMatch(contactPage, /type\s*=\s*["'{]?\s*submit/i);
  assert.doesNotMatch(contactPage, /\b(?:action|formAction|onSubmit)\s*=/i);
  assert.doesNotMatch(contactPage, /mailto:/i);
});

test("contact page uses honest inactive-flow copy and safe internal CTAs", () => {
  assert.match(contactPage, /chưa được kích hoạt/i);
  assert.match(contactPage, /không (?:cần|yêu cầu)[^<]{0,80}nhập (?:dữ liệu|thông tin)/i);
  assert.doesNotMatch(contactPage, /CHÚNG TÔI LUÔN SẴN SÀNG/);
  assert.match(contactPage, /href="\/san-pham\/"/);
  assert.match(contactPage, /href="\/nha-phan-phoi\/"/);
  assert.doesNotMatch(
    contactPage,
    /\b(?:success|submitted)\b|(?:gửi|đã gửi)\s+thành công|yêu cầu\s+đã\s+(?:được\s+)?gửi/iu,
  );
});

test("contact page keeps its Vietnamese canonical metadata", () => {
  assert.match(contactPage, /const canonical = "\/lien-he\/"/);
  assert.match(contactPage, /alternates:\s*\{ canonical \}/);
  assert.match(contactPage, /openGraph:\s*\{ title, description, url: canonical \}/);
});
