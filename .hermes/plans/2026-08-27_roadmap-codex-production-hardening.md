# WOKIN Production Hardening — Codex Execution Plan

> **For Hermes:** Thực thi từng phase bằng Codex CLI. Mỗi phase phải qua review diff và verification gate độc lập trước khi sang phase kế tiếp. Không chạy hai Codex writer song song trên cùng working tree.

**Goal:** Đưa catalog WOKIN Next.js từ bản static prototype đang build được thành bản production-ready có dependency an toàn, URL/SEO nhất quán, dữ liệu được kiểm chứng, contact flow có chủ đích, accessibility/performance tốt, CI và artifact deploy Hostinger có thể lặp lại.

**Architecture:** Tiếp tục giữ Next.js App Router + static export cho giai đoạn catalog read-only. Không thêm database runtime chỉ để “cho có”; trước mắt chuẩn hóa schema và pipeline dữ liệu để có đường chuyển sang PostgreSQL/headless CMS khi xuất hiện nhu cầu quản trị, tồn kho, distributor portal hoặc tìm kiếm nâng cao. Mỗi thay đổi được cô lập thành phase có rollback point.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, static export, Node validation scripts, Hostinger/Apache static hosting, GitHub Actions khi repository remote sẵn sàng.

---

## 1. Nguyên tắc điều phối bắt buộc

### 1.1 Một writer tại một thời điểm

- Chỉ một tiến trình Codex được phép sửa working tree.
- Audit/read-only có thể chạy song song, nhưng không được sửa file.
- Codex không tự push, deploy, đổi DNS, hoặc commit.
- Hermes review và commit sau khi gate pass.

### 1.2 Vòng lặp của mỗi phase

1. **Preflight:** kiểm tra branch, `git status`, diff tồn tại và tiến trình nền.
2. **Checkpoint:** bảo toàn trạng thái bằng commit baseline hoặc branch/checkpoint được người dùng chấp thuận; không ghi đè WIP chưa rõ nguồn gốc.
3. **Prompt hẹp:** nêu rõ mục tiêu, file được sửa, file cấm sửa, acceptance criteria và test cần chạy.
4. **Codex thực thi:** chạy trong project root bằng PTY và background.
5. **Theo dõi:** đọc log; nếu Codex đi lệch scope thì steer hoặc dừng ngay.
6. **Review diff:** Hermes đọc `git diff --stat`, `git diff`, file mới và package-lock thay đổi. Không tin kết luận tự báo cáo của Codex.
7. **Gate độc lập:** Hermes tự chạy typecheck/build/test/smoke, không dùng output Codex làm bằng chứng duy nhất.
8. **Visual gate:** phase chạm UI phải kiểm tra desktop/mobile trên artifact `out/`.
9. **Commit:** chỉ commit phase khi mọi gate đạt; một commit logic cho một phase.
10. **Rollback/rework:** nếu gate fail, không sang phase mới; yêu cầu Codex sửa đúng failure hoặc reset về checkpoint.

### 1.3 Stop conditions

Dừng Codex ngay nếu có một trong các dấu hiệu:

- Crawl/scrape lại `wokintools.com`.
- Thêm canonical hoặc runtime link tới domain nguồn.
- Thêm database/backend ngoài scope phase.
- Xóa hàng loạt dữ liệu/ảnh hoặc đổi >100 slug mà không có redirect matrix.
- Tắt TypeScript strict, ESLint/test, hoặc bỏ assertion để “làm test pass”.
- Dùng `npm audit fix --force`.
- Tạo duplicate route để giả redirect 301.
- Chuyển khỏi static export khi chưa có quyết định kiến trúc.
- Tự deploy, push hoặc commit.

### 1.4 Lệnh Codex chuẩn

Do môi trường Hermes từng có vấn đề sandbox, dùng process boundary + Git checkpoint làm lớp an toàn:

```bash
codex exec -m gpt-5.6-sol --sandbox danger-full-access "<PHASE_PROMPT>"
```

Yêu cầu trong mọi prompt:

