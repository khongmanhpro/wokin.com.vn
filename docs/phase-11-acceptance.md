# Phase 11 — Final production acceptance

Ngày: 2026-09-14 · Artifact: `out/` build từ `main` · Server audit: `python3 -m http.server` (không gzip/cache, nên số mobile bị bi quan so với Hostinger).

## Kết luận

**NO-GO cho production.** Kỹ thuật (build, SEO, a11y, bảo mật, release pack) đạt. Chặn release vì **chất lượng nội dung spec sản phẩm** và **quyết định về độ giống giao diện** chưa được chốt.

## 1. Gate kỹ thuật

| Gate | Kết quả |
|---|---|
| `npm audit --audit-level=high` | 0 vulnerabilities |
| typecheck / test | PASS · 65 tests |
| validate:data / check:data | PASS · 1357 SP, 30 danh mục |
| build / validate:export | PASS · 1452 trang, 1447 routes, 10271 file |
| package:release | PASS · SHA256SUMS 100% OK, archive deterministic |
| Browser smoke (5 trang × desktop 1440 / mobile 390) | HTTP 200, 0 console error, 0 ảnh hỏng, không tràn ngang |

## 2. Lighthouse (sau khi sửa)

| Trang | Mobile Perf | Desktop Perf | A11y | Best Practices | SEO |
|---|---|---|---|---|---|
| Home | 79 (LCP 5.7s) | 98 | 96 | 100 | 100 |
| Danh mục | 78–83 | 99 | 100 | 100 | 100 |
| Sản phẩm | 84 (LCP 4.6s) | 99 | 96 | 100 | 100 |
| Sản phẩm mới | 80 | 99 | 96 | 100 | 100 |
| Liên hệ | 87 | 100 | 96 | 100 | 100 |

Trước khi sửa: Best Practices 96, A11y 95–96, home mobile LCP 8.9s / 2 MB ảnh.

### Đã sửa trong Phase 11

- Ảnh LCP trang sản phẩm có `fetchPriority="high"` nhưng vẫn `loading="lazy"` → eager.
- Hero, StaticHero, banner, card danh mục dùng WebP responsive thay JPG gốc (home mobile 2068 KB → 987 KB).
- Trang chủ có 2 `<h1>` (slide 2) → chỉ slide đầu là `h1`.
- Bảng đóng gói thiếu header → `<thead>`/`<th scope="col">` khi hàng đầu là "MÃ KHO".
- Logo khai báo sai tỉ lệ (180×60, 150×50 vs thực 301×52).
- Alt thừa ở card danh mục; `aria-label` card sản phẩm lệch nội dung hiển thị.
- `--text` #777777 → #767676 (4.47 → 4.54:1, không đổi thị giác).

### Còn lại (cần quyết định)

- **Tương phản màu thương hiệu:** chữ trắng trên nút #FE7700 (2.67:1) và chữ cam trên nền trắng (eyebrow, link danh mục) không đạt WCAG AA. Site gốc cũng vậy. Phương án: chữ tối #111 trên nút cam (≈7.9:1), cam đậm hơn cho chữ nhỏ.
- Mobile LCP 4.6–5.7s trên server không nén; cần đo lại trên staging Hostinger (gzip/brotli + cache headers) trước khi tối ưu thêm.

## 3. Blocker nội dung — spec sản phẩm

Bộ dịch spec (`translateSpecLine` trong `scripts/build-catalog-data.mjs` và `src/lib/catalog.ts`) thay dòng còn tiếng Anh bằng nhãn chung:

| Chỉ số | Giá trị |
|---|---|
| Sản phẩm có dòng bị thay bằng "Đặc tính kỹ thuật"/"Thông số kỹ thuật" | **1168 / 1357 (86%)** |
| Dòng spec mất nội dung | **2773 / 10011 (28%)** |
| Dòng còn lẫn tiếng Anh (vd "Rated Điện áp", "Max pump pressure") | ~738 dòng / 398 SP |
| Header bảng đóng gói còn tiếng Anh (vd "Rated current") | 64 SP |

Ví dụ `/san-pham/may-nen-khi/`: 4 dòng tính năng (dùng cho xưởng, bảo vệ quá nhiệt, van điều áp + đồng hồ, bánh xe + tay kéo) đều hiển thị thành "Đặc tính kỹ thuật". Khách B2B mất thông tin, và 2773 dòng giống hệt nhau là tín hiệu nội dung mỏng cho SEO.

Đề xuất: dịch lại toàn bộ dòng spec gốc bằng pipeline có glossary, lưu bản dịch làm dữ liệu nguồn (`data/`) thay vì dịch regex lúc build, thêm gate `validate:data` fail khi còn placeholder, và cho người review mẫu theo danh mục.

## 4. So sánh giao diện với wokintools.com

Bố cục trang sản phẩm, danh mục, sản phẩm mới khá sát. Khác biệt lớn:

| Khu vực | Gốc | Clone |
|---|---|---|
| Header | Nền cam #FE7700, logo trắng, menu cạnh logo, icon mạng xã hội | Nền trắng, menu giữa, không icon MXH |
| Hero | Ảnh lifestyle (thợ máy) + hộp chữ cam | Ảnh sản phẩm phủ xám |
| Trust banner | Nền cam, chữ tối | Nền đen, chữ trắng |
| Danh mục trang chủ | Carousel 6 icon | Lưới 30 card |
| Banner Racing / GP20V / Đại lý | Ảnh/video marketing riêng, bố cục 2 cột | Ảnh sản phẩm phóng to bị mờ, 1 cột |
| Footer | Tối #2C333B, tối giản | Đen, có logo + link |
| Liên hệ | Form + địa chỉ, điện thoại, email, WhatsApp công ty | Không form (Phase 7), **không có thông tin liên hệ nào của công ty** |

Nguyên nhân chính: `AGENTS.md` chỉ cho tải logo, nên không có ảnh marketing. Cần quyết định: xin bộ ảnh marketing chính thức từ WOKIN, hay chấp nhận thiết kế khác bản gốc.

## 5. Chưa kiểm được

- `.htaccess` (security headers, redirect 301) — server local không phải Apache; kiểm trên staging theo `RELEASE-CHECKLIST.md` mục 4.
- GitHub Actions chạy thật — `origin/main` mới có initial commit.
- Screen reader thật (VoiceOver/NVDA).
