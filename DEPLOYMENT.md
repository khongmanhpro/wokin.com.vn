# Triển khai static export trên Hostinger/Apache

Ứng dụng dùng `output: "export"`. Next.js tạo file tĩnh trong `out/` và không thể tự gắn response security headers bằng `headers()` khi Hostinger/Apache phục vụ các file này. Header production vì vậy nằm tại tầng Apache/LiteSpeed hoặc CDN.

## Chuẩn bị artifact

1. Từ clean checkout, chạy `npm ci`, `npm audit --audit-level=high`, `npm run typecheck`, `npm test`, `npm run validate:data`, `npm run check:data`, `npm run build` và `npm run validate:export`.
2. Tạo release pack bằng `npm run package:release`. Lệnh mặc định đọc `out/` và tạo `release/`; có thể chỉ định đường dẫn bằng `npm run package:release -- --out-dir <out-dir> --release-dir <release-dir>`.
3. Upload **nội dung bên trong** `release/hostinger/` vào document root của domain. `.htaccess` đã được copy vào đúng package root; bật hiển thị dotfile trong file manager để xác nhận file thực sự được upload.
4. Nếu Hostinger/LiteSpeed không áp dụng `Header`, bật module/tính năng response headers trong hPanel hoặc cấu hình các header tương đương tại CDN. Không dùng Next.js `headers()` làm phương án thay thế cho static export.

Packager không sửa `out/`, từ chối release destination đã tồn tại và dựng package qua thư mục tạm trước khi publish. Nó fail nếu export chứa source map, `.env`, secret/credential file hoặc secret signature đã biết, raw audit JSON, symlink, `node_modules`, `.git`, `.next`, `.cache` hay `.npm`.

## Bố cục release pack

```text
release/
├── hostinger/                 # document root: toàn bộ nội dung out/ + .htaccess
├── SHA256SUMS                 # SHA-256, sắp xếp theo relative path hostinger/...
└── wokin-hostinger.tar.gz     # deterministic tar.gz chứa hostinger/ và SHA256SUMS
```

`SHA256SUMS` không tự checksum archive để tránh vòng tham chiếu. Archive cố định owner, mode và mtime trong tar/gzip để hai lần package cùng input tạo cùng SHA-256. Trước upload, kiểm tra manifest từ thư mục `release/` bằng `sha256sum -c SHA256SUMS` trên Linux hoặc `shasum -a 256 -c SHA256SUMS` trên macOS, rồi thử `tar -tzf release/wokin-hostinger.tar.gz` và giải nén vào một thư mục trống.

CI chạy cùng các gate trên `ubuntu-latest` và chỉ upload hai nhóm build output sau khi mọi gate pass: raw `out/` để review, cùng `SHA256SUMS`/`wokin-hostinger.tar.gz` để bàn giao Hostinger. CI không deploy production và không đưa `node_modules`, source tree hoặc raw audit JSON vào artifact.

Quy trình release, staging verification, rollback và approval gate đầy đủ nằm trong `RELEASE-CHECKLIST.md`.

## Redirect URL legacy

`.htaccess` chuyển hướng 301 trực tiếp `/about/` sang `/gioi-thieu/`, `/contact/` sang `/lien-he/` và `/distributors/` sang `/nha-phan-phoi/`. Rule được neo toàn bộ path nên không bắt nhầm URL con hoặc tạo loop. Apache giữ query string theo mặc định, ví dụ `/contact/?utm_source=legacy` chuyển một bước đến `/lien-he/?utm_source=legacy`.

Không upload HTML cho ba route legacy và không thêm redirect product/category nếu chưa có mapping được xác minh từ dữ liệu local.

## Contact backend và decision gate

Route canonical `/lien-he/` có form gửi tới Payload Admin, không gửi thẳng tới email/provider bên thứ ba. Backend lưu bản ghi `contact-submissions`; quản trị viên có capability `settings.manage` xem và cập nhật trạng thái trong menu **Liên hệ**.

Trước khi build public production:

1. Chạy migration Payload `20260920_000001_contact_submissions` trên database production.
2. Đặt `CONTACT_ALLOWED_ORIGINS=https://wokin.vn` (và thêm hostname production thực tế nếu có) ở admin. Origin production phải dùng HTTPS.
3. Build static site với `NEXT_PUBLIC_CONTACT_API_URL=https://<admin-host>/api/contact-submissions/submit`. Nếu bỏ biến này, form vẫn hiển thị nhưng chỉ báo chưa kết nối backend và không giả thông báo thành công.
4. Kiểm thử cả success, validation, lỗi backend và rate limit; xác nhận một bản ghi xuất hiện trong Admin trước approval `GO`.

Form có server-side validation, consent bắt buộc, honeypot và giới hạn 5 lượt gửi mỗi IP/giờ. Không đưa database credential hoặc admin secret vào public build.

## Chính sách header

