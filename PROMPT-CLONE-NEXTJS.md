# SPEC CLONE WOKINTOOLS.COM → NEXT.JS (bàn giao cho AI build)

> Data thật đã extract xong tại `~/wokin-research/data/` — KHÔNG cần scrape lại.
> Mục tiêu: catalog B2B tĩnh, SSG, chuẩn SEO. Không cart/checkout/giá (site gốc không bán online).

## 0. Data sẵn có (input)
| File | Nội dung |
|---|---|
| `data/products.json` (~2.1MB) | 1.357 SP: id, name, slug, sku, categories[], images[] (src+alt), short_description (HTML spec `>` + bảng stock/carton), attributes[] |
| `data/categories.json` | 30 category: name, slug, count, parent |
| `data/product_dates.json` | date từng SP → dùng tính badge/listing NEW (sort desc, khớp 100% trang /new-products/ của site gốc) |
| `data/products.csv` | bản rút gọn để review |

Lưu ý data:
- `short_description` là HTML thô (chứa spec list `<p>> ...` và `<table>` STOCK NO./QTY./CARTON) → render qua `dangerouslySetInnerHTML` sau khi sanitize, hoặc parse thành structured spec ở bước normalize.
- 7 SKU trùng nhau (1357 id / 1350 sku) — dùng `slug` làm key route, không dùng SKU.
- Giá đều = 0 (site ẩn giá) → bỏ field giá.

## 1. Kiến trúc đề xuất
- **Next.js 15 App Router, output: 'export'** (static) hoặc ISR nếu deploy Vercel. TS + Tailwind CSS.
- Data layer: đọc thẳng `products.json`/`categories.json` đặt ở `src/data/`, expose qua `lib/catalog.ts` (hàm: getAllProducts, getProductBySlug, getProductsByCategory, getNewProducts(n), search).
- Ảnh: **bước tiền xử lý** — tải toàn bộ ảnh product về `public/images/products/<sku>/` bằng script (mục 6), rồi tham chiếu path cục bộ qua `next/image`. Fallback: dùng thẳng domain gốc trong `next.config.ts > images.remotePatterns`.
- Search: client-side index (fuse.js) trên tên + SKU — đủ cho 1.357 SP.

## 2. Routes (map từ site gốc — ĐÃ CẬP NHẬT theo chuẩn tiếng Việt, xem AGENTS.md là nguồn ưu tiên)
```
/                          Home: hero slider → trust banner → category grid → banner Racing → banner GP20V → CTA distributors
/san-pham                  Grid tất cả category cards (30)
/danh-muc/[slug]           Archive SP: grid 20/trang, pagination (slug category giữ EN cho ổn định)
/san-pham/[slug_vi]        Chi tiết SP (breadcrumb, gallery, spec, bảng stock, related) — slug VI từ products_vi.json
/san-pham-moi              24 SP mới nhất (badge Mới)
/gp20v                     Landing platform 20V (= archive 20v-lithium-ion-platform + hero riêng)
/about                     Giới thiệu
/distributors              Tuyển đại lý
/contact                   Form liên hệ + info công ty + danh sách distributor
/sitemap.xml, /robots.txt  generate lúc build
```
Lưu ý: bản gốc dùng `/product/`, `/product-category/` — bản clone CHỦ TƯƠNG dùng route VI ở trên để tránh trùng cấu trúc URL với nguồn (chiến lược SEO riêng biệt).

## 3. Components chính
- `Header`: topbar tagline "QUALITY TOOLS, QUALITY WORK" · logo · menu PRODUCTS / GP20V / NEW PRODUCTS / SUPPORT▾(About, Contact, Distributors) · mobile drawer CATEGORIES · search box
- `Footer`: ©WOKIN TOOLS · Cookie Policy · Privacy Statement · social (FB wokintools, IG wokinglobal, YouTube, LinkedIn)
- `ProductCard`: ảnh + tên UPPERCASE + SKU (+badge NEW)
- `CategoryCard`, `HeroSlider`, `BannerCTA` (racing/GP20V/distributors), `SpecList` (parse HTML `>`), `StockTable`, `Gallery`, `Breadcrumb`, `Pagination`, `SearchDialog`

## 4. Design tokens (từ site gốc)
- Font heading: **Tomorrow** (Google Fonts, 600/700, uppercase) — next/font/google
- Font body: sans trung tính (Inter/helvetica)
- Màu: cam thương hiệu (lấy từ logo `#f60`-ish — eyedrop từ `WOKIN-logo-orange-white.png`), footer/banner nền #111111–#212121, nền trắng
- Product card: border nhẹ, hover shadow; grid responsive 2/3/4/5 cột

## 5. SEO (bắt buộc — mục đích chính của việc clone)
- Metadata API: title `${name} | WOKIN TOOLS`, canonical, OG image = ảnh product đầu tiên
- JSON-LD: Organization + WebSite (layout), Product (trang SP: name, image, sku, brand, category), BreadcrumbList mọi trang sâu
- `generateStaticParams()` cho toàn bộ product + category + phân trang → pre-render full
- Sitemap tự sinh từ data (1.357 product URL + 30 category + pages)

## 6. Script tải ảnh (chạy 1 lần)
```python
# tools/download_images.py — đọc products.json, tải mọi images[].src về public/images/products/<sku>/<n>.jpg
# concurrency 8, retry 3, ghi manifest.json map slug->local paths
```
(~1.500–3.000 ảnh, dung lượng ước tính 300–800MB)

## 7. Thứ tự làm việc cho AI
1. Scaffold Next.js + Tailwind + cấu trúc thư mục, copy `data/*.json` vào `src/data/`
2. `lib/catalog.ts` + types (Product, Category) + hàm NEW (join product_dates)
3. Layout: Header/Footer/design tokens (font Tomorrow, màu cam)
4. Routes tĩnh: Home, About, Distributors, Contact (form UI trước, submit sau)
5. Catalog: /products, /category/[slug] (+pagination), /product/[slug], /new-products, /gp20v
6. Chạy `tools/download_images.py` → switch sang ảnh local
7. SEO: metadata, JSON-LD, sitemap, robots
8. Build `next build` phải pass 0 error; spot-check 10 URL ngẫu nhiên so với site gốc

## 8. Lưu ý pháp lý
Cấu trúc + code clone tuỳ ý; **nội dung text/ảnh/logo WOKIN thuộc copyright** — chỉ dùng cho demo/nội bộ. Production thương mại phải thay nội dung.
