# Prompt tiếp nhận dự án cho Codex

> Cách dùng: mở Codex tại `/Volumes/data AI/wokin.com.vn` rồi gửi:
> `Đọc và thực hiện đúng docs/prompts/CODEX-CONTINUE.md`
> Prompt dùng lại được nhiều phiên. Phiên mới tự biết tiếp từ đâu nhờ `WORKLOG.md` và `npm run spec:inventory`.
>
> Phiên bản 14 (2026-09-15, Codex tiếp tục C1.3): thêm 508 key mới (3 nhãn + 505 dòng); coverage `3867 translated / 1678 notNeeded / 1855 missing`; **chưa commit**. Các ngoại lệ `3-in-1`, đơn vị kg/lb và ký hiệu dính đã có test hẹp; rà nhóm nguồn mơ hồ còn lại, rồi tiếp tục từ `> Chips: High-quality SMD LED.6500K`.
> Phiên bản 13 (2026-09-14, Codex tiếp tục C1.3): thêm 523 key mới (38 nhãn + 485 dòng), sửa 6 bản dịch; coverage `3356 translated / 1667 notNeeded / 2377 missing`; **chưa commit**. Rà nhóm ngoại lệ nguồn/gate bên dưới, rồi tiếp tục dòng thông thường từ `> 1pc hex key wrench` theo inventory.
> Phiên bản 12 (2026-09-14, Codex tiếp nhận và hoàn tất C1.3.2 + lô tiếp): C1.3.2 đã sửa dấu inch `”` và quy tắc “Bộ N”; thêm 775 key dictionary mới từ `0utside clamp`; **chưa commit**. Phiên mới tiếp tục từ `max.torque` theo inventory.
> Phiên bản 11 (2026-09-14, sau review lần 6 của Claude): lô C1.3 + C1.3.1 **đã commit ở `df991d3`**. Đầu phiên làm **C1.3.2** (2 lỗi nhỏ), sau đó dịch lô tiếp từ `0utside clamp`.
> Phiên bản 10 (2026-09-14, Codex hoàn tất C1.3.1): đã sửa 5 mục review, chạy đủ gate, **chưa commit** để chờ review + commit; không mở batch mới. Coverage hiện `1946 translated / 1589 notNeeded / 3865 missing`, checksum generated `7cd4e91aea89c1166b0f67d85e260a2ec4e6e92b4e2d267cfdf7aa09c854f84f`.
> Phiên bản 9 (2026-09-14, sau review lần 5 của Claude): lô C1.3 (C1.3.0 + 532 mục) **chưa commit** vì còn lỗi nội dung. Làm **C1.3.1** (sửa 5 mục review) rồi dừng để review + commit; chưa dịch lô mới.
> Phiên bản 8 (2026-09-14, sau phiên Codex C1.3): C1.3.0 **đã xong**, 46 ô bảng lai đã dịch, và đã thêm 532 key dictionary; tiếp tục batch nhãn từ `0utside clamp`.
> Phiên bản 7 (2026-09-14, sau review lần 4 của Claude): C1.2b–C1.2d **đã commit ở `f0ebdf4`**. Làm C1.3: đầu phiên sửa 2 lỗi nhỏ (C1.3.0), rồi dịch 46 ô bảng lai trước, sau đó nhãn từ `size`.
> Phiên bản 6 (2026-09-14, Codex đã hoàn tất C1.2d): C1.2b–C1.2d đã sửa và gate pass, vẫn **chưa commit**. Việc kế tiếp là C1.3 dịch review thủ công từ nhãn `size`.
> Phiên bản 5 (2026-09-14, sau review lần 3 của Claude): C1.2c xong nhưng còn 4 lỗi fallback/allowlist. Thêm **C1.2d**, làm **trước** C1.3. C1.2b–C1.2d vẫn **chưa commit**.
> Phiên bản 4 (2026-09-14, Codex đã xử lý C1.2c): C1.2c đã xong nhưng **chưa commit**; C1.3 chưa đạt mục tiêu khối lượng vì lô tự động bị loại sau audit chất lượng.
> Phiên bản 3 (2026-09-14, sau review lần 2 của Claude): C1.2b đã xong nhưng **chưa commit**. Thêm **C1.2c** (sửa 5 lỗi review), làm trước khi dịch tiếp.
> Phiên bản 2: C1.1/C1.2 đã xong và commit ở `a40cff1`; thêm C1.2b và mục tiêu khối lượng mỗi phiên.

---

Bạn là kỹ sư tiếp nhận dự án **WOKIN**: chuyển website WordPress https://www.wokintools.com/ sang Next.js static export cho `wokin.com.vn`, toàn bộ nội dung tiếng Việt. Dự án đã qua nhiều agent (Hermes, Codex, Claude). Không được đoán; mọi kết luận phải dựa trên file và lệnh đã chạy.

Đường dẫn có dấu cách, **luôn quote**: `"/Volumes/data AI/wokin.com.vn"`. Trả lời người dùng bằng tiếng Việt.

## Bước 1 — Nạp ngữ cảnh (bắt buộc, theo thứ tự)

1. `WORKLOG.md`: đọc hết mục 0–5 và 3 entry mới nhất ở mục 6. Đây là nguồn trạng thái chính. **Đọc kỹ mọi entry "Claude — Review …"**: phát hiện trong đó là việc bắt buộc, trừ khi entry sau ghi đã xử lý.
2. `docs/phase-11-acceptance.md` §3: bối cảnh blocker.
3. `AGENTS.md` (quy tắc tiếng Việt, SEO, không crawl), `data/vi-glossary.json` (`terms`, `spec_labels`, `ui`).
4. Code C1 hiện có: `scripts/build-catalog-data.mjs` (`createTranslator`, `numericTokens`, `assertNumericTokens`), `scripts/spec-translation-inventory.mjs`, `scripts/validate-catalog.mjs`, `tests/spec-translation-inventory.test.mjs`, `tests/catalog-data-pipeline.test.mjs`.

Nếu entry mới nhất trong `WORKLOG.md` cho thấy việc dưới đây **đã làm dở**, tiếp tục từ chỗ dở; không làm lại từ đầu, không ghi đè bản dịch đã có trừ khi sửa lỗi rõ ràng.

