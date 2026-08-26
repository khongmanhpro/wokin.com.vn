# BÁO CÁO NGHIÊN CỨU WEBSITE — wokintools.com (chuẩn bị clone)
> Ngày nghiên cứu: 2026-08-26 · Nguồn: crawl trực tiếp site + HTTP headers + sitemap

## 1. Tổng quan
| Hạng mục | Giá trị |
|---|---|
| Site | https://www.wokintools.com/ |
| Thương hiệu | WOKIN TOOLS (ZJG WOKIN INDUSTRIAL CO., LTD.) |
| Loại hình | B2B catalog website (không bán hàng online — chỉ hiển thị sản phẩm + SKU, không giá) |
| Ngôn ngữ | Tiếng Anh (mono-site) |
| Tagline | "QUALITY TOOLS, QUALITY WORK" / "Crafted for Precision. Trusted by Professionals." |

## 2. Tech stack (site gốc)
- **WordPress 7.0.2** trên **Hostinger** (`platform: hostinger`, `panel: hpanel`, server **LiteSpeed**, PHP 8.2)
- **Theme: Woodmart** (premium WooCommerce theme) + logo `🐴` trong title
- **Page builder: Elementor 4.2.3** (additional_custom_breakpoints, css external, font_display-swap)
- **WooCommerce** — dùng làm product catalog (product, product-category), KHÔNG có cart/checkout công khai (robots Disallow /cart/ /checkout/ /my-account/, không hiện giá)
- **SEO: Rank Math** (sitemap_index.xml do Rank Math generate)
- **Site Kit by Google 1.184.0** (GA/GSC)
- Plugin khác phát hiện được:
  - `agile-store-locator` — bản đồ nhà phân phối
  - `bit-assist` — nút chat floating (WhatsApp v.v.)
  - `complianz-gdpr-premium` — cookie consent
  - `dflip` — flipbook PDF (catalogue)
  - `fluentform` — form liên hệ
  - `woo-product-attachment` — tab Attachment trên trang sản phẩm
- robots.txt chặn: /shop/, query sort/per_page, catalogue PDF

## 3. Cấu trúc trang & nội dung

### 3.1 Header
- Topbar/tagline: "QUALITY TOOLS, QUALITY WORK"
- Menu chính: **PRODUCTS** | **GP20V** | **NEW PRODUCTS** | **SUPPORT** (dropdown: ABOUT WOKIN, CONTACT WOKIN, SEEKING DISTRIBUTORS)
- Mobile: hamburger MENU → panel "CATEGORIES" liệt kê toàn bộ category
- Logo: `wp-content/uploads/2023/09/WOKIN-logo-orange-white.png` (cam + trắng)

### 3.2 Trang chủ (/)
1. Hero slider: "Crafted for Precision. Trusted by Professionals." + "The Respect of Professionals"
2. Banner trust: "TRUSTED BY OVER 100 COUNTRIES WORLDWIDE"
3. Grid ~30 category cards: "ENHANCE YOUR TOOLBOX — by professional categories"
4. Banner racing: "EMBRACE THE SPIRIT OF RACING GREATNESS!" (ảnh wokin-racing) + EXPLORE
5. Banner GP20V: "ONE BATTERY, ENDLESS POSSIBILITY." → EXPLORE GP20V
6. CTA phân phối: "GLOBAL DISTRIBUTORS WANTED!" (3000+ products) → CONTACT US
7. Footer: ©WOKIN TOOLS. 2026 · Cookie Policy · Privacy Statement

