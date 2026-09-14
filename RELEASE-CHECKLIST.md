# Release checklist — WOKIN static Hostinger

Checklist này áp dụng cho từng release candidate. Không upload production cho tới khi một người có thẩm quyền ghi nhận quyết định **GO** ở approval gate cuối.

## 1. Preflight và quality gates

- [ ] Xác nhận đúng repository/branch/checkpoint và working tree không có thay đổi ngoài release đã review: `git status --short --branch` và `git log -1 --oneline`.
- [ ] Dùng Node.js 20 trở lên; CI chuẩn hóa trên Node.js 22.
- [ ] Chạy clean install từ lockfile: `npm ci`.
- [ ] Chạy audit policy: `npm audit --audit-level=high`; exit phải bằng 0, tức không có High/Critical. Có thể chạy thêm `npm audit --json` để ghi số đếm vào release record, nhưng không copy raw JSON vào artifact.
- [ ] Chạy lần lượt và ghi exit code: `npm run typecheck`, `npm test`, `npm run validate:data`, `npm run check:data`, `npm run build`, `npm run validate:export`.
- [ ] Xác nhận CI của đúng commit đã pass và tải artifact của đúng SHA; không dùng artifact từ workflow/commit khác.

## 2. Tạo và xác minh artifact

- [ ] Đảm bảo release destination chưa tồn tại, rồi chạy `npm run package:release`. Nếu cần giữ nhiều candidate, dùng `npm run package:release -- --release-dir <thu-muc-moi>` thay vì ghi đè candidate cũ.
- [ ] Xác nhận layout có `release/hostinger/index.html`, `release/hostinger/.htaccess`, `release/SHA256SUMS` và `release/wokin-hostinger.tar.gz`.
- [ ] Từ `release/`, chạy `sha256sum -c SHA256SUMS` (Linux) hoặc `shasum -a 256 -c SHA256SUMS` (macOS); tất cả file phải báo `OK`.
- [ ] Chạy `tar -tzf release/wokin-hostinger.tar.gz`; archive phải chứa `hostinger/`, `hostinger/.htaccess` và `SHA256SUMS`, không có absolute path hoặc `..`.
- [ ] Giải nén archive vào thư mục trống và chạy static server trên thư mục `hostinger/`, ví dụ `python3 -m http.server 4173 --directory <extract-dir>/hostinger`.
- [ ] Qua static server, kiểm tra HTTP 200 cho `/`, `/san-pham/`, `/san-pham-moi/`, `/gp20v/`, một danh mục, một sản phẩm, `/sitemap.xml` và `/robots.txt`; ba route legacy `/about/`, `/contact/`, `/distributors/` phải 404 trong artifact thuần tĩnh vì redirect thuộc Apache.
- [ ] Xác nhận không có `.map`, `.env`/`.env.*`, secret/credential key, raw audit JSON, `node_modules`, `.git`, `.next`, `.cache` hoặc `.npm` trong package/archive.
- [ ] Không chỉnh tay file trong `release/hostinger/` sau khi tạo manifest. Nếu cần thay đổi, tạo candidate mới và chạy lại toàn bộ checksum/gate.

## 3. Backup và upload staging

- [ ] Ghi lại staging hostname, document root, release SHA, artifact SHA-256, người thao tác và thời điểm.
- [ ] Tạo backup có timestamp của document root staging hiện tại, bao gồm `.htaccess`; xác minh backup có thể đọc/giải nén trước khi upload.
- [ ] Upload **nội dung bên trong** `release/hostinger/` vào document root staging. Không upload thư mục bọc `hostinger/`, archive hoặc `SHA256SUMS` vào web root.
- [ ] Bật hiển thị dotfile và xác nhận `.htaccess` có mặt, đúng checksum/nội dung đã review.
- [ ] Xóa file stale trên staging chỉ theo danh sách diff đã review; không xóa mù toàn bộ document root hoặc file ngoài phạm vi site.

## 4. Staging HTTP/header/redirect gate

Thay `https://staging.example.vn` và chunk thực tế trước khi chạy. Lưu status line, `Location` và response headers vào release record.

- [ ] `curl -sS -I https://staging.example.vn/` trả 200.
- [ ] `curl -sS -I https://staging.example.vn/san-pham/` trả 200.
- [ ] `curl -sS -I https://staging.example.vn/_next/static/<chunk-thuc-te>.js` trả 200 và content type phù hợp.
- [ ] Mỗi response có `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` và `Content-Security-Policy`; `Strict-Transport-Security` vẫn vắng mặt cho tới khi HSTS gate riêng được duyệt.
- [ ] `curl -sS -I 'https://staging.example.vn/about/?utm_source=legacy'` trả 301 một bước tới `/gioi-thieu/?utm_source=legacy`.
- [ ] `curl -sS -I 'https://staging.example.vn/contact/?utm_source=legacy'` trả 301 một bước tới `/lien-he/?utm_source=legacy`.
- [ ] `curl -sS -I 'https://staging.example.vn/distributors/?utm_source=legacy'` trả 301 một bước tới `/nha-phan-phoi/?utm_source=legacy`.
- [ ] Ba URL đích canonical trả 200; không có redirect chain/loop.
- [ ] Mở Home, danh mục, sản phẩm, sản phẩm mới và Liên hệ trên desktop/mobile; kiểm tra CSS/JS/ảnh, search/menu, Console/Network, canonical và JSON-LD.

Nếu header hoặc redirect sai, dừng release. Sửa cấu hình staging/CDN hoặc tạo artifact mới, rồi chạy lại toàn bộ mục 4; không bỏ qua gate bằng redirect client-side.

## 5. Approval và production upload

- [ ] Reviewer kỹ thuật xác nhận CI, manifest, extract/static smoke và staging gate đều pass trên đúng artifact SHA.
- [ ] Product/content owner xác nhận nội dung và quyền sử dụng asset cho release này.
- [ ] Release owner ghi quyết định `GO` hoặc `NO-GO`, tên người duyệt, thời điểm và artifact SHA. Không có bản ghi `GO` thì không upload production.
- [ ] Trước production upload, tạo và kiểm tra backup document root production như staging.
- [ ] Upload đúng nội dung `hostinger/`, xác nhận `.htaccess`, rồi lặp lại toàn bộ curl/header/redirect và five-page smoke trên production.

## 6. Rollback

- [ ] Đặt tiêu chí rollback trước release: HTTP 5xx/404 route chính, asset diện rộng hỏng, redirect loop, thiếu security header, CSP làm hỏng chức năng, checksum/upload không khớp hoặc regression nghiêm trọng.
- [ ] Khi kích hoạt rollback, ngừng upload, lưu log/thời điểm/symptom, và khôi phục nguyên bộ document root cùng `.htaccess` từ backup release trước đã xác minh.
- [ ] Purge CDN/cache nếu có, sau đó lặp lại kiểm tra 200, header, redirect và five-page smoke trên phiên bản đã rollback.
- [ ] Ghi nhận rollback owner, nguyên nhân, artifact bị rút và artifact được phục hồi. Không retry production bằng cách chỉnh tay artifact lỗi; tạo candidate mới qua CI/package pipeline.

## Release record

```text
Commit SHA:
CI run URL:
Artifact SHA-256:
Staging hostname:
Backup location:
Technical reviewer:
Content/legal reviewer:
Release owner:
Decision: GO / NO-GO
Decision time:
Rollback result (nếu có):
```
