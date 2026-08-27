# Triển khai static export trên Hostinger/Apache

Ứng dụng dùng `output: "export"`. Next.js tạo file tĩnh trong `out/` và không thể tự gắn response security headers bằng `headers()` khi Hostinger/Apache phục vụ các file này. Header production vì vậy nằm tại tầng Apache/LiteSpeed hoặc CDN.

## Chuẩn bị artifact

1. Chạy toàn bộ gate: `npm run typecheck`, `npm test`, `npm run validate:data`, `npm run build`, `npm run validate:export`, và `npm audit --json`.
2. Upload **nội dung bên trong** `out/` vào document root của domain.
3. Copy `deploy/hostinger/.htaccess` thành `.htaccess` ở cùng document root. Bật hiển thị dotfile trong file manager để xác nhận file thực sự được upload.
4. Nếu Hostinger/LiteSpeed không áp dụng `Header`, bật module/tính năng response headers trong hPanel hoặc cấu hình các header tương đương tại CDN. Không dùng Next.js `headers()` làm phương án thay thế cho static export.

## Redirect URL legacy

`.htaccess` chuyển hướng 301 trực tiếp `/about/` sang `/gioi-thieu/`, `/contact/` sang `/lien-he/` và `/distributors/` sang `/nha-phan-phoi/`. Rule được neo toàn bộ path nên không bắt nhầm URL con hoặc tạo loop. Apache giữ query string theo mặc định, ví dụ `/contact/?utm_source=legacy` chuyển một bước đến `/lien-he/?utm_source=legacy`.

Không upload HTML cho ba route legacy và không thêm redirect product/category nếu chưa có mapping được xác minh từ dữ liệu local.

## Decision gate cho kênh liên hệ

Route canonical `/lien-he/` hiện chỉ hiển thị trạng thái chưa kích hoạt và CTA nội bộ; trang không có form, không thu thập hoặc gửi PII. Không thêm lại form, `mailto:` giả, endpoint, provider, API key hay thông báo gửi thành công trước khi đơn vị vận hành phê duyệt đích nhận lead và quy trình dữ liệu.

Muốn kích hoạt contact flow phải có quyết định riêng về backend/provider, server-side validation, chống spam/rate limit, privacy/consent, quản lý secret và kiểm thử success/failure thực tế. Cho đến khi gate đó hoàn tất, artifact production phải giữ trạng thái CTA-only.

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