### 3.3 Trang tĩnh
- **/about-wokin/** — brand story: bán tại 100+ nước, 3000+ SKU in-stock, platform GP20V 20V Li-Ion, warehouse 20.000 m² gần Thượng Hải, mời network distributor
- **/seeking-distributors/** — landing tuyển đại lý (3500+ products, store design support)
- **/contact-wokin/** — FluentForm ("Contact Form WOKIN"): First/Last Name, Email, WhatsApp Number, Country (dropdown đầy đủ), Company Name, Subject, Message + khối "Reach Us For Any Question":
  - ZJG WOKIN INDUSTRIAL CO., LTD. — 350 Yangjin Road, Zhangjiagang, Jiangsu, China 215612
  - T: 0086-512-55398656 · WhatsApp: 0086 18901552950 · WeChat: jssjj333 · QQ: 2885167231 · sales@wokintools.com
  - Distributor chính thức: ITALY (VIRIDEX SRL, wokintools.it), BRAZIL (BELLKO, wokintools.com.br), LIBYA (Desan), FRANCE (COMAI S.A.), ISRAEL (P.A.I Tools)

### 3.4 WooCommerce
- **/products/** — archive grid toàn bộ category (30 category, gồm cả NON-SPARKING TOOLS, MERCHANDISING AND PROMOTIONAL)
- **/new-products/** — trang sản phẩm mới (badge NEW, hiện tên + SKU)
- **/gp20v/** — landing platform pin 20V (thực chất archive category 20v-lithium-ion-platform)
- Category page: grid 20 SP/trang, dropdown "Show 20/25/30", pagination số
- Số trang lớn nhất theo category (≈20 SP/trang):
  automotive-tools 6 · fastening-tools 5 · power-tools 5 · power-tools-accessories 5 · mechanics-tools 4 · holding-tools 4 · painting-and-masonry 4 · power-tools-110-120v 4 · pneumatic-tools 4 · garden-tools 4 · tool-sets 2 · striking-tools 2 · cutting-tools 3 · plumbing-tools 2 · measuring-tools 2 · electrical-tools 2 · insulated-tools 2 · ppe 3 · lifting-and-handing 2 · hardware-and-others 4 · 20v-platform 3 · tool-bag-and-storage 2 · non-sparking 2 · các cat còn lại ≤1 trang
- **Product detail**: breadcrumb Home / CAT / Tên · gallery ảnh · mô tả dạng spec list (`> ...`) · bảng STOCK NO. / QTY./CARTON · SKU · Category · Related products · **tab Attachment** (woo-product-attachment, catalogue PDF bị robots chặn)
- Không có giá, không có nút add-to-cart → chế độ **catalog visibility**

### 3.5 Quy mô dữ liệu cần clone
- **1.357 sản phẩm** (7 product sitemap × ~200 URL, đã gom về `~/wokin-research/product_urls.txt`)
- **~30 trang/taxonomy** (`page_urls.txt`)
- 30 product category

## 4. Design system
- **Font tiêu đề: Tomorrow** (Google Fonts, weight 600;700 — font kỹ thuật/racing, dùng cho heading lớn)
- Font icon theme: woodmart-font
- Màu chủ đạo: **cam WOKIN** (logo orange-white), nền tối #212121/#111111 cho footer/banner, nền trắng #fff
- Layout Woodmart chuẩn: header sticky, hero full-width, category card grid, product card = ảnh + tên UPPERCASE + SKU
- Breakpoints bổ sung qua Elementor additional_custom_breakpoints

## 5. Social & liên kết ngoài
- Facebook: facebook.com/wokintools
- Instagram: instagram.com/wokinglobal
- YouTube: channel UCf5jL6NUqk_TYTapGhPvzXA
- LinkedIn: linkedin.com/company/wokintools

## 6. Ghi chú pháp lý / đạo đức khi clone
- Toàn bộ text, ảnh, logo thuộc copyright WOKIN. Clone để **học cấu trúc/làm demo** thì ổn; đưa lên production với nội dung gốc là vi phạm.
- Khuyến nghị: clone structure + design pattern bằng theme/plugin của mình (user đã có stack Flatsome/custom), thay nội dung mẫu.

## 7. Đề xuất hướng clone (cho stack của user)
1. **Data**: scrape 1.357 product (tên, SKU, category, gallery, spec list, bảng stock/carton) → CSV/WP import (WP All Import hoặc wc_product_csv)
2. **Structure**: WooCommerce catalog mode (ẩn giá/cart) — plugin YITH Catalog Mode hoặc snippet
3. **Theme**: dựng theo Woodmart layout nhưng bằng child theme hiện có; heading font Tomorrow
4. **Pages**: Home (slider + category grid + 3 banner CTA), About, Seeking Distributors, Contact (Fluentform → form tự viết), New Products
5. **Menu**: PRODUCTS / GP20V / NEW PRODUCTS / SUPPORT▾ (About, Contact, Distributors)
6. **SEO**: Rank Math schema Organization/Product đã có trên site gốc — replicate bằng MU-plugin schema sẵn có của user

## Files đính kèm (~/wokin-research/)
- `product_urls.txt` — 1.357 URL sản phẩm
- `page_urls.txt` — sitemap pages
- (text các trang chính đã lưu trong workspace browser: home/about/products/new_products/gp20v/distributors/contact .txt, home.html, product.html)