```text
Đọc AGENTS.md, DESIGN.md, PROMPT-CLONE-NEXTJS.md và roadmap này trước khi sửa.
Chỉ xử lý phase hiện tại. Không commit, không push, không deploy.
Không crawl website nguồn. Dùng data/reference/assets local.
Kết thúc bằng: files changed, tests run, unresolved risks.
```

---

## 2. Gate chung áp dụng sau mọi phase

### Gate A — Source

```bash
npm run typecheck
npm run build
```

Kỳ vọng: exit code 0; static export hoàn thành.

### Gate B — Dependency

```bash
npm audit --json
```

Kỳ vọng sau Phase 2: 0 High, 0 Critical. Nếu còn advisory không áp dụng cho static runtime, phải ghi rõ package path, advisory và lý do; không tự bỏ qua.

### Gate C — Artifact

Phục vụ đúng `out/`, không dùng `next start`:

```bash
python3 -m http.server <FREE_PORT> --directory out
```

Smoke tối thiểu:

```text
/
/san-pham/
/san-pham-moi/
/gp20v/
/danh-muc/<known-category>/
/san-pham/<known-product>/
/sitemap.xml
/robots.txt
```

Kỳ vọng: HTTP 200, title/canonical đúng, asset chính tải được.

### Gate D — SEO/data regression

- Đủ 1.357 sản phẩm hoặc có thay đổi count được giải trình.
- Product ID và `slug_vi` unique.
- 30 category hoặc có migration được giải trình.
- 1.720 image manifest entries hoặc có báo cáo thiếu.
- Không có broken internal navigation link.
- Không có canonical/internal runtime link tới `wokintools.com`.
- Sitemap chỉ chứa canonical URL trả 200.
- Không có `.html` trong internal link/canonical.

### Gate E — Visual (phase chạm UI)

Kiểm tra desktop và mobile ít nhất:

1. Home.
2. Category page.
3. Product detail.
4. New products.
5. Contact.

Không tuyên bố pixel-perfect nếu chưa side-by-side với reference local.

---

# PHASE 0 — Bảo toàn baseline và ghi số đo

**Priority:** P0  
**Mục tiêu:** Có rollback point và baseline tái lập trước khi Codex sửa.

**Files có thể tạo:**

- `.hermes/audits/baseline-2026-08-27.md`
- Không sửa application code.

**Các bước:**

1. Xác minh project root và Git branch.
2. Ghi `git status --short`, diff stat, untracked files.
3. Không xóa/ghi đè WIP chưa rõ nguồn gốc.
4. Nếu repository chưa có baseline commit, tạo checkpoint sau khi review toàn bộ trạng thái.
5. Chạy Gate A–D trên trạng thái hiện tại.
6. Ghi baseline: dependency versions, audit count, route/page count, sitemap count, artifact size, product/category/image count.
7. Xác minh preview server hiện tại chỉ là static server; không dùng `npm start` vì `output: export`.

**Acceptance criteria:**

- Có Git rollback point.
- Có baseline report với lệnh và output thực tế.
- Không có source file bị thay đổi bởi Phase 0.

**Commit đề xuất:**

```text
chore: record production hardening baseline
```

---

# PHASE 1 — Tạo automated quality gates trước khi sửa hành vi

**Priority:** P0  
**Mục tiêu:** Biến các invariant hiện đã kiểm tra thủ công thành lệnh có thể chạy lại.

**Files dự kiến:**

- Create: `scripts/validate-catalog.mjs`
- Create: `scripts/validate-static-export.mjs`
- Create: `scripts/smoke-static-server.mjs` hoặc một script tương đương không cần dependency nặng
- Modify: `package.json`
- Modify: `package-lock.json` chỉ nếu thật sự thêm dependency cần thiết
- Create tests dưới `tests/` nếu chọn Node test runner

**Yêu cầu:**

- Ưu tiên Node built-in test/assert; tránh thêm framework lớn chỉ cho vài invariant.
- Test catalog phải kiểm tra count, required fields, unique ID/slug, image references và category references.
- Test artifact phải parse `out/`: canonical, sitemap, robots, source-domain leak, internal links và expected routes.
- Cho phép danh sách SKU trùng có giải thích; không giả định SKU là primary key.
- Không hard-code kết quả để che lỗi.

