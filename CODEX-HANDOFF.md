# Codex Roadmap Handoff

Cập nhật: 2026-08-27
Project: `/Volumes/data AI/wokin.com.vn`
Branch: `main`

## Cách tiếp tục

Khi người dùng nói **“tiếp tục phần đang làm”**, tiếp tục từ **Phase 4**, không chạy lại Phase 0–3 và không reset working tree. Trước khi giao Codex:

1. Kiểm tra `git status --short --branch` và `git log --oneline -6`.
2. Đọc `AGENTS.md`, `DESIGN.md`, `PROMPT-CLONE-NEXTJS.md` và roadmap `.hermes/plans/2026-08-27_roadmap-codex-production-hardening.md`.
3. Xác nhận working tree sạch hoặc review mọi diff trước khi sửa.
4. Dùng Codex CLI với `pty=true`, `codex exec`, model `gpt-5.6-sol`, sandbox `danger-full-access` nếu môi trường sandbox bị lỗi.
5. Không cho Codex commit, push, deploy hoặc crawl website nguồn.
6. Sau mỗi phase phải review diff và chạy gate độc lập trước khi commit checkpoint.

## Trạng thái đã nghiệm thu

### Phase 0 — Hoàn thành
Checkpoint baseline:

```text
50aa1b5 chore: checkpoint WOKIN catalog before hardening
```

### Phase 1 — Hoàn thành
Checkpoint:

```text
9ede95a test: add catalog and static export quality gates
```

Đã thêm quality gates cho catalog, static export và static-server smoke test. Đã xử lý source-domain leak trong runtime.

### Phase 2 — Hoàn thành
Checkpoint:

```text
3000865 fix: upgrade vulnerable build dependencies
```

Đã nâng `next` lên `15.5.24`, cập nhật `postcss`/`sharp` qua overrides. Audit độc lập: 0 vulnerabilities.

### Phase 3 — Hoàn thành
Checkpoint hiện tại:

```text
1fbfb07 fix: harden product rendering and host security
```

Đã:

- Chuyển product spec từ raw HTML sang structured text/JSX.
- Thêm JSON-LD serializer chống `</script>`, `<`, `>`, `&`, U+2028/U+2029.
- Thêm test security rendering.
- Thêm `deploy/hostinger/.htaccess` với security headers.
- Thêm `DEPLOYMENT.md`.
- HSTS để opt-in, chưa bật mặc định.

Gate sau Phase 3:

```text
npm test                 PASS — 15 tests
npm run typecheck        PASS
npm run validate:data    PASS
npm run build            PASS — 1452 static pages
npm run validate:export  PASS
npm audit --json         PASS — 0 vulnerabilities
```

## Phase đã nghiệm thu gần nhất

### Phase 7 — contact flow production-safe

Đã hoàn thành bằng Codex `gpt-5.6-sol` với reasoning effort `medium`. Quyết định vận hành được phê duyệt: tạm thời bỏ form và chỉ hiển thị CTA rõ ràng.

Đã thực hiện:

- Xóa form, input, select, textarea và submit path.
- Không thu thập hoặc gửi PII.
- Không thêm endpoint, provider, API key, `mailto:` hoặc success giả.
- Hiển thị trạng thái tiếng Việt trung thực rằng contact online chưa được kích hoạt.
- Thêm CTA nội bộ tới `/san-pham/` và `/nha-phan-phoi/`.
- Giữ canonical và OpenGraph `/lien-he/`.
- Thêm `tests/contact-safety.test.mjs`.
- Cập nhật `DEPLOYMENT.md` với decision gate và điều kiện cần trước khi kích hoạt backend.

Checkpoint:

```text
7072549 fix: make contact page production-safe
```

### Phase 8 — performance và search scalability

Đã hoàn thành bằng triển khai kết hợp Codex và remediation thủ công. Codex bị treo sau khi ghi implementation image pipeline; process đã được dừng an toàn, sau đó diff, tests và artifact được kiểm tra độc lập.

Đã thực hiện:

