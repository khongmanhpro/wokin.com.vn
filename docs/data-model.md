# Mô hình dữ liệu catalog WOKIN

Tài liệu này mô tả implementation Phase 6 hiện tại. Đây không phải đặc tả cho một database hoặc CMS chưa tồn tại.

## Quyền sở hữu dữ liệu

- `data/` là source of truth được chỉnh tay và review.
- `src/data/` là artifact generated; các file catalog được sinh bởi `npm run build:data`, còn `image-metadata.generated.json` được sinh bởi `npm run build:images`. Không chỉnh tay bất kỳ file nào trong thư mục này.
- `npm run check:data` chạy cùng pipeline ở chế độ kiểm tra, dựng lại nội dung mong đợi trong bộ nhớ rồi so sánh byte-for-byte với `src/data/`. Lệnh thất bại khi file generated bị thiếu, cũ, bị sửa tay, hoặc khi duplicate generated cũ còn tồn tại.
- Runtime hiện đọc snapshot tĩnh trong `src/data/`; dự án chưa có runtime database hoặc CMS. PostgreSQL chỉ là hướng migration tương lai, không thuộc Phase 6.

Schema hiện tại có `schemaVersion: 1`, được khóa đồng thời trong `data/catalog-baseline.json`, `scripts/build-catalog-data.mjs` và `src/lib/catalog-schema.ts`.

## Inventory pipeline

### Input canonical trong `data/`

Pipeline chỉ hash và tiêu thụ bảy file sau:

| File | Vai trò |
| --- | --- |
| `catalog-baseline.json` | Phiên bản schema, số lượng kỳ vọng, checksum canonical slug và allowlist SKU/product code. |
| `categories.json` | Category gốc, quan hệ cha-con và count. |
| `image_manifest.json` | Mapping legacy product slug sang các đường dẫn ảnh local. |
| `product_dates.json` | Ngày xuất bản theo legacy product ID và legacy slug. |
| `products.json` | Product archive gốc, gồm tên/slug/SKU, category, mô tả, spec HTML và attributes. |
| `products_vi.json` | Bản dịch tiếng Việt và canonical product slug theo legacy product ID. |
| `vi-glossary.json` | Tên category, nhãn UI và từ điển dùng khi normalize spec. |

Các file archive/hỗ trợ khác có thể cùng tồn tại trong `data/`, nhưng không phải input của `build:data` nếu không có trong danh sách trên. Các file ảnh dưới `public/` là dependency kiểm tra: mỗi đường dẫn manifest phải an toàn, là đường dẫn tương đối và tồn tại. Nội dung binary của ảnh hiện không nằm trong checksum pipeline.

### Output generated trong `src/data/`

| File | Nội dung |
| --- | --- |
| `catalog.generated.json` | Snapshot normalized dùng bởi catalog runtime. |
| `categories.json` | Bản generated ổn định của category input, dùng bởi UI. |
| `products_vi.json` | Bản generated ổn định của translation input, phục vụ compatibility output và các tooling cần bản dịch gọn. |
| `vi-glossary.json` | Glossary generated; trường `_comment` của raw input bị loại. |
| `README.md` | Cảnh báo không chỉnh tay, schema version và output checksum hiện hành. |
| `catalog-data.checksums.json` | Inventory checksum nguồn/output, counts và schema version. |
| `image-metadata.generated.json` | Map server-only tối giản từ URL ảnh nguồn tới `[width, height, sourceSha256]`; pipeline responsive image dùng dữ liệu này để tạo đúng `srcset` mà không đưa manifest toàn catalog vào client. |

Pipeline chủ động xóa và `check:data` chủ động từ chối các duplicate generated cũ: `src/data/products.json`, `src/data/product_dates.json` và `src/data/image_manifest.json`.

`image-metadata.generated.json` thuộc pipeline ảnh độc lập và không nằm trong `catalog-data.checksums.json`. `npm run build` luôn chạy `prebuild` → `build:images`, nên clean checkout sẽ tái tạo metadata cùng các WebP trước khi Next.js static export đọc chúng.

## Snapshot normalized

`catalog.generated.json` có các trường root:

- `schemaVersion`: hiện là `1`.
- `sourceChecksum`: SHA-256 tổng hợp từ bảy input canonical.
- `canonicalSlugSha256`: checksum của các cặp `legacySourceId|canonicalSlug`, sắp theo ID.
- `categories`: category normalized.
- `products`: product normalized.

Category normalized gồm `internalId`, `legacySourceId`, `sourceName`, `slug`, `count`, `parentInternalId` và `translation` tiếng Việt.

Product normalized gồm:

| Trường | Contract hiện tại |
| --- | --- |
| `internalId` | ID nội bộ ổn định dạng `product:<legacySourceId>`; category dùng `category:<legacySourceId>`. |
| `legacySourceId` | ID số của record nguồn; unique trong từng loại record. |
| `legacySlug` | Slug sản phẩm legacy từ `products.json`; không phải canonical route tiếng Việt. |
| `productCode` | SKU đã trim; `null` khi SKU nguồn trống. SKU không được dùng làm identity hoặc route key. |
| `translation` | `{ locale: "vi", name, sourceName, canonicalSlug }`; `canonicalSlug` là slug route sản phẩm. |
| `categoryRelations` | Danh sách relation chứa internal category ID, legacy category ID, source name và category slug; mọi relation phải trỏ tới category tồn tại. |
| `media` | Ảnh local có `kind`, `path`, alt tiếng Việt và `position`; phải có ít nhất một ảnh. |
| `packaging` | Bảng đóng gói normalized dạng `string[][]`. |
| `technicalSpecs` | Các dòng spec đã parse/dịch dạng `string[]`. |
| `attributes` | Mảng `{ legacySourceId, name, values }`; legacy attribute ID có thể là `null`. |
| `publishedAt` | Chuỗi ngày lấy từ `product_dates.json`. |