## Bước 2 — Xác nhận baseline

```bash
cd "/Volumes/data AI/wokin.com.vn"
git status --short --branch
git log --oneline -5
npm test
npm run check:data
npm run spec:inventory
```

Kỳ vọng tại lần bàn giao (v14): nhánh `main`, HEAD `159834c` (nền dữ liệu `df991d3`), working tree có các thay đổi **chưa commit** của C1.3.2 + lô 775 mục + lô 523 mục + lô 508 key; **82 tests PASS**, check:data PASS (checksum `57040312e538c0313e6bbd2330cffdd82b95ae83bd0cdbc6d1e0b0def556e016`), inventory `3867 translated / 1678 notNeeded / 1855 missing`, từ điển 1703 dòng / 1078 nhãn / 74 ô. Việc kế tiếp: rà nhóm nguồn mơ hồ, rồi tiếp tục `> Chips: High-quality SMD LED.6500K`; không làm lại C1.3.2. Untracked được phép: `.claude/`, `reports/`, vài file `.hermes/*.py`, `.hermes/plans/*`.

C1.2b–C1.2d đã commit ở `f0ebdf4`; C1.3.0–C1.3.1 + lô 530 nhãn/46 ô ở `df991d3`. Mọi thay đổi chưa commit mới sinh ra trong phiên của bạn là của bạn; không revert thay đổi của người khác.

- Trong sandbox Codex, 2 test mở cổng localhost (smoke static server) có thể fail `EPERM`. Đây **không phải** regression: ghi "EPERM do sandbox" vào log, **không** sửa hay bỏ test đó. Mọi test khác phải PASS.
- Nếu khác kỳ vọng ngoài điểm trên: **dừng**, báo người dùng khác biệt cụ thể, không tự "sửa cho khớp".

## Quy tắc bất di bất dịch

- **Không** crawl/scrape wokintools.com. Dữ liệu nguồn đã có trong `data/`.
- **Không** reset, checkout phá thay đổi, `git clean`, rebase, force; **không** đụng `.hermes/worktrees/` (nhánh Payload CMS có thay đổi chưa commit).
- **Không** push, deploy, tạo PR. **Chỉ commit khi người dùng cho phép trong phiên**; nếu chưa được phép, để diff chưa commit và ghi rõ trong `WORKLOG.md`.
- **Không** tự quyết các việc chờ người dùng (mục "Ngoài phạm vi").
- **Không** đổi version dependency, không `npm audit fix --force`.
- **Không** bịa thông số kỹ thuật. Không chắc nghĩa thì giữ thuật ngữ gốc trong ngoặc.
- **Không** nới gate để cho qua: không bỏ kiểm tra placeholder, không bỏ kiểm tra số liệu (trừ đúng thay đổi `pc/pcs` ở C1.2b-3, có test).
- Không ghi secret vào file/log.

---

## Việc cần làm: C1 — Dịch thông số kỹ thuật sản phẩm (blocker production)

### Trạng thái (Codex cập nhật 2026-09-15, sau lô tiếp C1.3 thêm 508 key; chưa commit)

| Hạng mục | Trạng thái |
|---|---|
| C1.1 Inventory `npm run spec:inventory [-- --next-batch N]` dùng `parseLegacySpec` chung | ✅ Xong |
| C1.2 Từ điển `data/spec-translations-vi.json` (`lines`, `cells`) tra trước fallback; build fail khi có placeholder hoặc mất token số | ✅ Xong |
| Placeholder "Đặc tính kỹ thuật" trong generated | ✅ 0 |
| C1.2b allowlist `needsTranslation`, `labels`, gate `N pcs`, remainder trên generated | ✅ Xong, commit `f0ebdf4` |
| C1.2c Sửa 5 lỗi review lần 2 | ✅ Xong, commit `f0ebdf4` |
| C1.2d Sửa 4 lỗi review lần 3 (câu lai có dấu, `N chi tiết` tự động, allowlist tiếng Việt/từ mượn, satin) | ✅ Xong, commit `f0ebdf4` (review lần 4: đạt; còn 2 lỗi nhỏ → C1.3.0) |
| C1.3 Coverage | ⏳ **3867 translated / 1678 notNeeded / 1855 missing** (1657 dòng, 2 nhãn, 198 ô); C1.3.0 + C1.3.1 đã commit `df991d3`, C1.3.2 và ba lô 775 + 523 + 508 key đã làm nhưng chưa commit; dictionary 1703 dòng / 1078 nhãn / 74 ô; rà ngoại lệ rồi tiếp tục từ `> Chips: High-quality SMD LED.6500K` |

Hệ quả trạng thái trung gian: dòng chưa dịch vẫn hiển thị **nguyên tiếng Anh**; các câu lai có dấu và `N chi tiết` tự động đã được chặn. Chưa release được vì còn 1855 mục thiếu.

### Phát hiện review lần 1 (✅ đã xử lý ở C1.2b, chỉ để tham khảo)

1. Tốc độ ~141 chuỗi/phiên, cần ~50 phiên → **quá chậm**.
2. 805/1524 ô bảng "thiếu" chỉ là số + đơn vị (`11mm`, `115×22.2mm`), không cần dịch; 94 mục từ điển là bản sao y nguồn.
3. 1317 dòng thiếu có dạng `Nhãn: số liệu` với chỉ **692 nhãn** khác nhau (input power 52, size 35, rated current 28, fuel tank capacity 17, no load speed 16...).
4. Gate số liệu ép giữ `pc/pcs` → câu kém tự nhiên ("Kèm 2pcs bộ pin", "100pcs trong một túi").
5. Regex English remainder bỏ sót `rated`, `noise`, `air`... → báo cáo thấp hơn thực tế.

---

### C1.2b — Tăng tốc và sửa gate (✅ ĐÃ XONG, đặc tả để tham khảo, KHÔNG làm lại)