**Scripts kỳ vọng:**

```json
{
  "test": "...",
  "validate:data": "...",
  "validate:export": "...",
  "verify": "npm run typecheck && npm test && npm run build && npm run validate:export"
}
```

**Acceptance criteria:**

- Test phải bắt được ít nhất một fixture/invariant sai trong RED step hoặc Codex chứng minh failure trước implementation.
- `npm run verify` pass trên baseline hợp lệ.
- Báo cáo duplicate product title và source-domain leak dưới dạng failure hoặc explicit allowlist tạm thời có TODO phase xóa; không được im lặng bỏ qua.

**Commit đề xuất:**

```text
test: add catalog and static export quality gates
```

---

# PHASE 2 — Remediate dependency High vulnerabilities

**Priority:** P0  
**Mục tiêu:** Xóa 3 High advisories mà không thay đổi kiến trúc static export.

**Files dự kiến:**

- Modify: `package.json`
- Modify: `package-lock.json`

**Yêu cầu:**

- Nâng Next.js từ `15.5.9` lên bản patched tương thích tối thiểu (`15.5.24` theo audit baseline) hoặc bản patch mới hơn trong cùng major/minor nếu package registry xác nhận.
- Không chạy `npm audit fix --force`.
- Không nâng major React/Next ngoài phạm vi nếu chưa cần.
- Review transitive changes trong `package-lock.json`.

**Acceptance criteria:**

```text
npm audit: 0 High, 0 Critical
npm run verify: PASS
Static URLs sạch vẫn HTTP 200
out/<route>/index.html vẫn được sinh
```

**Commit đề xuất:**

```text
fix: upgrade Next.js to patched release
```

---

# PHASE 3 — Hardening HTML/JSON-LD và chuẩn bị security headers

**Priority:** P0/P1  
**Mục tiêu:** Loại sanitizer regex mong manh và tạo cấu hình hardening phù hợp static Hostinger.

**Files dự kiến:**

- Modify: `src/lib/catalog.ts`
- Modify: `src/components/JsonLd.tsx`
- Modify: product detail renderer nếu cần
- Create: `deploy/hostinger/.htaccess`
- Create/Modify: `DEPLOYMENT.md`
- Tests cho sanitizer/serializer

**Yêu cầu:**

1. Không render dữ liệu HTML không tin cậy bằng sanitizer regex.
2. Ưu tiên parse dữ liệu product spec thành cấu trúc rồi render JSX.
3. Nếu migration đầy đủ chưa thể hoàn thành ở phase này, dùng sanitizer allowlist được test; cấm event handlers, script/style/iframe, dangerous URL protocols.
4. JSON-LD serializer phải escape chuỗi có thể đóng thẻ script (`<`, `>`, `&`, U+2028/U+2029).
5. `.htaccess` phải chứa header phù hợp static site:
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy`
   - `Permissions-Policy`
   - clickjacking protection qua CSP `frame-ancestors` hoặc `X-Frame-Options`
   - HSTS chỉ bật khi production HTTPS đã chắc chắn và có ghi chú rollback
6. CSP phải được test với generated site; không dùng `unsafe-eval`. Nếu cần `unsafe-inline`, ghi rõ lý do và roadmap loại bỏ.
7. Không tuyên bố Next `headers()` giải quyết static hosting; header phải nằm ở Apache/CDN layer.

**Acceptance criteria:**

- XSS payload tests pass.
- Không còn sanitizer regex làm security boundary.
- JSON-LD vẫn parse hợp lệ trên product page.
- Header config có hướng dẫn deploy/verify bằng `curl -I` trên production/staging.
- Gate chung pass.

**Commit đề xuất:**

```text
fix: harden product markup and static host headers
```

---

# PHASE 4 — Chuẩn hóa URL tiếng Việt, redirect và robots

**Priority:** P0/P1  
**Mục tiêu:** Một URL canonical duy nhất cho mỗi trang, route đúng spec tiếng Việt, không mất đường dẫn cũ.

**Quyết định kiến trúc:**

- Canonical primary:
  - `/gioi-thieu/`
  - `/lien-he/`
  - `/nha-phan-phoi/`
- Redirect HTTP 301 tại Apache/CDN:
  - `/about/` → `/gioi-thieu/`
  - `/contact/` → `/lien-he/`
  - `/distributors/` → `/nha-phan-phoi/`
- Không tạo hai HTML page indexable có cùng nội dung để giả redirect.
- Legacy product/category redirects chỉ thêm khi có mapping xác minh từ dữ liệu local; không đoán URL.

**Files dự kiến:**

- Move/Create static page routes trong `src/app/`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: CTA/internal links liên quan
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/robots.ts`
- Modify: `deploy/hostinger/.htaccess`
- Create: `data/redirects.json` hoặc `config/redirects.*` làm source of truth nếu cần
- Tests redirect matrix và artifact