Snapshot còn giữ `sourceType` và `legacyDescription` vì runtime adapter hiện tại cần bảo toàn contract catalog cũ.

## Identity, SKU và canonical slug

- Product identity là `internalId`/`legacySourceId`; canonical route dùng `translation.canonicalSlug`. SKU (`productCode`) không unique tuyệt đối.
- Baseline hiện cho phép đúng 5 product thiếu SKU, với legacy IDs `8998`, `9002`, `9005`, `9007`, `9493`.
- Duplicate SKU chỉ hợp lệ khi code và toàn bộ tập legacy IDs khớp allowlist trong `catalog-baseline.json`. Baseline hiện có `789501` → `5784, 6263`; `789506` → `5785, 6264`; `789511` → `5786, 6265`. Duplicate mới, tập ID bị drift hoặc allowlist đã stale đều làm build thất bại.
- Canonical product slug không được đổi khi chưa có mapping được review. Pipeline hash toàn bộ cặp `id|slug_vi` và so với `expected.canonicalSlugSha256`; thay đổi không có baseline review làm `build:data`/`check:data` thất bại.

## Spec parser và chống mất dữ liệu

`short_description` không được chuyển thẳng sang runtime. Builder parse text/spec vào `technicalSpecs.lines` và table vào `packaging.table`, decode HTML entities, bỏ nội dung của `script`, `style`, `iframe`, rồi áp dụng glossary tiếng Việt.

Parser fail có context legacy product ID khi gặp HTML comment/tag không đóng, blocked element không đóng hoặc table không cân bằng. Builder cũng fail khi:

- nguồn spec không rỗng nhưng không tạo được dòng spec hay bảng có cấu trúc;
- HTML nguồn có table nhưng parser không tạo được row;
- bảng chứa row rỗng.

Vì vậy malformed source hoặc non-empty source bị drop luôn được report; pipeline không silently drop spec.

## Source-domain boundary

Raw archive trong `data/` có thể chứa source-domain hoặc metadata liên hệ lịch sử. Boundary bắt buộc nằm ở generated runtime snapshot: `catalog.generated.json` không được chứa `wokintools.com` (có hoặc không có `www`) hoặc địa chỉ email. Builder kiểm tra trước khi ghi, và `assertCatalogSnapshot` kiểm tra lại khi runtime module nạp snapshot.

Các generated support file chỉ được tạo từ input đã định nghĩa; riêng glossary bỏ `_comment`. Không đưa raw product archive, raw date file hay raw image manifest vào `src/data/`.

## Checksum và determinism contract

Builder serialize JSON bằng canonical formatting: object keys được sắp xếp đệ quy, array giữ nguyên thứ tự, indent hai spaces và kết thúc bằng newline. Với cùng input bytes, cùng tree ảnh local hợp lệ và cùng implementation, `npm run build:data` phải tạo output byte-for-byte giống nhau.

Checksum được tính như sau:

1. Mỗi trong bảy source file có SHA-256 trên raw bytes.
2. `sourceChecksum` là SHA-256 của chuỗi tên file + NUL + checksum file, theo thứ tự `SOURCE_FILES` cố định.
3. Bốn payload chính (`catalog.generated.json`, `categories.json`, `products_vi.json`, `vi-glossary.json`) được hash; `outputChecksum` là SHA-256 tổng hợp theo tên file đã sort.
4. `README.md` nhúng `outputChecksum`.
5. `catalog-data.checksums.json` ghi counts, checksum từng source file, checksum của năm generated file trước manifest checksum (bốn payload + `README.md`), `sourceChecksum`, `outputChecksum` và schema version.

`npm run check:data` không chỉ tin checksum manifest: nó tái tạo toàn bộ sáu output mong đợi rồi so sánh nội dung thực tế. Thay đổi canonical input phải đi theo quy trình: chỉnh `data/` → chạy `npm run build:data` → review diff generated → chạy `npm run check:data` và các quality gates.

## Migration hiện tại — Payload/PostgreSQL R3

R3 đã tạo admin runtime riêng dưới `admin/`, dùng Payload `3.88.0` + PostgreSQL adapter và migration versioned. Public site vẫn giữ Next.js static export, không truy cập database lúc runtime.

Input migration chỉ gồm các artifact đã validate:

- `src/data/catalog.generated.json`
- `src/data/image-metadata.generated.json`
- `src/data/search-index.json`
- `data/products_vi.json`
- `public/images/products/`

Kết quả import đã xác minh trên PostgreSQL 16.6 tạm thời:

| Record | Count |
| --- | ---: |
| Products | 1.357 |
| Categories | 30 |
| Unique media records | 1.717 |
| Product-media references | 1.720 |
| Duplicate SKU groups | 3 |
| Dropped products/categories/references | 0 |

Importer dùng `legacySourceId` cho product/category identity, `storageKey` cho media identity, giữ SKU nullable/non-unique, tạo record ở trạng thái `draft`, và đặt `rightsStatus=pending`. Dry-run không ghi database; lần import thứ hai cho kết quả `0 create / 0 update / 1.357 products + 30 categories + 1.717 media unchanged`.

Các collection nền `Pages`, `Redirects`, `CatalogSnapshots`, `Releases` và `AuditEvents` đã được đăng ký ở mức data model tối thiểu. Phân quyền nâng cao, editorial workflow, storage production, snapshot publishing và release pipeline thuộc các phase sau; không được hiểu là đã production-ready.
