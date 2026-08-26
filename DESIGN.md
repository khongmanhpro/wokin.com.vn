# DESIGN.md — Design tokens & layout spec cho clone wokintools.com

> Các giá trị dưới đây được trích TRỰC TIẾP từ computed style của https://www.wokintools.com/
> (theme Woodmart 8.5.7). Clone phải bám sát các giá trị này.

## 1. Colors
| Token | Giá trị | Dùng ở |
|---|---|---|
| `--primary` | `#FE7700` (rgb 254 119 0) | Màu thương hiệu: nút CTA, accent, hover, badge NEW |
| `--title-color` | `#2C333B` | Tiêu đề, link mặc định (link-color gốc của theme) |
| `--text-color` | `#777777` | Body text phụ |
| `--dark-bg` | `#212121` | Footer, header variant tối, banner |
| `--darker-bg` | `#111111` | Khối banner đậm hơn |
| `--bg` | `#FFFFFF` | Nền chính |
| `--border` | `rgba(0,0,0,.105)` | Viền card, input |

## 2. Typography
- **Heading font**: `"Tomorrow"`, fallback Arial, Helvetica, sans-serif — weight **700**, không uppercase mặc định (nội dung tự viết HOA)
- ⚠️ **Bản clone chạy tiếng Việt**: Tomorrow KHÔNG có đầy đủ glyph tiếng Việt (thiếu ữ, ệ, ơ, đ ở một số weight) → cấu hình next/font/google:
  - `Tomorrow({ subsets: ['latin', 'latin-ext'], weight: ['600','700'] })` cho heading (đủ chữ cái cơ bản có dấu)
  - Body dùng **Be Vietnam Pro** (`subsets: ['vietnamese']`) hoặc Arial stack hệ thống
  - Kiểm tra bắt buộc: render chuỗi "Dụng cụ cơ khí ữ ệ ơ đ" trên heading + body trước khi duyệt layout
- **Body font gốc site: Arial/Helvetica/sans-serif** — clone giữ Arial stack cho giống y
- H2 section title (desktop): **43px**; heading khác scale theo cấp (h1 ~54px hero, h3 ~28px, h4 ~22px)
- Product card title: ~16px, weight 600–700, màu `--title-color`, hover → `--primary`
- SKU trên card: ~14px, màu `#777`
- Mobile: giảm heading xuống ~60% (Woodmart breakpoint 1024px)

## 3. Layout
- **Breakpoints**: desktop ≥1025px, mobile ≤1024px (chuẩn Woodmart — đặt Tailwind `md: '1025px'`)
- Container: max-width **1222px** (Woodmart default) + padding 20px
- **Header tổng cao ~147px** desktop, gồm:
  - Top bar (~45px): tagline "QUALITY TOOLS, QUALITY WORK" nền tối/trắng tuỳ biến, chữ nhỏ 12px
  - Main row (~100px): logo trái | menu giữa (PRODUCTS · GP20V · NEW PRODUCTS · SUPPORT▾) | search + icons phải
  - Sticky khi scroll (shadow nhẹ `0 1px 8px rgba(0,0,0,.1)`)
- **Product grid**: ul.products — desktop 4 cột, tablet 3, mobile 2; gap ~30px hàng / 20px cột... (Woodmart default 30px)
- Category card grid trang chủ: tương tự 4–5 cột, ảnh vuông + tên dưới

## 4. Components (bắt chước class Woodmart)
### ProductCard (`li.product / .product-grid-item`)
- Ảnh sản phẩm tỉ lệ 1:1, object-contain, nền trắng
- Tên UPPERCASE → hover đổi cam; SKU bên dưới
- Badge "NEW" góc ảnh: nền `--primary`, chữ trắng, ~11px
- Border rất nhẹ hoặc none; hover: shadow `0 0 10px rgba(0,0,0,.12)` + translateY(-2px)

### Buttons
- Primary: nền `#FE7700`, chữ trắng, uppercase, font Tomorrow 600, padding ~12px 30px, radius 0 (vuông — đặc trưng industrial), hover nền tối hơn ~10%
- Secondary/outline: viền `--title-color`, hover viền cam

### Hero slider (Home)
- Full-width, cao ~500-600px desktop, ảnh phủ toàn khối, text overlay trái:
  - dòng nhỏ uppercase màu cam ("QUALITY TOOLS, QUALITY WORK" đã ở topbar; trong hero là "Crafted for Precision.")
  - H1 lớn 2 dòng Tomorrow 700 trắng
  - Nút EXPLORE primary
- Swiper autoplay + arrow trắng viền tròn + dots

### Section "category grid" (ENHANCE YOUR TOOLBOX)
- Tiêu đề H2 căn giữa 43px + subtitle xám
- Grid category card: ảnh + tên UPPERCASE căn giữa, hover ảnh scale 1.05

### Banner khối (Racing / GP20V / Distributors)
- Ảnh nền full-width + overlay text trái/nữa trái, nút CTA; chiều cao ~350–450px
- GP20V banner: nền tối + tông cam

### Footer
- Nền `#212121`, chữ trắng/xám nhạt, social icons tròn viền trắng
- Dòng cuối: ©WOKIN TOOLS {year} · Cookie Policy · Privacy Statement (căn giữa, 13px)

### Product detail
- Breadcrumb: Home / CATEGORY / NAME (13px, phân cách "/")
- Gallery trái (ảnh lớn + thumbnails dọc/ngang), info phải: tên H1 Tomorrow, SKU, category link
- Spec list: giữ nguyên định dạng `> item` từ short_description HTML (sanitize nhưng giữ `<p>, <br>, <table>, <tr>, <td>, <strong>`)
- Bảng STOCK NO./QTY./CARTON: border-collapse, ô viền 1px, căn giữa — render thẳng từ HTML bảng có sẵn
- Related products: 4 cột ProductCard cùng category

### Pagination
- Số trang vuông, active nền `--primary` chữ trắng, hover viền cam

## 5. Icon & hình
- Icon: dùng lucide-react hoặc font-awesome subset (search, menu, chevron, phone, mail, whatsapp, social)
- Logo: tải `wp-content/uploads/2023/09/WOKIN-logo-orange-white.png` về `public/images/logo.png` (2 bản: cam-trắng cho nền sáng, trắng cho footer nếu cần)
- Favicon: cắt từ logo

## 6. Motion
- Nhẹ nhàng đúng tinh thần Woodmart: fade-in-up khi scroll vào viewport (IntersectionObserver), transition 0.25s ease mọi hover, slider autoplay 5s
- Không animation phức tạp — site gốc gần như tĩnh