**1. Chỉ đếm chuỗi thật sự cần dịch**
- Định nghĩa `needsTranslation(source)`: `true` khi còn **ít nhất một từ chữ cái ≥2 ký tự** không nằm trong allowlist không cần dịch.
- Allowlist gồm: đơn vị (`mm cm m km kg g mg l ml v w kw a ah mah hz rpm min bar psi mpa nm lb lbs oz hp db`; `in`/`inch` **chỉ khi đứng ngay sau số**, vì `in` còn là giới từ tiếng Anh), `pc/pcs` sau số, ký hiệu/kích cỡ (`xl xxl s m l`), mã vật liệu/tiêu chuẩn (`CrV Cr-V Cr-Mo S2 SK5 HSS ABS PVC TPR PP TPE CE GS DIN ISO ANSI SAE EN`), thương hiệu/dòng (`WOKIN GP20V`), mã SKU/model dạng chữ+số.
- Allowlist đặt ở **một** module dùng chung cho inventory và báo cáo English remainder. Chuẩn hoá không phân biệt hoa thường.
- Inventory: chuỗi `needsTranslation === false` được tính là `notNeeded`, không nằm trong `missing`. Báo cáo 3 số: `translated`, `notNeeded`, `missing`.
- Xoá các mục từ điển là bản sao y nguồn **và** `needsTranslation === false`. Output generated phải không đổi (chạy `build:data`, diff generated = rỗng cho các mục đó).

**2. Từ điển nhãn cho dòng `Nhãn: giá trị`**
- Thêm mục `labels` vào `data/spec-translations-vi.json` (schema vẫn `schemaVersion: 1`, `labels` optional để tương thích; cập nhật validate + `docs/data-model.md`):
  ```json
  "labels": { "input power": "Công suất đầu vào", "rated current": "Dòng điện định mức" }
  ```
- Áp dụng khi dòng có dạng `[> ]Nhãn: giá trị` **và** `needsTranslation(giá trị) === false`: key = nhãn đã chuẩn hoá (trim, lowercase, gộp khoảng trắng, bỏ dấu `:` cuối); output `> <Nhãn VI>: <giá trị giữ nguyên>`.
- Thứ tự ưu tiên: `lines` (khớp chính xác) → `labels` → fallback cũ.
- Inventory: dòng được phủ bởi `labels` tính là `translated`. `--next-batch` liệt kê **nhãn thiếu trước**, dạng `[label] xN (M SP) input power`, rồi đến dòng tự do, rồi ô bảng.
- Nhãn đã có trong `glossary.spec_labels` vẫn nên đưa vào `labels` để báo cáo coverage chính xác; giữ nhất quán với glossary.

**3. `pc/pcs` tương đương lượng từ tiếng Việt**
- Trong `numericTokens`: token `N pc`/`N pcs` chỉ yêu cầu bản dịch còn **số N**. Không yêu cầu giữ chữ `pc/pcs`.
- Test bắt buộc: `> With 2pcs battery pack` → `> Kèm 2 bộ pin` PASS; `> Kèm bộ pin` FAIL; `> Packing: 100pcs in one bag` → `> Đóng gói: 100 chiếc/túi` PASS.
- Sửa lại các bản dịch hiện có đang chứa `pc/pcs` sang lượng từ tự nhiên (`chiếc`, `cái`, `bộ`, `món`, `chi tiết` đúng ngữ cảnh).

**4. Báo cáo English remainder chính xác**
- Báo cáo dựa trên **output generated** (không phải nguồn): đếm dòng/ô trong `src/data/catalog.generated.json` còn từ Latin ≥3 ký tự ngoài allowlist ở bước 1. Liệt kê top 20 từ tiếng Anh còn sót theo tần suất.
- Vẫn là REPORT (không fail) cho tới khi `missing = 0`.

**Kiểm chứng C1.2b:** `npm test`, `npm run build:data`, `npm run check:data`, `npm run validate:data`, `npm run spec:inventory`. Ghi coverage trước → sau vào WORKLOG (số `missing` phải giảm mạnh nhờ bước 1).

---

### C1.2c — Sửa lỗi review lần 2 (✅ ĐÃ XONG, đặc tả để tham khảo, KHÔNG làm lại)

C1.2b đã xong. Claude review ngày 2026-09-14 (entry "Claude — Review C1.2b + lô nhãn của Codex" trong WORKLOG) phát hiện các lỗi sau:

**1. Còn `pcs` trong bản dịch tiếng Việt**
- Hiện có **19** mục trong `data/spec-translations-vi.json` có target chứa `\d\s?pcs?\b`, vd "1pc cờ lê", "1pc sách hướng dẫn", "Bao gồm 1pc lưỡi cưa", "1pc đầu nối nhanh kiểu Mỹ". Log phiên trước ghi "còn 6 mã PC vật liệu" là **sai**.
- Sửa tất cả sang lượng từ tiếng Việt ("1 cờ lê", "1 cuốn sách hướng dẫn", "Bao gồm 1 lưỡi cưa").
- Thêm test/gate: `build:data` fail khi target trong từ điển (`lines`, `cells`, `labels`) có ký tự tiếng Việt và còn `\d\s?pcs?\b`. Mã vật liệu `PC` (polycarbonate) không đứng sau số nên không bị ảnh hưởng.

**2. Báo cáo English remainder bị lọt từ**
- `generatedEnglishRemainder` hiện gom mọi từ ASCII trong **bất kỳ** bản dịch tiếng Việt nào vào `ignoredWords` → `to`, `an`, `mini`, `satin`, `led`, `con`, `cho`, `pin`, `bar` không bao giờ bị đếm.
- Bỏ cơ chế `collectVietnameseWords`. Chỉ bỏ qua từ trong **allowlist tường minh** của `spec-translation-utils.mjs`, cộng thêm danh sách **từ tiếng Việt không dấu** tường minh, có chú thích (vd `cho`, `con`, `tay`, `ban`, `in` khi là "in ấn"...). Danh sách chỉ thêm khi đã kiểm chứng; tuyệt đối không thêm từ tiếng Anh.
- Test: generated có dòng "Hoàn thiện satin" → `satin` phải được báo; "> Đóng gói: 1 hộp" → không báo.

