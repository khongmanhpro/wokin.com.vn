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

### Phase 5 — duplicate product metadata và Product structured data

Đã hoàn thành bằng Codex `gpt-5.6-sol` với reasoning effort `medium`.

Đã thực hiện:

- Tên sản phẩm unique được giữ nguyên.
- Tên trùng được phân biệt bằng SKU nếu SKU duy nhất trong nhóm.
- Nhóm trùng cả tên và SKU được phân biệt bằng source product ID.
- Không đổi `slug_vi`, không dịch lại hàng loạt và không bịa thông số.
- Product title, H1, meta description và JSON-LD dùng cùng tên SEO deterministic.
- Product JSON-LD có `name`, `sku` khi có giá trị, `image`, `description`, `brand`, `url`.
- Không thêm `offers`, `price`, `availability`, `review` hoặc `aggregateRating`.
- Validator chuyển duplicate title/H1 và Product JSON-LD lỗi thành hard failure.
- Thêm regression tests cho uniqueness, Product JSON-LD và SKU rỗng.

Verification:

```text
npm test                 PASS — 24 tests
npm run typecheck        PASS
npm run validate:data    PASS — 1357 products / 30 categories / 1720 images
npm run build            PASS — 1452 static pages
npm run validate:export  PASS — 1447 routes / 4659 artifacts
npm audit --json         PASS — 0 vulnerabilities
```

Export validator summary:

```text
1357 product routes
0 duplicate product title groups
0 duplicate product H1 groups
1357 Product JSON-LD records validated
```

Checkpoint:

```text
7d096b0 fix: make product metadata unique and factual
```

## Phase tiếp theo

### Phase 6 — source of truth và data schema

Mục tiêu tiếp theo là loại bỏ nguy cơ drift giữa `data/` và `src/data/`, chuẩn hóa schema/import contract và vẫn giữ static build hiện tại. Không bắt đầu Phase 6 nếu chưa kiểm tra Git và đọc lại phần Phase 6 trong roadmap.

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
