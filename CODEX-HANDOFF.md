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

### Phase 8 — performance và search scalability (đang thực hiện)

Đã hoàn thành phần search payload bằng triển khai thủ công sau khi Codex bị quota limit; chưa nghiệm thu toàn phase.

Đã thực hiện:

- Tạo generated `src/data/search-index.json` chỉ gồm `id`, `sku`, `name`, `slug`, `categories`.
- Header không còn import `products_vi.json` hoặc catalog giàu dữ liệu.
- Search index được lazy-load khi mở search bằng dynamic import.
- Thêm regression tests cho schema index, tìm theo tên/SKU, lazy import và image sizing.
- Thêm `sizes` cho product cards, category cards và product gallery.

Verification phần đã làm:

```text
npm test                 PASS — 39 tests
npm run typecheck        PASS
npm run validate:data    PASS
npm run check:data       PASS
npm run build            PASS — 1452 static pages
npm run validate:export  PASS — 1447 routes / 4660 artifacts
npm audit --json         PASS — 0 vulnerabilities
search chunk             209219 raw / 35135 gzip
```

Commit phần đã làm:

```text
f8573ff perf: lazy-load catalog search index
```

Blocker/risk còn lại:

- `images.unoptimized: true` trong static export nên `sizes` chưa tự tạo `srcset`.
- Chưa có pipeline responsive image derivatives WebP/AVIF; không được tuyên bố Phase 8 hoàn tất cho tới khi xử lý hoặc chấp nhận rủi ro này bằng quyết định riêng.
- Codex CLI bị usage limit trong lần giao Phase 8; không có source diff dở dang từ lần đó.

## Phase tiếp theo sau khi hoàn tất Phase 8

### Phase 9 — accessibility và interaction hardening

Chỉ chuyển sang Phase 9 sau khi quyết định/triển khai image derivative pipeline và chạy lại full gate.

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
