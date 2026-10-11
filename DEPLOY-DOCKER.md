# Triển khai WOKIN trên VPS bằng Docker

Một lệnh chạy cả 3 phần:

| Container | Việc | Cổng trên VPS |
|---|---|---|
| `db` | Cơ sở dữ liệu PostgreSQL | không mở ra ngoài |
| `admin` | Trang quản trị `admin.wokin.vn` + nút **Xuất bản website** | `127.0.0.1:3000` |
| `web` | Website `wokin.vn` (nginx, file tĩnh do nút Xuất bản tạo) | `127.0.0.1:8080` |

nginx sẵn có trên VPS giữ HTTPS và chuyển tiếp vào 2 cổng trên.

## 0. Yêu cầu

- Docker Engine 24+ có `docker compose` (kiểm tra: `docker compose version`).
- RAM: tối thiểu 2 GB (kèm swap 2 GB), khuyến nghị 4 GB. Lúc bấm Xuất bản cần thêm khoảng 1,5–2 GB trong vài phút.
- Ổ cứng trống: 15 GB (image ~2–3 GB, dữ liệu, 3 bản website, bản sao lưu).
- Tên miền `wokin.vn`, `www.wokin.vn`, `admin.wokin.vn` trỏ về VPS (hoặc qua Cloudflare).

## 1. Lấy mã nguồn và đặt mật khẩu

```bash
git clone https://github.com/khongmanhpro/wokin.com.vn.git /srv/wokin
cd /srv/wokin
cp .env.docker.example .env
openssl rand -hex 32   # chạy 2 lần, dán vào POSTGRES_PASSWORD và PAYLOAD_SECRET trong .env
nano .env
```

Không đưa file `.env` lên GitHub (đã có trong `.gitignore`).

## 2. Khởi động

```bash
docker compose up -d --build
docker compose ps          # cả 3 container phải ở trạng thái running/healthy
docker compose logs -f admin   # đợi dòng "Ready", Ctrl+C để thoát
```

Lần build đầu mất 5–15 phút. Container `admin` tự chạy migration cơ sở dữ liệu mỗi lần khởi động.

## 3. Dữ liệu ban đầu (chọn A hoặc B)

**A. Cơ sở dữ liệu mới** (chưa từng nhập gì quan trọng vào admin cũ):

```bash
docker compose exec admin sh -c "cd /app/admin && npm run import:catalog -- --published && npm run site-settings:import -- --force"
```

Nạp 1.357 sản phẩm ở trạng thái *Đã xuất bản* (giữ ngày gốc), 30 danh mục, 1.717 ảnh, cùng thông tin công ty và menu hiện tại. Sau đó mở `https://admin.wokin.vn/admin` và tạo tài khoản đầu tiên (tự nhận quyền chủ sở hữu).

**B. Chuyển từ admin cũ đang chạy** (giữ tài khoản, yêu cầu liên hệ…):

```bash
# Trên máy chạy admin cũ: sao lưu
pg_dump -Fc -U <user> -d <db> > admin-cu.dump
# Đưa vào container mới
docker compose exec -T db pg_restore -U wokin_payload -d wokin_payload --clean --if-exists --no-owner < admin-cu.dump
docker compose restart admin          # chạy migration mới
# Ảnh đã tải lên ở admin cũ (thư mục media/uploads của admin cũ):
docker compose cp ./media-cu/. admin:/data/media/
```

Rồi kiểm tra **Nhật ký hoạt động** trong admin: nếu chưa ai sửa sản phẩm thì chạy lệnh nạp ở mục A (chỉ phần `import:catalog -- --published`) để sửa 837 sản phẩm có thông số sai từ lần nạp cũ. Lệnh này **ghi đè** mọi chỉnh sửa sản phẩm trong admin.

## 4. nginx trên VPS

Mẫu cấu hình: `deploy/docker/host-nginx.example.conf`.

```bash
sudo cp deploy/docker/host-nginx.example.conf /etc/nginx/sites-available/wokin
sudo nano /etc/nginx/sites-available/wokin   # sửa đường dẫn chứng chỉ nếu khác
sudo ln -sf /etc/nginx/sites-available/wokin /etc/nginx/sites-enabled/wokin
sudo nginx -t && sudo systemctl reload nginx
```

Nếu đang có cấu hình nginx cũ cho `wokin.vn`/`admin.wokin.vn` thì tắt cấu hình cũ trước (tránh trùng `server_name`). Nếu dùng Cloudflare cho `admin.wokin.vn`, để chế độ SSL **Full (strict)**.

## 5. Xuất bản website lần đầu

Vào `https://admin.wokin.vn/admin` → **Xuất bản website** → bấm nút. Lần đầu mất vài phút (tạo ảnh cho điện thoại). Xong thì mở `https://wokin.vn`.

Trước lần xuất bản đầu tiên, `wokin.vn` trả 404 vì chưa có bản nào.

## 6. Cập nhật phiên bản mới

```bash
cd /srv/wokin
git pull
docker compose up -d --build
```

Sau đó vào admin bấm **Xuất bản website** để website dùng mã mới.

## 7. Sao lưu (nên đặt lịch hằng ngày)

```bash
cd /srv/wokin
docker compose exec -T db pg_dump -U wokin_payload -Fc wokin_payload > backup-db-$(date +%F).dump
docker run --rm -v wokin_media:/m -v "$PWD":/b alpine tar czf /b/backup-media-$(date +%F).tgz -C /m .
```

Khôi phục cơ sở dữ liệu: lệnh `pg_restore` ở mục 3B.

## 8. Khi có sự cố

- Xem log: `docker compose logs --tail=200 admin` (hoặc `web`, `db`).
- Website lỗi sau khi xuất bản: vào admin → Xuất bản website → **Quay về bản này** ở bản trước.
- Khởi động lại: `docker compose restart admin`.
- Lệnh trong admin: `docker compose exec admin sh -c "cd /app/admin && npm run <lệnh>"`.