**Yêu cầu:**

- Bỏ `Disallow: /_next/` để crawler tải CSS/JS cần thiết.
- Sitemap chỉ đưa canonical routes.
- Redirect target phải kết thúc bằng trailing slash nhất quán.
- Không có redirect chain/loop.
- Canonical và Open Graph URL phải đồng nhất.

**Acceptance criteria:**

- Ba route tiếng Việt trả 200 trong artifact.
- Ba route tiếng Anh được khai báo 301 trong deploy config, không còn trong sitemap/internal links.
- Robots không chặn `/_next/`.
- Tất cả internal navigation links hợp lệ.
- Gate chung pass.

**Commit đề xuất:**

```text
fix: adopt Vietnamese canonical routes and redirects
```

---

# PHASE 5 — Sửa duplicate SEO titles và Product structured data

**Priority:** P1  
**Mục tiêu:** Phân biệt rõ từng product URL mà không bịa thông số hoặc copy content nguồn.

**Files dự kiến:**

- Modify: `src/app/san-pham/[slug_vi]/page.tsx`
- Modify: `src/lib/catalog.ts`
- Modify data-derived helper/test files
- Có thể modify translated product names chỉ khi có mapping reviewable

**Yêu cầu:**

- Với 121 nhóm tên trùng, thêm SKU hoặc quy cách thực vào title/H1/meta description theo quy tắc deterministic.
- Không append SKU vào mọi title nếu tên đã unique và title không vượt ngưỡng hợp lý.
- Không tự viết claim/spec không có trong dữ liệu.
- Product JSON-LD phải có `name`, `sku`, `image`, `description`, `brand`, canonical URL; không thêm `offers`, price, availability hoặc reviews nếu dữ liệu không tồn tại.
- Breadcrumb JSON-LD phải khớp breadcrumb UI và canonical.
- Meta description phải có giá trị, tránh 1.351 trang dùng chuỗi quá chung hoặc rỗng.

**Acceptance criteria:**

- Duplicate product `<title>` groups = 0.
- Duplicate product H1 chỉ còn khi được phê duyệt rõ và vẫn phân biệt SKU trên trang; mục tiêu tốt nhất = 0.
- Mọi product page có canonical tuyệt đối, title, description và JSON-LD parse được.
- Không có source-domain link.
- Gate chung pass.

**Commit đề xuất:**

```text
fix: make product metadata unique and factual
```

---

# PHASE 6 — Chuẩn hóa source of truth và data schema

**Priority:** P1  
**Mục tiêu:** Xóa nguy cơ drift giữa `data/` và `src/data/`; tạo schema đủ rõ cho migration CMS/DB sau này.

**Files dự kiến:**

- Create: `scripts/build-catalog-data.mjs`
- Create: schema/type definitions, ví dụ `src/lib/catalog-schema.ts`
- Modify: `src/lib/catalog.ts`
- Modify: data import path/build pipeline
- Remove generated duplicate copies chỉ sau khi code không còn phụ thuộc
- Document: `docs/data-model.md`

**Yêu cầu:**

- Chọn `data/` làm source of truth.
- `src/data/` nếu vẫn cần phải là generated artifact, có header/README và checksum check; tốt hơn là build-time generated module/index nhỏ.
- Chuẩn hóa:
  - internal product ID
  - legacy source ID
  - SKU/product code
  - translation
  - category relations
  - media
  - packaging
  - technical specs