- Tạo generated `src/data/search-index.json` chỉ gồm `id`, `sku`, `name`, `slug`, `categories`.
- Header không còn import `products_vi.json` hoặc catalog giàu dữ liệu.
- Search index được lazy-load khi mở search bằng dynamic import.
- Search vẫn tìm theo tên tiếng Việt và SKU.
- Tạo `scripts/build-responsive-images.mjs` dùng Sharp, các nấc 320/480/640/800/1200 và native width khi cần.
- Không upscale ảnh nguồn nhỏ; output WebP deterministic dưới `public/images/products-responsive/`.
- Tạo `src/data/image-metadata.generated.json` server-only với dimensions và source SHA-256.
- Dùng `<picture>`/WebP `srcset` thật trong ProductCard và ProductGallery; ảnh gốc là fallback.
- `npm run build` tự chạy `prebuild` → `build:images`; pipeline cache không encode lại khi source/derivatives hợp lệ.
- Validator kiểm tra mọi derivative URL trong artifact có target tồn tại.
- Thêm regression tests cho search, no-upscale, naming, manifest, missing source và broken derivative.

Verification:

```text
npm test                 PASS — 47 tests
npm run typecheck        PASS
npm run validate:data    PASS
npm run check:data       PASS
npm run build:images     PASS — 1717 sources / 5611 derivatives
npm run build            PASS — 1452 static pages
npm run validate:export  PASS — 1447 routes / 10271 artifacts
npm audit --json         PASS — 0 vulnerabilities
```

Image measurement:

```text
source images            1717 files / 75,656,917 bytes
responsive derivatives   5611 files / 86,738,866 bytes
search lazy chunk        209219 raw / 35135 gzip
```

Checkpoint:

```text
5a69f36 perf: add static responsive image derivatives
```

Residual risk không chặn Phase 9:

- Hero/StaticHero/DistributorCta vẫn dùng ảnh product gốc cho full-bleed background; có thể tối ưu tiếp nếu Lighthouse chứng minh đây là bottleneck.
- Chưa chạy Lighthouse/visual side-by-side/accessibility gate; thuộc Phase 9 và Phase 11.
- Responsive derivatives nằm trong build artifact và bị Git ignore; clean checkout phải chạy `npm run build` trước khi upload `out/`.

## Phase 9 — accessibility và interaction hardening

Đã hoàn thành với phạm vi Header search/mobile drawer, HeroSlider và global interaction styles.

Đã thực hiện:

- Search dialog và mobile drawer dùng `role="dialog"`, `aria-modal`, accessible label và `aria-expanded`/`aria-controls`.
- Focus tự động vào input/close control khi mở; Escape và close button đóng; focus restore về trigger.
- Tab/Shift+Tab loop trong dialog/drawer; background siblings được đặt `inert` + `aria-hidden` trong lifecycle modal.
- Search status dùng `role="status"`, `aria-live="polite"`, `aria-atomic` và copy loading/no-result/result count.
- HeroSlider có carousel/slide semantics, trạng thái slide hiện tại, Arrow/Home/End, pause/resume và disabled autoplay khi `prefers-reduced-motion: reduce`.
- Slide không hiện được đánh dấu `aria-hidden` + `inert` để link ẩn không lọt vào keyboard order.
- Global focus-visible style, touch target tối thiểu 44px cho control chính và reduced-motion CSS fallback.
- Thêm `tests/accessibility-interactions.test.mjs` với static assertions và focus-loop harness tối thiểu.

Verification:

```text
npm test                 PASS — 52 tests
npm run typecheck        PASS
npm run validate:data    PASS
npm run check:data       PASS
npm run build            PASS — 1452 static pages
npm run validate:export  PASS — 1447 routes / 10271 artifacts
npm audit --json         PASS — 0 vulnerabilities
```

Checkpoint:

```text
f37c632 a11y: harden keyboard interactions
```

Giới hạn đã biết:

- Chưa chạy axe/Lighthouse hoặc browser E2E thực tế; test mới là source assertions và DOM focus-loop harness, không thay thế audit runtime.
- Cần visual/accessibility manual audit desktop/mobile ở Phase 11.

## Phase 10 — CI, deploy artifact và release checklist

Đã hoàn thành.

Đã thực hiện:

- `.github/workflows/ci.yml`: `npm ci` → audit high → typecheck → test → validate:data → check:data → build → validate:export → package:release; upload `out/` và release pack (không deploy).
- `scripts/package-release.mjs`: dựng `release/hostinger/` (+ `.htaccess`), `SHA256SUMS`, `wokin-hostinger.tar.gz` deterministic; chặn source map, `.env`, secret, symlink, thư mục dev.
- `tests/release-artifact.test.mjs`, `RELEASE-CHECKLIST.md`, cập nhật `DEPLOYMENT.md`.
- `.gitignore` bỏ qua `release/`, `.hermes/worktrees/`, `.hermes/xlsx-venv/`.

Verification (2026-09-14):

```text
npm audit --audit-level=high  PASS — 0 vulnerabilities
npm run typecheck             PASS
npm test                      PASS — 64 tests
npm run validate:data         PASS
npm run check:data            PASS
npm run build                 PASS — 1452 static pages
npm run validate:export       PASS — 1447 routes / 10271 artifacts
npm run package:release       PASS — 10272 files, SHA256SUMS verify 100% OK
determinism                   PASS — 2 lần package cùng SHA-256 archive
```

Giới hạn: GitHub Actions chưa chạy thật — `origin/main` mới có initial commit, 15 commit local chưa push.

## Phase tiếp theo

### Phase 11 — final production acceptance

Browser audit desktop/mobile, so sánh visual với site gốc, accessibility/Lighthouse runtime.

## Historical acceptance — Phase 4

Mục tiêu:

- Canonical route:
  - `/about/` → `/gioi-thieu/`
  - `/contact/` → `/lien-he/`
  - `/distributors/` → `/nha-phan-phoi/`
- Giữ nguyên các route `/san-pham/`, `/san-pham-moi/`, `/gp20v/`, `/danh-muc/`, `/san-pham/<slug>/`.
- Tạo redirect 301 một bước trong `deploy/hostinger/.htaccess`.
- Không tạo duplicate HTML pages cho route legacy.
- Cập nhật internal links, canonical, metadata, OpenGraph, breadcrumb.
- Sitemap chỉ chứa route canonical mới.
- Robots bỏ `Disallow: /_next/`, vẫn cân nhắc `Disallow: /api/`.
- Trailing slash nhất quán và giữ query string hợp lý.
- Không đoán mapping legacy product/category nếu không có dữ liệu xác minh.

Files được phép sửa:

```text
src/app/about/**
src/app/contact/**
src/app/distributors/**
src/components/Header.tsx
src/components/Footer.tsx
src/components/DistributorCta.tsx
src/app/sitemap.ts
src/app/robots.ts
deploy/hostinger/.htaccess
DEPLOYMENT.md
scripts/validate-static-export.mjs
scripts/smoke-static-server.mjs
tests/**
```

Không sửa product data, CSS, package versions hoặc security logic ngoài canonical URL cần thiết.

Gate bắt buộc:

```text
npm test
npm run typecheck
npm run validate:data
npm run build
npm run validate:export
npm audit --json
```

Kiểm tra bổ sung:

- Canonical routes xuất hiện và trả HTTP 200 trong `out/`.
- Legacy routes không còn HTML output.
- `.htaccess` có 301 rules rõ ràng, không loop.
- `out/robots.txt` cho phép crawler đọc `/_next/`.
- `out/sitemap.xml` không còn `/about/`, `/contact/`, `/distributors/`.
- Không còn internal link tới route legacy trong `src/` hoặc `out/`, ngoại trừ redirect config/docs.
- Vẫn giữ 1.357 sản phẩm, 30 category và các slug sản phẩm.

## Các finding chưa xử lý sau Phase 4

- Phase 5: 121 nhóm duplicate product title.
- Phase 6: thống nhất source of truth/data schema.
- Phase 7: contact flow production-safe; form hiện chưa có backend.
- Phase 8: performance/search/image optimization.
- Phase 9: accessibility/interaction audit.
- Phase 10: CI/deploy/release checklist.
- Phase 11: final production acceptance.

Chưa được tuyên bố production-ready cho tới khi toàn bộ gate, SEO, security, accessibility, performance, visual audit và deployment verification hoàn tất.

## Thông tin vận hành

- Chat runtime: `gpt-5.6-luna` qua provider `openai-codex`.
- Codex CLI gần nhất: `gpt-5.6-sol`.
- Static preview dùng `python3 -m http.server ... --directory out`; không dùng `next start` vì project có `output: "export"`.
- Không lưu credentials, tokens hoặc API keys trong handoff.
