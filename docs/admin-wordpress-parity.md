# Admin WOKIN: tính năng kiểu WordPress trên Payload

_2026-10-11, Claude. Nhánh `feat/admin-wordpress-parity`, tách từ `92c6f93` (`payload-r1`)._

## Quyết định

Người dùng quen admin WordPress (workmanjsc.vn). Đã thử dựng giao diện riêng bằng next-shadcn-dashboard-starter, nhưng code tay từng màn hình thì thiếu nhiều tính năng và tốn công. Hướng được chọn: **dùng admin tự sinh của Payload (`/admin`) làm giao diện chính**, bật các tính năng có sẵn và làm đẹp. Giao diện shadcn đã gỡ khỏi nhánh. `/` chuyển hướng về `/admin`.

## Tương đương WordPress

| WordPress | Trong admin |
|---|---|
| Revisions | `versions`: Sản phẩm 30, Danh mục 20, Trang 50, các global 20. Tab "Danh sách phiên bản" để so sánh và khôi phục |
| Lưu nháp, tự lưu, Xuất bản | Trang: `drafts.autosave` mỗi 60 giây. Sản phẩm giữ quy trình duyệt riêng (không bật drafts của Payload) |
| Thùng rác | `trash: true` cho Sản phẩm, Danh mục, Trang, Media |
| Thư viện media | `folders: true`, cột ảnh thu nhỏ (`MediaThumbnailCell`) cho Media và Sản phẩm |
| Gutenberg | `@payloadcms/richtext-lexical` (cùng phiên bản Payload, hiện 3.90.2) cho thân Trang |
| Customizer / Menu | Global `site-settings` (công ty, liên hệ, mạng xã hội, SEO mặc định) và `navigation` (menu đầu trang 2 cấp, chân trang) |
| Thêm sản phẩm mới | Hook `assignManualProductIdentity`: tự cấp `legacySourceId` từ 900000, `sourceMetadata.sourceType = 'manual'`; form tạo mới ẩn các trường nguồn gốc |
| Bảng tin | Lời chào, số liệu, thao tác nhanh theo quyền, liên hệ cần xử lý, hoạt động gần đây |
| Menu quản trị | `WokinNav` gọn hơn, thêm nhóm Nội dung, Khách hàng, Cài đặt; nút chính màu cam |

## Đưa Cài đặt/Menu ra website public

Website là static export, nên đọc file đã commit `src/data/site-settings.json` (nằm trên `main`, PR riêng) lúc build. File được kiểm tra cấu trúc khi build; chỉ chấp nhận đường dẫn bắt đầu bằng `/` hoặc URL http(s).

```bash
cd admin
npm run site-settings:import -- --force   # chỉ lần đầu: nạp giá trị hiện tại từ ../src/data/site-settings.json
npm run site-settings:export              # sau khi sửa trong admin: ghi lại ../src/data/site-settings.json
```

Lệnh export từ chối ghi nếu thiếu thông tin bắt buộc hoặc có link không an toàn. Sau khi export phải chạy gate và build website public, rồi commit file JSON. Lệnh cần chạy từ checkout có website public mới nhất, tức `main` sau khi gộp.

## Migration

- `20261011_000001_contact_submissions_locked_documents`: sửa lỗi có sẵn. Migration 20260920 thiếu cột `payload_locked_documents_rels.contact_submissions_id`, khiến mọi thao tác update lỗi SQL. **Bắt buộc chạy ở mọi DB đã chạy migration 20260920.**
- `20261011_081958_wordpress_parity`: versions, trash, folders, globals, cấu trúc mới của `pages`.
  - Ghép tay từ diff Payload sinh ra, vì bản sinh tự động chạy lại các migration viết tay và sai thứ tự ở `pages`.
  - Dừng nếu bảng `pages` đã có dữ liệu.
  - Đã chạy up, down, up trên DB dev; `migrate:create` sau đó báo "No schema changes".
- `20261011_085955_payload_3_90_auth_reset_throttle`: thêm cột `admins.reset_password_requested_at` mà Payload 3.90 cần để giới hạn yêu cầu quên mật khẩu.
  - Từ bản này, `migrate:create` còn sinh `DROP NOT NULL` cho các cột nguồn của `products`/`_products_v` (do `admin.condition` thêm ở nhánh này; drizzle bỏ NOT NULL cho trường có điều kiện hiển thị). Cố ý không đưa vào: DB giữ NOT NULL, hook `assignManualProductIdentity` luôn điền giá trị. Cần quyết định riêng.

## Chạy local

```bash
cd admin
docker compose -p wokin-admin-dev up -d     # Postgres 16 tại 127.0.0.1:54329; POSTGRES_PASSWORD lấy từ admin/.env
npm run db:migrate
PAYLOAD_PUBLIC_SERVER_URL=https://localhost:3020 npm run import:catalog   # script import ép NODE_ENV=production
npm run dev -- -p 3020                      # http://localhost:3020/admin
```

`admin/.env` (gitignore) cần `POSTGRES_PASSWORD`, `DATABASE_URL`, `PAYLOAD_SECRET` (≥ 32 ký tự), `STORAGE_ADAPTER=local`, `PAYLOAD_PUBLIC_SERVER_URL`.

## Kiểm chứng

- `tsc` sạch. Điều kiện: có `admin/.hermes/evidence` untracked, xem lỗi có sẵn.
- `npm test` 133/135. Hai test fail không do nhánh này:
  - Test environment validation chỉ fail khi có `.env` local.
  - Test `public builder accepts a v2 release` lỗi ở `scripts/build-catalog-data.mjs` của commit gốc.
- `npm run build` PASS.
- Browser với catalog thật (1.357 sản phẩm):
  - Bảng tin và menu mới hiển thị đúng.
  - Tạo và xuất bản trang (Lexical, tự lưu, có phiên bản).
  - Danh sách sản phẩm có ảnh thu nhỏ và tab Rác.
  - Tạo sản phẩm tay (mã 900000), chuyển vào thùng rác.
  - Lưu "Thông tin website".
- Đi một vòng site settings (file → admin → file) cho kết quả giống hệt bản gốc.

## Lỗi có sẵn, rủi ro, việc còn lại

- `admin/tests/p0-5-pilot-subset.test.ts` import file untracked `admin/.hermes/evidence/p0-5/pilot-subset.ts`, nên checkout sạch sẽ fail typecheck và build.
- Đã vá lỗ hổng: Payload 3.90.2, Next 16.3.8, sharp 0.35.5, override `undici` 7.29.1 và `chokidar` 4.0.3 (trong `sass`). `npm audit` còn 5 moderate (esbuild cũ trong `drizzle-kit`, chưa có bản vá).
- Sản phẩm import nằm trong thùng rác sẽ làm lần import catalog sau lỗi trùng `legacySourceId`: phải khôi phục hoặc xoá hẳn trước.
- Sản phẩm đã import chưa có lịch sử phiên bản; lịch sử bắt đầu từ lần lưu đầu tiên.
- Chưa dùng plugin SEO hay form-builder của Payload (đã có SEO và form liên hệ tự làm).