`.htaccess` thiết lập `nosniff`, referrer policy, permissions policy, `X-Frame-Options: SAMEORIGIN` và CSP có `frame-ancestors 'self'`. CSP không có `unsafe-eval`; `object-src 'none'` và `frame-src 'none'` chặn plugin/frame không được dùng bởi catalog.

CSP hiện cho phép `'unsafe-inline'` ở `script-src` và `style-src` vì static export của Next.js chứa bootstrap/hydration script nội tuyến và có thể chứa style nội tuyến. Apache không thể tạo nonce khớp từng file HTML tĩnh ở mỗi response. Đây là phần rủi ro còn lại: nếu một lỗ hổng khác đưa được markup vào trang, inline script có thể chạy. Trước khi bỏ `'unsafe-inline'`, cần lập inventory hash của toàn bộ inline block sau mỗi build hoặc chuyển sang tầng phục vụ có nonce động, rồi test lại mọi trang và chunk `/_next/static/`. Không thêm `'unsafe-eval'`.

HSTS mặc định bị comment để tránh khóa HTTP hoặc hostname chưa sẵn sàng. Chỉ bật sau khi production và mọi hostname bị ảnh hưởng đều redirect HTTPS ổn định. Triển khai theo bậc `max-age=300`, sau đó `86400`, rồi mới `31536000`; theo dõi ở mỗi bậc. Rollback là bỏ header ngay, nhưng browser đã nhận HSTS vẫn giữ chính sách đến hết `max-age`, vì vậy không bật `includeSubDomains` hay `preload` trong phase này.

## Xác minh staging/production

Chạy với hostname thật sau khi upload:

```bash
curl -I https://staging.example.vn/
curl -I https://staging.example.vn/san-pham/
curl -I https://staging.example.vn/_next/static/<chunk-thuc-te>.js
curl -I 'https://staging.example.vn/about/?utm_source=legacy'
curl -I https://staging.example.vn/contact/
curl -I https://staging.example.vn/distributors/
```

Mỗi response cần có `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` và `Content-Security-Policy`. `Strict-Transport-Security` phải vắng mặt cho tới khi hoàn thành HTTPS gate ở trên.

Ba URL legacy phải trả đúng `301` trong một bước, `Location` lần lượt là `/gioi-thieu/`, `/lien-he/`, `/nha-phan-phoi/`; request đầu tiên phải giữ `utm_source=legacy`. Ba URL đích phải trả `200`. Nếu LiteSpeed không đọc `mod_rewrite`, cấu hình cùng redirect matrix ở hPanel/CDN và kiểm tra lại trước khi phát hành.

Sau đó mở Home, một danh mục, một sản phẩm, sản phẩm mới và Contact trên desktop/mobile; kiểm tra Network và Console không có CSP violation, JS/CSS/ảnh đều tải, search/menu hoạt động, JSON-LD vẫn hiện trong view source và parse được. Nếu CSP làm hỏng asset, rollback riêng file `.htaccess` về bản trước và điều tra directive cụ thể; không tắt toàn bộ header lâu dài.

## Responsive product images cho static Hostinger

`npm run build:images` đọc các media path duy nhất từ `src/data/catalog.generated.json`, kiểm tra từng file nguồn trong `public/images/products/`, rồi dùng Sharp đã có trong dependency tree để tạo WebP quality 82. Các nấc chuẩn là 320, 480, 640, 800 và 1200 px; pipeline chỉ giữ nấc không lớn hơn ảnh nguồn và thêm native width khi cần. Vì vậy ảnh 600 px tạo 320/480/600, ảnh 800 px tạo 320/480/640/800, ảnh 1800 px dừng ở 1200; không có upscale.

Tên output deterministic dạng `public/images/products-responsive/<sku>/<stem>-w<width>.webp`. Thư mục này là build artifact bị Git ignore; `prebuild` tự chạy pipeline nên `npm run build` từ clean checkout luôn tái tạo đủ file trước static export. Metadata kích thước tối giản nằm ở `src/data/image-metadata.generated.json`; catalog dùng nó ở server/build time và chỉ truyền variants của đúng sản phẩm đang render vào gallery client.

Pipeline dựng output trong thư mục tạm rồi mới thay thế thư mục generated hiện hành. Nếu source thiếu, metadata không hợp lệ hoặc Sharp thất bại, lệnh trả exit khác 0 và không publish bộ derivatives dở dang. Output JSON của lệnh báo `sourceFiles`, `sourceBytes`, `generatedFiles` và `derivativeBytes` để theo dõi dung lượng.

Sau build, `npm run validate:export` kiểm tra mọi URL dưới `/images/products-responsive/` xuất hiện trong `srcset` hoặc `src` đều tồn tại trong `out/`. Ảnh gốc vẫn là `img src` fallback cho trình duyệt không chọn WebP hoặc media không có metadata local.