- Không đặt unique constraint giả lên SKU vì baseline có 7 SKU trùng; ghi migration strategy product/variant.
- Parse được spec có cấu trúc từ dữ liệu thật; dữ liệu không parse được phải được report, không silently drop.
- Không thêm runtime PostgreSQL/CMS ở phase này.

**Acceptance criteria:**

- Chỉ một source of truth có thể chỉnh tay.
- Build data deterministic; chạy hai lần cho checksum giống nhau.
- Validation báo rõ malformed/missing record.
- Không thay đổi product canonical slug ngoài mapping được review.
- Gate chung pass.

**Commit đề xuất:**

```text
refactor: establish validated catalog data pipeline
```

---

# PHASE 7 — Contact flow production-safe

**Priority:** P1  
**Decision gate trước khi chạy:** Chọn đích nhận lead. Không để Codex tự chọn provider hay tạo credential.

**Các lựa chọn hợp lệ:**

1. Static form provider có webhook/API và spam protection.
2. Hostinger PHP endpoint cùng domain.
3. API/serverless riêng.
4. Tạm thời thay form bằng CTA email/phone rõ ràng nếu chưa có backend.

**Không làm:**

- Không nhúng API key/service secret vào client bundle.
- Không dùng `mailto:` giả thành form gửi thành công.
- Không lưu PII vào log công khai.
- Không hiển thị success trước khi backend xác nhận.

**Files dự kiến tùy lựa chọn:**

- Modify route canonical `/lien-he/`
- Create form component có progressive enhancement
- Endpoint/backend riêng nếu được phê duyệt
- Validation schema + tests
- Privacy/consent copy

**Yêu cầu backend tối thiểu:**

- Server-side validation.
- Honeypot và/or CAPTCHA phù hợp.
- Rate limit theo IP/fingerprint với privacy hợp lý.
- CSRF/origin validation nếu dùng cookie/session.
- Timeout, retry và idempotency.
- Không expose SMTP/API secrets.
- Audit/error monitoring không ghi raw PII.

**Acceptance criteria:**

- E2E success và validation failure đều được kiểm thử.
- Spam/rate-limit test có bằng chứng.
- Không còn `button type="button"` vô tác dụng.
- Lead đến đúng mailbox/system test.
- Privacy notice đúng với dữ liệu thu thập.

**Commit đề xuất:**

```text
feat: add validated contact lead flow
```

---

# PHASE 8 — Performance và search scalability

**Priority:** P1/P2  
**Mục tiêu:** Giảm client payload và ảnh tải thừa mà vẫn giữ static export.

**Files dự kiến:**

- Modify: `src/components/Header.tsx`
- Create generated lightweight search index
- Modify image components/pipeline
- Modify `next.config.ts` nếu cần nhưng vẫn giữ `output: export`
- Build scripts cho WebP/AVIF/responsive sizes nếu asset source phù hợp

**Yêu cầu:**

- Không import toàn bộ catalog giàu dữ liệu vào Header client component.
- Search index client chỉ chứa trường cần thiết: ID/SKU/name/slug/category; đo kích thước gzip/brotli.
- Lazy-load search index khi mở search nếu phù hợp.
- Tạo responsive image derivatives hoặc dùng CDN/image pipeline tương thích static Hostinger.
- Đặt `sizes`, width/height/aspect ratio đúng để tránh CLS.
- Không upscale ảnh nguồn nhỏ.

**Acceptance criteria:**

- Search vẫn tìm theo tên và SKU.
- Initial JS/layout chunk giảm hoặc có số đo chứng minh không tăng vô lý.
- Không có broken image.
- Mobile không tải ảnh desktop quá lớn khi derivative có sẵn.
- Gate chung và visual gate pass.

**Commit đề xuất:**

```text
perf: reduce catalog search and image payloads
```

---

# PHASE 9 — Accessibility và interaction hardening

**Priority:** P1/P2  
**Mục tiêu:** Đạt keyboard/screen-reader baseline cho menu, search và carousel.

**Files dự kiến:**

- Modify: `src/components/Header.tsx`
- Modify: `src/components/HeroSlider.tsx`
- Modify CSS liên quan
- Add interaction/accessibility tests

