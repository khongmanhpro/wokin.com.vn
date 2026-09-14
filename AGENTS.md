# AGENTS.md — WOKIN Clone (Next.js) — TASK CHO CODEX

> ⚠️ **BẮT BUỘC:** Trước khi làm bất cứ việc gì, đọc [`WORKLOG.md`](WORKLOG.md): trạng thái hiện tại, việc đang mở, nhật ký.
> Sau mỗi phiên làm việc (kể cả chỉ audit), thêm entry vào `WORKLOG.md` và cập nhật mục trạng thái/việc mở theo quy tắc ở đầu file đó.
> Phần G0–G5 bên dưới là brief ban đầu; dự án đã đi xa hơn (Phase 0–11), xem `WORKLOG.md`.

> **Bạn là agent thực thi. Mục tiêu: clone 1:1 website https://www.wokintools.com/ bằng Next.js.**
> Đọc đủ 3 file này trước khi code, theo đúng thứ tự:
> 1. `PROMPT-CLONE-NEXTJS.md` — kiến trúc, routes, data schema
> 2. `DESIGN.md` — design tokens & component spec (giá trị trích trực tiếp từ site gốc, KHÔNG tự chế màu/font khác)
> 3. File này — quy trình & tiêu chí nghiệm thu
>
> Tham chiếu HTML thật của từng loại trang: thư mục `reference/` (home, category-tool-sets,
> product-detail, new-products, gp20v, contact-wokin, about-wokin, seeking-distributors).
> Khi phân vân một component trông thế nào → mở file HTML tương ứng xem cấu trúc class Woodmart và bám theo.

## 0. Nguyên tắc bất di bất dịch
1. **KHÔNG scrape/crawl wokintools.com khi build.** Toàn bộ dữ liệu đã có trong `data/`. Reference HTML chỉ để ĐỌC.
2. **Clone layout 1:1, NGÔN NGỮ tiếng Việt** = giống về cấu trúc, layout, màu, font; toàn bộ text hiển thị bằng tiếng Việt chuyên ngành (xem mục 1.5). Không "cải tiến" thiết kế.
3. Route key = `slug` (có SKU trùng). Không hiển thị giá, không cart (site gốc không có).
4. **URL dùng slug VIỆT** (sinh sẵn trong `data/products_vi.json` — slug_vi, đã khử dấu, trùng thì gắn SKU): `/san-pham/{slug_vi}`, `/danh-muc/{cat-slug}`. Đây là yêu cầu SEO cho thị trường VN.
5. Build phải pass `next build` với 0 error trước khi báo xong mỗi giai đoạn.

## 1. Dữ liệu đầu vào
| Nguồn | Nội dung |
|---|---|
| `src/data/products.json` | 1.357 SP: id, name, slug, sku, categories[], images[] (URL gốc), short_description (HTML spec + bảng stock), attributes |
| `src/data/categories.json` | 30 category |
| `src/data/product_dates.json` | id → date; sort desc = NEW PRODUCTS (đã verify khớp site gốc) |
| `public/images/products/<sku>/` | ảnh local (~2-3k file) + `data/image_manifest.json` map slug→paths |
| `data/products_vi.json` | **Bản dịch VI chuẩn**: {id, sku, name_en, name_vi, slug_vi} cho 1.357 SP — nguồn chân lý cho tên hiển thị + URL |
| `data/vi-glossary.json` | Từ điển thuật ngữ chuyên ngành (categories VI, UI labels, marketing copy VI, terms) — dùng cho MỌI text UI/marketing còn lại, không tự dịch riêng lẻ |
| `data/pages-content.md` | Nội dung gốc các trang tĩnh (tiếng Anh) — dịch sang VI bằng vi-glossary trước khi đưa vào JSX |
| `reference/*.html` | HTML render thật của 9 trang mẫu để đối chiếu markup |

### 1.5 Chuẩn tiếng Việt chuyên ngành (bắt buộc)
- Tên SP: lấy **`name_vi`** từ `data/products_vi.json` (map qua `id`). KHÔNG dùng name_en ở bất kỳ chỗ nào hiển thị.
- URL sản phẩm: `/san-pham/{slug_vi}` · danh mục: `/danh-muc/{slug-en-của-category}` (slug category giữ tiếng Anh để ổn định, tên hiển thị VI theo glossary "categories").
- Mọi label UI, menu, nút bấm: tra `vi-glossary.json > ui`. Copy marketing: mục `marketing`. Thuật ngữ trong spec/descriptions khi cần hiển thị thêm: mục `terms`, `spec_labels`.
- `<html lang="vi">`. Font Tomorrow không đủ glyph tiếng Việt đầy đủ → load kèm font fallback có dấu (VD: Be Vietnam Pro cho body, Tomorrow chỉ cho heading số/la-tinh; kiểm tra glyph 'ữ ệ ơ' render đúng).