**3. Token mã che chữ tiếng Anh**
- Luật `/^(?=.*[a-z])(?=.*\d)[a-z\d-]+$/i` coi cả token có gạch nối là mã, nên ô `2Tx3M-Green` bị tính "không cần dịch".
- Sửa: tách token theo `-` rồi xét **từng phần**. Phần có cả chữ và số → mã; phần thuần chữ ≥2 ký tự → phải thuộc allowlist.
- Test: `2Tx3M-Green` → `needsTranslation = true`; `GP20V`, `M14`, `ABC-2`, `40Cr`, `Cr-V` → `false`.
- Chạy lại inventory và ghi số `notNeeded` trước → sau.

**4. Fallback regex tạo câu lai rác (chỉ áp dụng cho dòng spec)**
- Có 451 dòng lai kiểu "These face frame bản lềs provide…", "Extra tủ đựng compartments", "makes máy thổi & vacuum".
- Trong `translateSpecLine`, khi **không** có bản dịch từ `lines`/`labels`: nếu kết quả `translateText(raw)` vẫn `needsTranslation(...) === true`, trả **nguyên văn nguồn** (chỉ chuẩn hoá tiền tố `> `); nếu kết quả đã hoàn toàn tiếng Việt thì giữ kết quả.
- **Không** đổi fallback của ô bảng: header `MÃ KHO`/`KÍCH THƯỚC` phụ thuộc regex và được Phase 11 dùng để nhận diện `<thead>`.
- Test: dòng tiếng Anh chưa dịch → output = nguồn; "> Packing: color box" (regex dịch trọn) → "> Đóng gói: hộp màu"; bảng vẫn có hàng đầu `MÃ KHO`.
- Ghi số dòng lai trong generated trước → sau vào WORKLOG (kỳ vọng giảm mạnh).

**5. Thuật ngữ không nhất quán**
- "satin finish" → "hoàn thiện satin", nhưng "stain finish" (lỗi chính tả nguồn của "satin") → "hoàn thiện mờ".
- Chọn **một** cách dịch cho satin finish, áp dụng cho mọi biến thể, và thêm vào `vi-glossary.json` `terms`. Khi nguồn có lỗi chính tả rõ ràng, dịch theo nghĩa đúng và thống nhất với từ chuẩn.

**Kiểm chứng C1.2c:** `npm test`, `npm run build:data`, `npm run check:data`, `npm run validate:data`, `npm run spec:inventory`, `npm run build`, `npm run validate:export`. Ghi vào WORKLOG, **đánh dấu từng mục 1–5 là đã xử lý**, kèm số liệu trước → sau. English remainder có thể **tăng** sau mục 2–3: đó là số đúng, không phải regression.

---

### C1.2d — Sửa lỗi review lần 3 (✅ ĐÃ XONG, đặc tả để tham khảo, KHÔNG làm lại)

Claude review 2026-09-14 (entry "Claude — Review C1.2c + lô thử C1.3 của Codex" trong WORKLOG). Gate kỹ thuật PASS, nhưng generated còn lỗi chất lượng và gate cuối không thể đạt. **Không dịch lô mới trong bước này.**

**1. Fallback lọt câu lai có dấu**
- `needsTranslation` chỉ xét token toàn ASCII, nên từ bị glossary thay **giữa chừng một từ tiếng Anh** lọt qua. Generated hiện có **59** chuỗi (đuôi `giács`, `hợps`, `khóas`, `víts`, `nhọns`, `tuýps`, `dàis`, `théps`…), vd: "> 2 chi tiết lục giács", "2 chi tiết cờ lês", "> 7 chi tiết SAE cờ lê kết hợps: …", "> 1 chi tiết kìm kẹp khóas 10″ 250mm", "> 6 chi tiết tua víts: …", "> 1 chi tiết φ3hex cờ lê".
- Sửa gốc: trong `translateText`, thay `terms` và `spec_labels` **chỉ khi khớp trọn từ** (biên Unicode, vd `(?<![\p{L}\d])…(?![\p{L}\d])` với cờ `giu`), không thay một phần của từ tiếng Anh dài hơn (`wrenches`, `hexs`, `screwdrivers`).
- Chốt chặn: thêm vào module dùng chung một hàm phát hiện token lai, dùng trong fallback dòng **và** báo cáo remainder: token có chữ tiếng Việt có dấu rồi đuôi ASCII (từ tiếng Việt không bao giờ tận cùng bằng `s`: `/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ][a-z]*s(?![\p{L}\d])/iu`), hoặc ký hiệu dính chữ tiếng Anh (`φ3hex`). Có token lai → fallback trả nguyên văn nguồn.
- Test: tìm chuỗi nguồn thật của các ví dụ trên trong `data/products.json`, đưa vào fixture; output phải là nguồn hoặc tiếng Việt trọn, không có token lai.

**2. Bỏ thay tự động `N pcs → N chi tiết`**
- Generated có **175** chuỗi sinh bởi regex `\b(\d+)\s?pcs?\b → "$1 chi tiết"` (không có trong từ điển), vd "> 1 chi tiết cờ lê", "> Sức chứa hộp đạn: 125 chi tiết". Trái chuẩn dịch (lượng từ phải đúng ngữ cảnh: chiếc/cái/bộ…).
- Xoá thay thế toàn cục này trong `translateText` và trong nhánh `labels` của `translateSpecLine`. Giữ các regex cũ có ngữ cảnh rõ (`With N pcs dust bag → Kèm N túi chứa bụi`).
- Nhánh `labels` **không** áp dụng khi giá trị chứa `\d\s?pcs?` → dòng đó phải có bản dịch `lines` review. Inventory phải tính khớp: dòng này là `missing`, không phải `translated`.
- Fallback dòng: kết quả có chữ tiếng Việt **và** còn `\d\s?pcs?` → trả nguyên văn nguồn. Chuỗi chỉ gồm số + `pcs` (vd `3*1.5(20pcs)`) không cần dịch, giữ nguồn.
- Báo cáo thêm trong `validate:data`: số chuỗi generated có chữ tiếng Việt và còn `\d\s?pcs?` (kỳ vọng 0) và số chuỗi `\d chi tiết` không đến từ từ điển (kỳ vọng 0).
- Test: `> Magazine capacity: 125pcs` với label có sẵn → output nguồn, inventory `missing`; `> 1pc wrench` không có bản dịch review → output nguồn; sửa test hiện tại đang assert `"1 chi tiết cờ lê"` và `"Sức chứa hộp đạn: 125 chi tiết"`.
- Ghi coverage trước → sau (translated có thể **giảm**, đó là số đúng).