**Yêu cầu:**

- Search dialog/mobile drawer: focus trap, Escape close, restore focus, semantic label, background inert/hidden.
- Search results thông báo bằng `aria-live` phù hợp.
- Carousel: current state, keyboard controls, pause/stop hoặc không autoplay khi reduced motion.
- Tôn trọng `prefers-reduced-motion`.
- Visible focus, contrast và touch target hợp lý.
- Không làm layout lệch reference ngoài thay đổi accessibility cần thiết.

**Acceptance criteria:**

- Keyboard-only hoàn thành open/search/navigate/close.
- Không focus lọt khỏi modal.
- Escape và restore focus hoạt động.
- Axe/Lighthouse accessibility không còn lỗi Critical/Serious trên 5 trang gate.
- Visual gate desktop/mobile pass.

**Commit đề xuất:**

```text
fix: harden keyboard and screen reader interactions
```

---

# PHASE 10 — CI, deploy artifact và release checklist

**Priority:** P1  
**Mục tiêu:** Mỗi thay đổi đều được kiểm tra và tạo artifact Hostinger lặp lại được.

**Files dự kiến:**

- Create: `.github/workflows/ci.yml` nếu dùng GitHub
- Create: `scripts/package-release.mjs` hoặc shell-independent equivalent
- Modify: `DEPLOYMENT.md`
- Create: `RELEASE-CHECKLIST.md`

**CI bắt buộc:**

1. Clean install (`npm ci`).
2. Audit policy High/Critical.
3. Typecheck.
4. Tests/data validation.
5. Build static export.
6. Export validation/broken-link/canonical checks.
7. Upload `out/` artifact.

**Deploy package:**

- Bao gồm nội dung `out/` và Apache config đã review.
- Không bao gồm source map, secret, `.env`, raw audit data hoặc development cache ngoài chủ đích.
- Có checksum manifest.
- Có rollback hướng dẫn.

**Acceptance criteria:**

- CI pass từ clean checkout.
- Artifact giải nén và chạy bằng static server.
- Hostinger staging trả đúng redirect/header/status.
- Không deploy production tự động khi chưa có approval.

**Commit đề xuất:**

```text
ci: add verified static release pipeline
```

---

# PHASE 11 — Final production acceptance

**Priority:** Release gate  
**Mục tiêu:** Chỉ tuyên bố production-ready bằng bằng chứng trên artifact/staging.

**Bắt buộc kiểm tra:**

### Security

- `npm audit`: 0 High/Critical.
- Header trên staging được xác minh bằng `curl -I`.
- Không secret/source map nhạy cảm trong artifact.
- XSS/JSON-LD tests pass.
- Contact abuse controls pass nếu form hoạt động.

### SEO

- Sitemap URL count được giải trình và mọi URL trả 200 canonical.
- Redirect matrix trả 301 một bước.
- 0 duplicate product title.
- 0 broken internal navigation links.
- Robots không chặn CSS/JS.
- Product/Breadcrumb JSON-LD parse hợp lệ.
- Không runtime reference/canonical tới website nguồn.

### Visual/performance/accessibility

- Side-by-side Home/category/product/new/contact ở desktop và mobile.
- Lighthouse chạy nhiều lần trên staging hoặc local production artifact; lưu median thay vì chọn lần tốt nhất.
- Không Critical/Serious accessibility issue.
- Không broken image/layout overflow.

### Legal/content

- Có xác nhận quyền dùng logo, ảnh và nội dung nguồn trước production.
- Claims số lượng/marketing có bằng chứng.
- Contact/privacy details thuộc đúng đơn vị vận hành Việt Nam.

**Release decision:**

- `GO`: mọi P0/P1 pass, rủi ro P2 còn lại được ghi owner/deadline.
- `NO-GO`: còn High dependency, form giả, canonical/redirect lỗi, source-domain leak, broken route, hoặc chưa có quyền asset.

---

## 3. Roadmap database sau catalog static (không triển khai ngay)

Chỉ kích hoạt khi có một trong các nhu cầu: admin cập nhật thường xuyên, tồn kho/giá, dealer portal, quotation workflow, đa ngôn ngữ động, tìm kiếm/filter nâng cao hoặc đồng bộ ERP.