Lưu ý data:
- `short_description` là HTML thô chứa spec list dạng `<p>> ...` và `<table>` STOCK NO./QTY./CARTON → sanitize giữ `<p> <br> <table> <tbody> <tr> <td> <strong> <em>` rồi render `dangerouslySetInnerHTML`.
- Ảnh: ưu tiên local qua manifest; nếu manifest thiếu SP nào thì fallback URL gốc qua `next.config.ts images.remotePatterns`.

## 2. Giai đoạn xây dựng (làm tuần tự, commit sau mỗi giai đoạn)

### G0 — Scaffold
Next.js 15 App Router + TS + Tailwind. `npm create next-app@latest . --ts --tailwind --app --no-src-dir` (hoặc tương đương). Copy `data/*.json` → `src/data/`. Cấu hình:
- Tailwind breakpoint `md: '1025px'`, `sm: '768px'`
- `next/font/google` load Tomorrow (600,700)
- tokens màu từ DESIGN.md vào `globals.css` dạng CSS variables

### G1 — Data layer `src/lib/catalog.ts`
Types Product/Category + hàm thuần: getAllProducts, getProductBySlug, getProductsByCategory(slug), getCategoryBySlug, getNewProducts(n=24), getRelated(product, n=4), searchAll(q). Viết vài assert đơn giản kiểm tra count (1357 products / 30 categories).

### G2 — Layout & chrome
Header (topbar + main row sticky, dropdown SUPPORT, mobile drawer CATEGORIES, search box mở fullscreen overlay như Woodmart), Footer (#212121). Logo tải từ `https://www.wokintools.com/wp-content/uploads/2023/09/WOKIN-logo-orange-white.png` về `public/images/logo.png` (file tĩnh duy nhất được phép tải trực tiếp).

### G3 — Pages tĩnh
Home (hero slider swiper + trust banner + category grid + 3 banner CTA), About, Distributors, Contact (UI form đầy đủ field như gốc; submit defer). Copy text y nguyên từ `data/pages-content.md` (nếu chưa có, lấy từ reference HTML).

### G4 — Catalog routes
`/san-pham` (tổng) · `/danh-muc/[slug]` (+ pagination 20/trang, generateStaticParams cho mọi page) · `/san-pham/[slug_vi]` (gallery + spec + bảng stock + related) · `/san-pham-moi` · `/gp20v`. Tất cả tên hiển thị = name_vi.

### G5 — SEO & chống trùng lặp (quan trọng nhất)
Metadata API + JSON-LD (Organization, WebSite, Product, BreadcrumbList) + `sitemap.ts` (~1390 URL VI) + robots.ts + favicon. Kiểm tra Lighthouse SEO ≥ 95.

**Chiến lược tránh bị Google đánh là duplicate của wokintools.com:**
1. **100% nội dung hiển thị tiếng Việt** — tên SP, spec labels, UI, marketing copy đều bản VI riêng → khác ngôn ngữ hoàn toàn với nguồn, Google không gộp nội dung.
2. **Spec kỹ thuật giữ số liệu nhưng viết lại câu chữ VI** — không copy nguyên đoạn HTML EN từ `short_description`; parse thành list rồi diễn đạt lại bằng thuật ngữ glossary.
3. **URL hoàn toàn khác** (`/san-pham/...`, `/danh-muc/...`) — không map 1:1 path cũ.
4. KHÔNG đặt thẻ canonical trỏ về wokintools.com. Canonical tự trỏ chính nó.
5. robots.txt chặn hết; không nhúng link ra site gốc ở frontend (logo dùng bản tải local).
6. Thêm giá trị độc lập để Google đánh giá cao: meta description VI riêng mỗi SP (sinh từ name_vi + SKU + category VI), alt ảnh = name_vi, trang danh mục có đoạn intro VI 2-3 câu theo template glossary.

## 3. Tiêu chí nghiệm thu cuối
- [ ] `npm run build` pass, không error/warning nghiêm trọng
- [ ] Đếm route tĩnh sinh ra ≥ 1.357 product pages + 30+ category pages
- [ ] So sánh side-by-side 5 trang (home, 1 category, 1 product, new-products, contact) với reference HTML: cùng thứ tự section, cùng nội dung text, cùng bố cục
- [ ] Mobile ≤1024px: menu drawer, grid 2 cột hoạt động
- [ ] Search tìm được SP theo tên/SKU client-side
- [ ] JSON-LD hợp lệ (test bằng view-source, thấy script ld+json)
- [ ] Không còn tham chiếu tới wokintools.com ở runtime (trừ fallback ảnh đã ghi rõ)

## 4. Môi trường
- Thư mục có **dấu cách**: `/Volumes/data AI/wokin.com.vn` — luôn quote path trong shell
- Node ≥ 20. Chạy dev: `npm run dev`; build: `npm run build`
- Nếu `npm create next-app` hỏi prompt tương tác → dùng cờ non-interactive hoặc trả lời mặc định, không được dừng lại hỏi người dùng