**3. Allowlist tiếng Việt không dấu và từ mượn: gate cuối hiện không thể PASS**
- Target **đã review** bị báo là English: `phun`(8), `poly`(5), `xi-lanh`(4), `satin`(3), `phillips`(3), `ram`(3), `ren`(3), `led`(2), `niken`(2), `skin`(2), `sinh`(2), `dao`(2), `acrylic`(2), `khung`(2), `gian`(2), `xy-lanh`(2), `carbon`, `carton`, `molypden`, `crmo`, `lithium-ion`, `quang`, `polyester`, `quay`, `nung`, `phe`, `che`, `cam`, `lon`, `pozidriv`, `npt`, `sau`, `rung`, `bugi`, `khoan`, `rpm`, `leo`, `chia`, `tct`. Hệ quả: (a) dòng glossary dịch đủ có các từ này bị trả về tiếng Anh; (b) khi `missing = 0`, lỗi "English remainder" vẫn bật vì chính target đã review.
- Tách allowlist thành các nhóm tường minh, có chú thích, trong `spec-translation-utils.mjs`:
  - `VIETNAMESE_ASCII_WORDS`: từ tiếng Việt thật không dấu (`phun`, `ren`, `rung`, `khung`, `quay`, `nung`, `sinh`, `gian`, `khoan`, `chia`, `sau`, `quang`, `xi-lanh`, `xy-lanh`, `bugi`, `niken`, `molypden`…). Chỉ bỏ qua trong chuỗi **có chữ tiếng Việt có dấu**. Nhờ vậy từ trùng tiếng Anh (`the`, `in`, `than`, `go`, `may`, `con`, `pin`) không che dòng tiếng Anh thuần.
  - `LOANWORDS`: từ mượn/viết tắt/tên chuẩn giữ nguyên trong tiếng Việt kỹ thuật (`LED`, `USB`, `AC`, `DC`, `NPT`, `Phillips`, `Pozidriv`, `Torx`, `TCT`, `CrMo`, `RPM`, `poly`, `polyester`, `acrylic`, `carbon`, `carton`, `lithium-ion`, `Li-ion`, `satin`…). Áp dụng mọi chuỗi.
  - Mỗi từ mới phải kiểm chứng; **cấm** thêm từ tiếng Anh thông dụng (`with`, `and`, `size`, `max`, `blade`, `cable`, `wheel`…). `ram`, `skin`, `dao`, `leo`, `lon`, `phe`, `che`, `cam`: mở target chứa chúng, xác định là từ Việt/từ mượn thật hay lỗi dịch; lỗi dịch thì sửa target.
- **Gate mới (fail ngay, không chờ `missing = 0`):** mọi target trong `lines`, `labels`, `cells` phải `needsTranslation(target) === false` và không có token lai (mục 1). Target vi phạm → `build:data` fail, liệt kê source.
- Test: `"> Đầu phun: 2mm"`, `"> Đầu ren NPT 1/4″"`, `"> Đèn LED tích hợp"` → không báo; `"> Kích thước with case"` → báo `with`; `"The size"` (không dấu) → báo `the`/`size`.

**4. Thuật ngữ satin (chốt: giữ "hoàn thiện satin")**
- Glossary `satin finish`/`stain finish` → "hoàn thiện satin" hiện vô hiệu: fallback coi `satin` là English nên generated vẫn "> satin finish", "> Stain finish, chrome plated surface"; test hiện tại còn assert điều này.
- `satin` vào `LOANWORDS` (mục 3). Sửa test: `> satin finish` và `> stain finish` → `> hoàn thiện satin` (hoặc viết hoa đầu dòng nhất quán với các dòng review hiện có như "> Hoàn thiện satin"). Dòng dài hơn chứa satin/stain finish vẫn theo luật fallback chung.

**5. Dọn nhỏ**
- Thay assertion `hop` vô nghĩa trong `tests/spec-translation-inventory.test.mjs` bằng các ca ở mục 3.
- Bỏ regex hyphen thừa `/^[a-z]+-\d+$/i` (tập con của regex trước) trong `isAllowedToken`.
- Log phiên trước ghi "dictionary có 276 key", thực tế 519 mục (217 dòng / 274 nhãn / 28 ô). Log sau ghi rõ từng loại.

**Chỉ số audit bắt buộc ghi WORKLOG (trước → sau), đo trên `src/data/catalog.generated.json`:**
- Chuỗi có token lai (mục 1): 59 → 0
- Chuỗi có chữ Việt + `\d\s?pcs?`: → 0; chuỗi `\d chi tiết` không từ từ điển: 175 → 0
- Target từ điển bị báo English: ~40 từ → 0
- Chuỗi có chữ Việt + English ngoài allowlist (dùng regex chữ Việt ở mục 1, **không** dùng dải `[à-ỹ]` vì dải đó chứa cả ký tự Hy Lạp như `φ`)
- Coverage `translated / notNeeded / missing` và English remainder

**Kiểm chứng C1.2d:** `npm test`, `npm run build:data`, `npm run check:data`, `npm run validate:data`, `npm run spec:inventory`, `npm run build`, `npm run validate:export`, `git diff --check`. Đánh dấu từng mục 1–5 đã xử lý trong WORKLOG.

---

### C1.3 — Dịch theo lô

**Mục tiêu khối lượng:** mỗi phiên **tối thiểu 500 mục mới được ghi vào từ điển** (dòng + nhãn + ô; không tính mục được phân loại lại `notNeeded`), hoặc làm liên tục tới khi hết ngữ cảnh/thời gian. Báo cáo cả "số mục mới" lẫn coverage. Phiên trước chỉ ghi được ~320 mục. Lô ~150–250 mục; sau **mỗi lô** chạy `build:data` + `check:data` + `spec:inventory` (điểm dừng an toàn). Chạy `npm test` + `validate:data` sau mỗi 2–3 lô và cuối phiên.