### Stage DB-1 — Schema và import contract

- PostgreSQL.
- `products`, `product_variants`, `product_codes`, `product_translations`, `categories`, `product_categories`, `spec_definitions`, `product_spec_values`, `media`, `documents`, `packaging`.
- Preserve `legacy_source_id` và canonical slug history.
- Redirect table cho slug migration.

### Stage DB-2 — Read model

- Generate static catalog snapshot từ DB/CMS.
- Build vẫn deterministic.
- Preview content trước publish.
- Validation chặn bản ghi thiếu SKU/name/category/media bắt buộc.

### Stage DB-3 — Search

- PostgreSQL full-text/trigram trước.
- Chỉ thêm Meilisearch/Typesense khi đo được PostgreSQL không đáp ứng.

### Stage DB-4 — B2B workflows

- Leads/quotes/distributors/accounts/roles/audit logs.
- Authentication, authorization và tenant boundaries phải là project riêng, không nhét vào catalog hardening.

---

## 4. Thứ tự thực thi và dependency

```text
Phase 0  Baseline
   ↓
Phase 1  Automated gates
   ↓
Phase 2  Dependency patch
   ↓
Phase 3  Security hardening
   ↓
Phase 4  URL/redirect/robots
   ↓
Phase 5  Product SEO uniqueness
   ↓
Phase 6  Data pipeline/schema
   ↓
Phase 7  Contact — BLOCKED until backend/provider decision
   ↓
Phase 8  Performance/search
   ↓
Phase 9  Accessibility
   ↓
Phase 10 CI/deploy
   ↓
Phase 11 Final acceptance
```

Phase 7 có thể tạm hoãn bằng cách vô hiệu hóa form và dùng CTA liên hệ rõ ràng, nhưng production không được giữ form giả.

---

## 5. Prompt template đưa cho Codex theo từng phase

```text
Bạn đang thực hiện PHASE <N> của WOKIN Production Hardening.

Trước khi sửa:
1. Đọc AGENTS.md.
2. Đọc DESIGN.md.
3. Đọc PROMPT-CLONE-NEXTJS.md.
4. Đọc .hermes/plans/2026-08-27_roadmap-codex-production-hardening.md.
5. Kiểm tra git diff hiện tại; không ghi đè thay đổi không thuộc phase.

Mục tiêu phase:
<PASTE OBJECTIVE>

Được phép sửa:
<EXACT FILE SCOPE>

Không được làm:
- Không crawl wokintools.com.
- Không đổi route/slug ngoài scope.
- Không thêm canonical/link về source.
- Không commit, push, deploy.
- Không tắt test/typecheck hoặc sửa assertion để che lỗi.
- Không triển khai phase tiếp theo.

Acceptance criteria:
<PASTE ACCEPTANCE CRITERIA>

Bắt buộc:
- Thực hiện thay đổi nhỏ nhất đáp ứng tiêu chí.
- Chạy test chuyên biệt, typecheck và build khi phù hợp.
- Nếu gặp quyết định ngoài scope, dừng và báo BLOCKED thay vì tự đoán.
- Cuối cùng báo: files changed, tests run với exit code, unresolved risks.
```

---

## 6. Checklist review của Hermes sau mỗi Codex run

- [ ] Codex chỉ sửa file trong scope.
- [ ] Không có file/data/assets bị xóa bất ngờ.
- [ ] Package changes có lý do và lockfile nhất quán.
- [ ] Không có secret/source-domain leak mới.
- [ ] Không có hard-code test result.
- [ ] Typecheck pass.
- [ ] Targeted tests pass.
- [ ] Build pass.
- [ ] Static artifact validation pass.
- [ ] UI phase đã kiểm tra desktop/mobile.
- [ ] Diff đủ nhỏ để rollback.
- [ ] Chỉ sau đó mới commit và mở phase kế tiếp.

**Định nghĩa Done:** Không phải “Codex nói xong”; Done nghĩa là Hermes đã đọc diff, tự chạy mọi gate liên quan và xác minh artifact/staging thực tế.
