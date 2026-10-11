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

## Host chuẩn, nén, cache, 404

`.htaccess` chuyển `www.` → không `www` và `http` → `https` (301), trả `404.html` tiếng Việt cho URL không tồn tại, bật nén gzip và cache: CSS/JS/font trong `/_next/static/` 1 năm (tên file có hash), ảnh 30 ngày, HTML luôn kiểm tra lại. Trên staging chưa có SSL thì comment hai dòng ép HTTPS. Kiểm tra sau upload: `curl -I http://www.<domain>/` phải ra một 301 tới `https://<domain>/`; `curl -I https://<domain>/khong-co/` phải ra 404 với trang tiếng Việt.

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

## Admin Payload (Node.js + PostgreSQL)

> **Từ 2026-10-11 dùng Docker:** làm theo [`DEPLOY-DOCKER.md`](DEPLOY-DOCKER.md) (`docker-compose.yml` ở gốc repo: PostgreSQL + admin + nginx cho website, nút Xuất bản chạy trong container). Phần dưới là ghi chú cũ cho cách chạy Node trực tiếp.

_Thêm 2026-10-11. Chưa triển khai thật; các bước dưới đây dựa trên `admin/Dockerfile`, `admin/docker-compose.yml` và `admin/src/config/environment.ts`._

Admin **không chạy được trên hosting tĩnh/shared** như website public. Cần một máy có Node.js 22 hoặc Docker, PostgreSQL 16, HTTPS (reverse proxy như Caddy hoặc Nginx), và ổ đĩa lưu ảnh tải lên.

### Biến môi trường (bắt buộc khi `NODE_ENV=production`)

| Biến | Ghi chú |
|---|---|
| `DATABASE_URL` | `postgresql://…` |
| `PAYLOAD_SECRET` | ≥ 32 ký tự, sinh ngẫu nhiên, không commit |
| `STORAGE_ADAPTER` | `local` (xem lưu ý S3 bên dưới) |
| `PAYLOAD_PUBLIC_SERVER_URL` | URL HTTPS của admin, ví dụ `https://admin.wokin.vn` |
| `CONTACT_ALLOWED_ORIGINS` | Origin HTTPS của website public, ví dụ `https://wokin.vn` |
| `PAYLOAD_SEPARATION_OF_DUTIES` | `true` (mặc định khuyến nghị) |
| `MEDIA_UPLOAD_DIR` | Thư mục lưu ảnh tải lên; mount volume bền vững |

### Các bước

1. Build image: `docker build -t wokin-admin admin/`.
2. Chạy migration trên DB đích **trước khi** mở admin: `npm run db:migrate` (từ thư mục `admin/` với env đích), rồi `npm run db:status`. Migration `20261011_000001_contact_submissions_locked_documents` là bắt buộc với DB đã chạy `20260920_000001_contact_submissions`.
3. Nạp catalog: `npm run import:catalog` (chạy lại được nhiều lần; lần sau phải báo 0 tạo / 0 cập nhật).
4. Nạp cài đặt hiện tại của website: `npm run site-settings:import -- --force`.
5. Chạy container, đặt sau reverse proxy HTTPS, mở `/admin` và tạo tài khoản đầu tiên. Tài khoản này tự nhận vai trò `owner` khi bảng `admins` còn trống.
6. Build website public với `NEXT_PUBLIC_CONTACT_API_URL=https://<admin>/api/contact-submissions/submit` để form Liên hệ gửi về admin.
7. Sao lưu: `pg_dump` hằng ngày cho DB và sao lưu thư mục `MEDIA_UPLOAD_DIR`; thử khôi phục định kỳ.

### Xuất bản website từ admin (VPS, cùng máy với admin)

_Thêm 2026-10-11._ Admin có trang **Xuất bản website** (`/admin/release-center`). Bấm nút: admin xuất sản phẩm/danh mục/ảnh ở trạng thái *Đã xuất bản* + Thông tin website + Menu, chạy `scripts/publish-website.mjs` trong checkout website (build, `validate:export`), lưu vào `WEBSITE_PUBLISH_DIR/releases/<id>/` rồi đổi symlink `WEBSITE_PUBLISH_DIR/current` (đổi tức thì; lỗi thì website giữ bản cũ). Giữ 3 bản, có nút quay về bản cũ.

Yêu cầu trên VPS:
- Admin chạy bằng Node trực tiếp (không Docker) trong checkout repo, vì nút xuất bản cần mã nguồn website ở thư mục cha `admin/` (hoặc `WEBSITE_DIR`), `npm ci` ở cả thư mục gốc lẫn `admin/`, và `rsync`.
- `admin/.env`: `WEBSITE_PUBLISH_DIR=/var/www/wokin` (thư mục mà user chạy admin ghi được), `WEBSITE_PUBLIC_URL=https://wokin.vn`, `MEDIA_UPLOAD_DIR` trỏ thư mục ảnh bền vững, `CONTACT_ALLOWED_ORIGINS=https://wokin.vn` (bản `www` được tự cho phép).
- nginx: `root /var/www/wokin/current;` cho `wokin.vn` (và redirect `www` → không `www`), `try_files $uri $uri/ $uri.html =404; error_page 404 /404.html;`.
- Lần đầu: chuyển bản website hiện có vào `releases/<YYYYMMDD-HHMMSS>/` và tạo symlink `current` (script từ chối ghi đè thư mục thật tên `current`).
- Build website chỉ nhận biến môi trường tối thiểu (`PATH`, `HOME`, …); không truyền `DATABASE_URL`/`PAYLOAD_SECRET`.

Chuyển dữ liệu admin cũ sang chế độ này (một lần, **sau khi backup DB**): kiểm tra Nhật ký hoạt động xem có ai sửa sản phẩm trên admin chưa (lệnh dưới ghi đè toàn bộ sản phẩm), rồi `npm run import:catalog -- --published` trong `admin/`. Kết quả: 1.357 SP *Đã xuất bản* với ngày gốc, 30 danh mục *active*, ảnh catalog *Đã xác nhận*, sửa 837 SP có thông số giả từ lần nạp cũ.

Quy trình cập nhật code về sau: `git pull` → `npm ci` (gốc và `admin/`) → `npm run db:migrate` → build/khởi động lại admin → bấm **Xuất bản website**.

### Sửa Thông tin website / Menu rồi áp dụng ra website

Trên VPS có nút Xuất bản: chỉ cần sửa trong admin rồi bấm **Xuất bản website**. Cách cũ (không có nút): `npm run site-settings:export` trong checkout có website, chạy gate, build và deploy website tĩnh.

### Lưu ý đã biết (chưa xử lý)

- **Ảnh catalog trong container:** Docker build dùng ngữ cảnh `admin/`, nên image không chứa `public/images` của website. Endpoint `/api/media/preview/:id` đọc ảnh catalog từ thư mục `public` của repo, nên khi chạy bằng Docker cần mount thư mục này vào hoặc sửa endpoint. Chưa kiểm chứng trong container.
- **S3:** `STORAGE_ADAPTER=s3` qua được bước kiểm tra env, nhưng `payload.config.ts` chưa gắn plugin lưu trữ S3, nên ảnh vẫn lưu ở `MEDIA_UPLOAD_DIR`.
- Chưa có email adapter: tính năng quên mật khẩu chỉ in email ra log.
- `admin/Dockerfile` cũ đã bỏ; image mới là `Dockerfile` ở gốc repo (xem `DEPLOY-DOCKER.md`).
