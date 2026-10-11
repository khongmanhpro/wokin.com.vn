Bạn là Claude đang chạy trên VPS của tôi (wokin.vn). Hãy giúp tôi cài website WOKIN bằng Docker từ GitHub, **an toàn, không làm sập website đang chạy**. Tôi không rành kỹ thuật: báo cáo bằng tiếng Việt đơn giản (đã làm gì / còn gì / tôi cần làm gì).

## Bối cảnh
- Repo: https://github.com/khongmanhpro/wokin.com.vn
- Nếu PR #9 đã merge thì dùng nhánh `main`, chưa merge thì dùng nhánh `fix/admin-qa` (kiểm tra bằng `git ls-remote` hoặc trang GitHub).
- Hướng dẫn chính thức nằm trong repo: `DEPLOY-DOCKER.md`. Đọc nó trước, làm đúng theo nó; prompt này chỉ bổ sung quy tắc an toàn.
- Stack: `docker-compose.yml` gồm `db` (PostgreSQL), `admin` (trang quản trị Payload, có nút "Xuất bản website", cổng 127.0.0.1:47310) và `web` (nginx phục vụ website tĩnh, cổng 127.0.0.1:47311). nginx trên máy VPS giữ HTTPS và chuyển tiếp vào 2 cổng đó (mẫu: `deploy/docker/host-nginx.example.conf`).
- Hiện tại VPS đang chạy **bản cũ**: `wokin.vn` do nginx trên VPS phục vụ, `admin.wokin.vn` (qua Cloudflare) là admin Payload cũ.

## Quy tắc bắt buộc
1. **Hỏi tôi trước** mọi việc khó hoàn tác: dừng/xoá dịch vụ cũ, sửa hoặc tắt cấu hình nginx đang chạy, xoá file/thư mục/volume/database, khôi phục database, tạo swap, mở cổng firewall.
2. **Sao lưu trước khi đổi**: toàn bộ `/etc/nginx` (tar), database của admin cũ (`pg_dump -Fc`), thư mục website cũ và thư mục ảnh tải lên của admin cũ. Ghi rõ đường dẫn bản sao lưu.
3. Không in mật khẩu/secret ra màn hình hay vào báo cáo. Tạo secret bằng `openssl rand -hex 32` và ghi thẳng vào `/srv/wokin/.env` (quyền 600). Không commit `.env`.
4. Không chuyển nginx sang hệ thống mới khi chưa kiểm tra container chạy đúng bằng `curl` trên `127.0.0.1`.
5. Giữ đường quay lui: cấu hình nginx cũ phải còn nguyên để bật lại trong 1 phút nếu có sự cố.

## Các bước
1. **Khảo sát (chỉ đọc, chưa đổi gì)** rồi báo tôi:
   - Hệ điều hành, RAM, swap, ổ trống (`free -h`, `df -h`). Cần ≥ 2 GB RAM + 2 GB swap (khuyến nghị 4 GB) và ≥ 15 GB trống. Nếu thiếu swap thì đề xuất tạo, chờ tôi đồng ý.
   - Docker và `docker compose` đã có chưa (`docker compose version`). Chưa có thì đề xuất cài theo docs.docker.com cho đúng hệ điều hành, chờ tôi đồng ý.
   - nginx đang phục vụ `wokin.vn`, `www.wokin.vn`, `admin.wokin.vn` bằng file cấu hình nào, chứng chỉ SSL ở đâu (`nginx -T`).
   - Admin cũ đang chạy bằng gì (docker / pm2 / systemd), ở thư mục nào, database ở đâu (đọc biến `DATABASE_URL` nhưng không in mật khẩu), thư mục ảnh tải lên ở đâu.
   - Cổng 47310 và 47311 có đang bị dùng không (`ss -ltnp`). Nếu bị dùng thì chọn cổng trống khác và đặt `ADMIN_PORT` / `WEB_PORT` trong `.env`.
   - Trong admin cũ đã có tài khoản, yêu cầu liên hệ, hoặc chỉnh sửa sản phẩm nào chưa (đếm bằng `psql`, không in dữ liệu cá nhân).
   Sau đó hỏi tôi chọn **A** (bắt đầu dữ liệu mới) hay **B** (chuyển dữ liệu admin cũ) theo mục 3 của `DEPLOY-DOCKER.md`, kèm khuyến nghị của bạn.
2. **Sao lưu** như quy tắc 2.
3. **Cài**: `git clone` vào `/srv/wokin` (đúng nhánh ở trên), tạo `.env` từ `.env.docker.example` (`SITE_URL=https://wokin.vn`, `ADMIN_URL=https://admin.wokin.vn`, 2 secret mới, cổng đã chọn), rồi `docker compose up -d --build`. Đợi cả 3 container chạy; xem `docker compose logs admin` có "Environment validation passed" và "Ready".
4. **Dữ liệu** theo lựa chọn A hoặc B (đúng lệnh trong `DEPLOY-DOCKER.md`). Với B: sau khi khôi phục, hỏi tôi trước khi chạy `import:catalog -- --published` vì lệnh này ghi đè chỉnh sửa sản phẩm.
5. **Kiểm tra nội bộ**: `curl -I http://127.0.0.1:<ADMIN_PORT>/admin/login` phải 200. Website (`<WEB_PORT>`) trả 404 cho tới lần xuất bản đầu, là bình thường.
6. **Chuyển admin trước** (hỏi tôi trước): cho `admin.wokin.vn` trỏ vào container admin theo mẫu `deploy/docker/host-nginx.example.conf`, dùng lại chứng chỉ đang có, `nginx -t` rồi `systemctl reload nginx`. Nếu `admin.wokin.vn` đi qua Cloudflare thì nhắc tôi kiểm tra SSL mode là "Full (strict)". Báo tôi vào `https://admin.wokin.vn/admin`: với lựa chọn A thì tạo tài khoản đầu tiên, rồi vào **Xuất bản website** và bấm nút.
7. Khi tôi báo đã bấm Xuất bản: kiểm tra `docker compose exec admin ls /srv/site` có `current`, và `curl http://127.0.0.1:<WEB_PORT>/` trả 200, `/san-pham/`, `/danh-muc/bao-ho-lao-dong/` trả 200, `/khong-co/` trả 404.
8. **Chuyển website** (hỏi tôi trước): cho `wokin.vn` trỏ vào container web, `www.wokin.vn` chuyển 301 về `https://wokin.vn`. `nginx -t`, reload, rồi kiểm tra `curl -I https://wokin.vn/` và `https://www.wokin.vn/` từ chính VPS.
9. Đề xuất (chờ tôi đồng ý) lịch sao lưu hằng ngày bằng cron theo mục 7 của `DEPLOY-DOCKER.md`, giữ 14 bản gần nhất.
10. Chỉ khi tôi xác nhận mọi thứ ổn mới đề xuất dừng admin cũ (không xoá dữ liệu cũ).

## Báo cáo cuối
Bằng tiếng Việt đơn giản: đã làm gì, bản sao lưu ở đâu, cổng nào đang dùng, cách quay lại bản cũ nếu có sự cố, và tôi cần làm gì tiếp. Nếu bước nào lỗi: dừng lại, giữ nguyên hệ thống cũ, gửi tôi 30 dòng log liên quan (đã che mật khẩu).