**Bước C1.3.2 — Sửa nhỏ từ review lần 6 (✅ ĐÃ XONG ở phiên v12; không làm lại, không tính vào 500 mục):**
1. **Dấu inch `”` (U+201D) bị mất mà gate không bắt:** 3 nhãn "1pc 1/2” dr. socket adapter", "1pc 1/4” …", "1pc 3/8” …" → "…truyền động 1/2". Nguyên nhân: `numericTokens` chỉ nhận `" ″ ′ '` sau số, `normalizeTechnicalToken` xoá `“”`. Coi `”` tương đương `″` (chuẩn hoá `”`→`″` khi so khớp, không xoá). Sửa 3 target (giữ dấu inch). Test: label target thiếu dấu inch cho nguồn `1/2”` → build fail.
2. **Quy tắc lượng từ dòng liệt kê chưa theo:** 123 nhãn dạng `Npcs X` (không có `set`) đang dịch "Bộ N X" (vd "12pcs combination spanners" → "Bộ 12 cờ lê kết hợp"); 2 nhãn có `set` ("6pcs punch set", "9pcs hex key set") lại thiếu "Bộ". Sửa: không có `set` → "N X"; có `set` → "Bộ N X". Thêm kiểm tra (report hoặc gate) đếm target vi phạm, kỳ vọng 0. Ghi số trước → sau vào WORKLOG.

**Bước C1.3.1 — Sửa lỗi review lần 5 (✅ ĐÃ XONG ở phiên v10; không làm lại, không mở lô mới trước khi review + commit):**

Claude review 2026-09-14 (entry "Claude — Review C1.3.0 + lô 532 mục của Codex" trong WORKLOG). Gate kỹ thuật PASS nhưng lô 532 mục có lỗi nội dung. Không revert lô; sửa tại chỗ.

Codex đã xử lý đủ 5 nhóm dưới đây, thêm test và chạy toàn bộ gate. Phần này giữ lại làm checklist review; việc tiếp theo chỉ là review + commit.

**1. `sl` dịch sai thành "Số lượng"**
- `SL` trong nguồn là **tua vít/mũi vít dẹt (slotted)**. 11 dòng generated đang sai, vd "> Số lượng: 3x75mm, 5.5x100mm…", "> Số lượng: SL4, SL5, SL6".
- Rà **mọi** dòng nguồn có nhãn `SL` trong `data/products.json` để xác nhận ngữ cảnh. Nếu tất cả là đầu dẹt: đổi label `sl` → `Dẹt (SL)`. Nếu có ngữ cảnh khác: bỏ label `sl`, ghi từng dòng vào `lines`.
- Test: `> SL: 3, 4, 5, 6mm` → `> Dẹt (SL): 3, 4, 5, 6mm`.

**2. Chuẩn hoá khoảng trắng sau `:` làm hỏng mã**
- `normalizeSpecLineSpacing` đang chạy cả trên dòng không phải tiếng Việt: "EN149:2001+A1:2009" → "> EN149: 2001+A1:2009" (SP 456101, 456202, 456210), "D:S : 12:1" → "D: S : 12:1".
- Chỉ áp dụng khi output `hasVietnameseText` **và** dấu `:` đó không nằm giữa hai ký tự chữ/số liền nhau (`\w:\w`, vd `EN149:2001`, `12:1`, `10:30`, `D:S`).
- Test: `> EN149:2001+A1:2009` giữ nguyên; `> D:S : 12:1` giữ nguyên; `> Đóng gói:hộp màu` → `> Đóng gói: hộp màu`; target review `> Tiêu chuẩn EN149:2001` giữ nguyên.

**3. 72 nhãn chết nhưng inventory vẫn tính "đã dịch"**
- 72 target trong `labels` không giữ đủ token số của nhãn nguồn (chủ yếu **bỏ dấu inch `″`**: "13pcs 1/4″ cr-v sockets" → "Bộ 13 đầu tuýp thép hợp kim 1/4"). Build bỏ qua nhãn qua `preservesNumericTokens` nên dòng vẫn hiện tiếng Anh, nhưng inventory không kiểm guard này nên đếm **74 dòng** translated.
- Chuyển `numericTokens`/`preservesNumericTokens` vào module dùng chung; inventory dùng **đúng** guard của build.
- **Gate mới (fail ngay):** target `labels` không giữ đủ token số của key → `build:data` fail, liệt kê key. Không được bỏ qua âm thầm.
- Sửa cả 72 target (giữ nguyên `″`, `”`, số, phân số đúng như nguồn).
- Test: label `13pcs 1/4″ cr-v sockets` với target thiếu `″` → build fail; inventory không tính dòng đó là translated.

**4. Thuật ngữ không nhất quán, mất mã/đơn vị**
Chốt chuẩn (áp dụng cho cả mục cũ và mới, ghi vào `vi-glossary.json` nếu dùng lặp):
- Mã vật liệu/tiêu chuẩn **giữ nguyên như nguồn**: `Cr-V`/`CrV`, `S2`, `HSS`, `ABS`, `SDS-plus`, `SDS-max`, `EN14387`, `AS/NZS1716`… **Cấm** dịch `Cr-V` thành "thép hợp kim" hay bỏ mã. (HSS có thể thêm "thép gió (HSS)".)
- Loại đầu vít giữ tên chuẩn: `Phillips` (PH), `Pozidriv` (nguồn `pozi`/`PZ`), `Torx`, `dẹt` (slotted/SL). **Cấm** "chữ thập" cho Pozidriv (đang sai: dòng giá trị `PZ1*80mm; PZ2*100mm` hiện "tua vít chữ thập cách điện"). Thống nhất "Torx", không lúc "sao" lúc "Torx".
- Đơn vị trong ngoặc của nhãn **giữ nguyên**: `(scfm)`, `(psi|bar)`, `(IP)`, `(inch/mm)`, `(h)` → `(giờ)` được. Hiện có dòng mất đơn vị thật: "> Mức tiêu thụ khí trung bình: 45". Nếu allowlist chặn đơn vị trong ngoặc (vd `inch`, `mm`, `scfm` không đứng sau số), mở rộng **hẹp**: cho phép cụm trong ngoặc chỉ gồm đơn vị/mã và dấu `/|,`; test `Kích thước (inch/mm)` không báo, `(with case)` vẫn báo. Thêm `sds-plus`, `sds-max` vào `LOANWORDS`; `AS/NZS` chỉ chấp nhận khi đi kèm số hiệu tiêu chuẩn, test `as` đơn lẻ vẫn bị báo.
- Lượng từ dòng liệt kê trong bộ (`12pcs X: 8, 10, 12mm`): dùng `12 <danh từ>` (không "Bộ"). Chỉ dùng "Bộ N" khi nguồn có `set`.
- **Gate mới (fail ngay):** mọi token mã trong nguồn (chữ+số như `S2`, `EN14387`; mục trong `CODE_WORDS`/`LOANWORDS` như `cr-v`, `crv`, `phillips`, `pozi`, `torx`, `sds-plus`, `abs`; đơn vị trong ngoặc) phải xuất hiện trong target `lines`/`labels`/`cells` (không phân biệt hoa thường; `crv` ≡ `cr-v`; `pozi` ≡ `pozidriv`; `sl` ≡ `dẹt (SL)`). Vi phạm → liệt kê source/target.
- Rà lại **toàn bộ 532 mục mới** theo chuẩn trên; sửa target, không chỉ các ví dụ.

**5. Nhỏ**
- `blow per minute` → "Số lần đập mỗi phút".
- `Size(inch/mm)` → `KÍCH THƯỚC (inch/mm)`.
- Nhãn sinh từ nguồn hỏng (`2 stage long arms8`, `3 stage short arms6`, SP 743004): **không đoán** sửa số liệu nguồn. Bỏ khỏi `labels`, ghi vào "Cần review" trong WORKLOG.

**Chỉ số bắt buộc ghi WORKLOG (trước → sau):** dòng "Số lượng:" sai 11 → 0; dòng không phải tiếng Việt bị đổi khoảng trắng 2 → 0; nhãn chết 72 → 0; dòng inventory tính dư 74 → 0; target mất mã/đơn vị/loại đầu vít → 0; coverage `translated / notNeeded / missing` (translated có thể **giảm** sau mục 3, đó là số đúng). Kèm so sánh generated với HEAD: số dòng Anh → Việt và Việt → Anh (Việt → Anh phải có giải thích).

**Kiểm chứng C1.3.1:** `npm test`, `npm run build:data`, `npm run check:data`, `npm run validate:data`, `npm run spec:inventory`, `npm run typecheck`, `npm run build`, `npm run validate:export`, `git diff --check`. Xong C1.3.1 thì dừng, báo người dùng để review + commit trước khi dịch lô tiếp.

**Bước C1.3.0 — Sửa nhỏ từ review lần 4 (✅ ĐÃ XONG, tham khảo):**
1. **Chuỗi lai "> Khởi động êmer"** (3 lần, nguồn "Soft starter"): regex cứng `/Soft start/gi` trong `translateText` thiếu biên từ. Thêm biên từ Unicode (như `replaceWholePhrase`) cho **mọi** regex cụm từ cứng trong `translateText` (`Brushless Motor`, `CE approval`, `Soft start`, `color box`, `Tool Only`…). Mở rộng `hasHybridToken` bắt chữ có dấu kèm đuôi phụ âm không có trong tiếng Việt: `/[<chữ có dấu>][a-z]*[bdfjklqrswxz](?![\p{L}\d])/iu` (Claude đã chạy thử trên generated hiện tại: đúng 1 hit, không false positive). Test: `> Soft starter` không thành "êmer"; `hasHybridToken("Khởi động êmer") === true`.
2. **Thiếu khoảng trắng sau dấu `:`** ("> Đóng gói:hộp màu"): khi output dòng là tiếng Việt, chuẩn hoá `Nhãn:giá trị` → `Nhãn: giá trị`. Không đụng `:` trong số/giờ (`1:10`, `10:30`) hoặc URL. Test cả hai trường hợp.

**Thứ tự ưu tiên:**
1. **Đã hoàn tất:** 46 ô bảng lai đã ghi vào `cells`; quality `Việt trộn English` hiện 0/0.
2. Rà nhóm ngoại lệ nguồn/gate dưới đây; 2 nhãn còn thiếu đều là nguồn lỗi, không đoán.
3. Dòng tự do theo tần suất giảm dần; dòng thông thường kế tiếp `> Chips: High-quality SMD LED.6500K`.
4. Ô bảng còn chữ còn lại

**Ngoại lệ cần review ở đầu inventory (chưa dịch):**
- Hai nhãn `2 stage long arms8`, `3 stage short arms6`; không sửa số liệu nguồn bằng suy đoán.
- Nguồn mơ hồ/sai định dạng còn lại: `1pc 1pc core connecting rod`, `2pcs CrV 1/2″ Dr. extension bars: 125(5”), 250(10”)mm`, `3.5HP Briggs & Stratton petrol engine`, `3M VDE Cable 1.0mm2`, `9 CS twist drill bits`, và mục pin `Li-Polymer`. Đối chiếu ngữ cảnh sản phẩm trước khi dịch.
- Đã xử lý có test hẹp: `in-1` trong `3-in-1`, quy đổi `Pounds/454kgs`, ký hiệu `13,mm`, mảnh kích thước `X60X180CM` và mô-men `M/0-220Lb`. Chỉ mở rộng gate cho đúng các dạng số liệu này; không thêm allowlist tiếng Anh rộng để cho qua.

**Mẹo tăng tốc hợp lệ:** gom các dòng cùng mẫu (vd `> Packing: <N>pcs in <bao bì>`, `> Material: <vật liệu>`) và dịch nhất quán cùng lúc. Vẫn phải ghi **từng chuỗi nguồn** vào `lines` (hoặc dùng `labels` khi đúng điều kiện). Không thêm regex dịch tự do mới vào pipeline.

**Chuẩn dịch:**
- Tiếng Việt kỹ thuật ngành dụng cụ, nhất quán với `vi-glossary.json` và các bản dịch đã có. Thuật ngữ lặp nhiều lần → thêm vào glossary.
- Giữ nguyên **100%** số, đơn vị, dung sai, ký hiệu (`Ø ″ ± ×`), mã model/SKU, tiêu chuẩn, mã vật liệu (`Cr-V`, `S2`, `ABS`, `TPR`).
- Lượng từ: dùng `chiếc/cái/bộ/món/chi tiết` **đúng ngữ cảnh, ghi trong từ điển**; không để `pcs` trong câu tiếng Việt, không thêm regex thay `pcs` tự động.
- Giữ tiền tố `> ` và cấu trúc `Nhãn: giá trị` khi nguồn có.
- Câu tính năng dịch tự nhiên, không word-by-word, không thêm quảng cáo hay thông tin nguồn không có.
- **Không** để dòng lai kiểu "Rated Điện áp": cả dòng phải là tiếng Việt (trừ allowlist).
- Không chắc nghĩa → giữ từ gốc trong ngoặc, vd `Kìm mũi nhọn (long nose)`, và ghi vào "Cần review" trong WORKLOG.

### C1.4 — Kiểm chứng khi `missing = 0`

```bash
npm run build:data
npm audit --audit-level=high
npm run typecheck
npm test
npm run validate:data
npm run check:data
npm run build
npm run validate:export
```

Kiểm tra thêm:
- Placeholder = 0; English remainder trên generated = 0 (ngoài allowlist) → chuyển gate coverage + English remainder sang **fail-mode**.
- Mở HTML build của ít nhất 10 SP thuộc 10 danh mục (có `out/san-pham/may-nen-khi/index.html`); đối chiếu từng dòng với `data/products.json`: đủ dòng, đúng số liệu, đọc tự nhiên.
- Vẫn 1357 SP, 30 danh mục, 1452 trang, slug không đổi, JSON-LD hợp lệ, 0 duplicate title/H1.

### Tiêu chí hoàn thành C1

- [x] C1.2b xong, có test cho: `needsTranslation`, `labels`, `pc/pcs`, báo cáo English remainder trên generated
- [x] C1.2c xong: 0 `pcs` trong target tiếng Việt (có gate), ignore list tường minh, token có gạch nối xét từng phần, fallback dòng không tạo câu lai, thuật ngữ satin thống nhất
- [x] C1.2d xong: 0 token lai có dấu, 0 `N chi tiết` tự động, allowlist tách tiếng Việt/từ mượn, gate target từ điển fail-mode, satin thống nhất
- [x] C1.3.0 xong: 0 chuỗi "êmer"/đuôi phụ âm lai, regex cứng có biên từ, chuẩn hoá khoảng trắng sau `:`; 46 ô bảng lai → 0
- [x] C1.3.1 xong: `sl` đúng nghĩa, chuẩn hoá `:` không đụng mã, 0 nhãn chết (gate), gate giữ mã/đơn vị/loại đầu vít, 532 mục mới rà lại theo chuẩn thuật ngữ; chờ review + commit
- [x] C1.3.2 xong: `”` được gate coi là dấu inch, 3 target sửa; 0 vi phạm quy tắc "Bộ N" (123 → 0, 2 → 0)
- [ ] `missing = 0` (dòng, nhãn, ô bảng)
- [ ] 0 placeholder, 0 dòng lai/tiếng Anh ngoài allowlist, 0 `pcs` trong câu tiếng Việt
- [ ] Gate coverage + English remainder ở fail-mode
- [ ] Toàn bộ gate C1.4 PASS
- [ ] `WORKLOG.md` cập nhật

---

## Ngoài phạm vi — KHÔNG tự làm, chỉ hỏi người dùng khi cần

| ID | Việc | Vì sao chưa làm |
|---|---|---|
| D1 | Giao diện giống bản gốc (header cam, hero ảnh lifestyle, banner marketing) | Chờ quyết định + ảnh marketing chính thức. `AGENTS.md` chỉ cho tải logo |
| D2 | Thông tin liên hệ công ty / bật lại form Liên hệ | Chờ thông tin VN chính thức + quyết định backend |
| D3 | Đổi màu/chữ nút cam cho đạt tương phản WCAG | Quyết định thương hiệu |
| R1 | Kiểm `.htaccess` và Lighthouse trên staging Hostinger | Cần quyền truy cập staging |
| R2 | Push GitHub / chạy CI thật | Cần người dùng cho phép; tài khoản gh hiện không truy cập được repo |
| P1, P2 | Payload admin UX, gộp nhánh Payload vào `main` | Luồng riêng; gộp sẽ conflict ở `src/app/page.tsx`, `HeroSlider.tsx`, `catalog.ts`, `build-catalog-data.mjs` |

Nếu người dùng chỉ định rõ một việc trong bảng này, làm theo chỉ định đó thay cho C1, vẫn tuân thủ quy tắc và báo cáo.

---

## Báo cáo (bắt buộc sau mỗi phiên, kể cả khi dừng giữa chừng)

1. Thêm entry **trên cùng** mục 6 của `WORKLOG.md` theo mẫu ở mục 0:
   - Việc C1.2b đã làm (nếu có)
   - Coverage trước → sau theo 3 số `translated / notNeeded / missing`, tách dòng, nhãn, ô bảng
   - Số chuỗi/nhãn dịch trong phiên (so với mục tiêu ≥500)
   - Lệnh đã chạy + kết quả thật (PASS/FAIL, con số; test EPERM ghi rõ)
   - Thuật ngữ "Cần review"
   - Commit hash hoặc "chưa commit"
   - Việc tiếp theo cụ thể (lô kế tiếp bắt đầu từ mục nào)
2. Cập nhật mục 2 (Trạng thái) và dòng C1 ở mục 3 của `WORKLOG.md`.
3. Nếu người dùng cho phép commit: đưa `WORKLOG.md` vào cùng commit. Message dạng `feat(data): add spec label dictionary`, `feat(data): translate product specs batch N`.
4. Tin nhắn cuối cho người dùng (tiếng Việt, ngắn): đã làm gì, coverage hiện tại, gate PASS/FAIL, việc cần người dùng quyết định.

Không tuyên bố "xong"/"production-ready" khi chưa có bằng chứng lệnh chạy. Gate nào fail thì báo nguyên output liên quan, không che giấu.
