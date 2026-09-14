# Prompt tiếp nhận dự án cho Codex

> Cách dùng: mở Codex tại `/Volumes/data AI/wokin.com.vn` rồi gửi:
> `Đọc và thực hiện đúng docs/prompts/CODEX-CONTINUE.md`
> Prompt dùng lại được nhiều phiên. Phiên mới tự biết tiếp từ đâu nhờ `WORKLOG.md` và `npm run spec:inventory`.
>
> Phiên bản 2 (2026-09-14, sau review của Claude): C1.1/C1.2 đã xong và commit ở `a40cff1`. Thêm C1.2b (tăng tốc + sửa gate) và mục tiêu khối lượng mỗi phiên.

---

Bạn là kỹ sư tiếp nhận dự án **WOKIN**: chuyển website WordPress https://www.wokintools.com/ sang Next.js static export cho `wokin.com.vn`, toàn bộ nội dung tiếng Việt. Dự án đã qua nhiều agent (Hermes, Codex, Claude). Không được đoán; mọi kết luận phải dựa trên file và lệnh đã chạy.

Đường dẫn có dấu cách, **luôn quote**: `"/Volumes/data AI/wokin.com.vn"`. Trả lời người dùng bằng tiếng Việt.

## Bước 1 — Nạp ngữ cảnh (bắt buộc, theo thứ tự)

1. `WORKLOG.md`: đọc hết mục 0–5 và 3 entry mới nhất ở mục 6. Đây là nguồn trạng thái chính. **Đọc kỹ entry "Review tiến độ C1 của Codex"** (phát hiện 1–6).
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

Kỳ vọng tại lần bàn giao: nhánh `main`, có commit `a40cff1` (hoặc mới hơn), 68 tests, check:data PASS, inventory `282/7400` hoặc cao hơn. Untracked được phép: `.claude/`, `reports/`, vài file `.hermes/*.py`, `.hermes/plans/*`.

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

### Trạng thái (Claude kiểm chứng 2026-09-14, commit `a40cff1`)

| Hạng mục | Trạng thái |
|---|---|
| C1.1 Inventory `npm run spec:inventory [-- --next-batch N]` dùng `parseLegacySpec` chung | ✅ Xong |
| C1.2 Từ điển `data/spec-translations-vi.json` (`lines`, `cells`) tra trước fallback; build fail khi có placeholder hoặc mất token số | ✅ Xong |
| Placeholder "Đặc tính kỹ thuật" trong generated | ✅ 0 |
| C1.3 Coverage | ⏳ **282/7400 (3,8%)** |

Hệ quả trạng thái trung gian: dòng chưa dịch đang hiển thị **nguyên tiếng Anh hoặc lai** (vd SKU 830912: "Rated Điện áp: 220V", "Noise: 88db", "Suitable for workshop use."). Không mất thông tin, nhưng chưa release được.

### Phát hiện cần xử lý (từ review)

1. Tốc độ ~141 chuỗi/phiên, cần ~50 phiên → **quá chậm**.
2. 805/1524 ô bảng "thiếu" chỉ là số + đơn vị (`11mm`, `115×22.2mm`), không cần dịch; 94 mục từ điển là bản sao y nguồn.
3. 1317 dòng thiếu có dạng `Nhãn: số liệu` với chỉ **692 nhãn** khác nhau (input power 52, size 35, rated current 28, fuel tank capacity 17, no load speed 16...).
4. Gate số liệu ép giữ `pc/pcs` → câu kém tự nhiên ("Kèm 2pcs bộ pin", "100pcs trong một túi").
5. Regex English remainder bỏ sót `rated`, `noise`, `air`... → báo cáo thấp hơn thực tế.

---

### C1.2b — Tăng tốc và sửa gate (làm TRƯỚC khi dịch tiếp; TDD: test fail trước)

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

### C1.3 — Dịch theo lô

**Mục tiêu khối lượng:** mỗi phiên **tối thiểu 500 chuỗi/nhãn**, hoặc làm liên tục tới khi hết ngữ cảnh/thời gian. Lô ~150–250 mục; sau **mỗi lô** chạy `build:data` + `check:data` + `spec:inventory` (điểm dừng an toàn). Chạy `npm test` + `validate:data` sau mỗi 2–3 lô và cuối phiên.

**Thứ tự ưu tiên:**
1. `labels` (692 nhãn → phủ ~1317 dòng)
2. Dòng tự do theo tần suất giảm dần
3. Ô bảng còn chữ (header viết HOA như `MÃ KHO`, `KÍCH THƯỚC`, `SL/THÙNG`)

**Mẹo tăng tốc hợp lệ:** gom các dòng cùng mẫu (vd `> Packing: <N>pcs in <bao bì>`, `> Material: <vật liệu>`) và dịch nhất quán cùng lúc. Vẫn phải ghi **từng chuỗi nguồn** vào `lines` (hoặc dùng `labels` khi đúng điều kiện). Không thêm regex dịch tự do mới vào pipeline.

**Chuẩn dịch:**
- Tiếng Việt kỹ thuật ngành dụng cụ, nhất quán với `vi-glossary.json` và các bản dịch đã có. Thuật ngữ lặp nhiều lần → thêm vào glossary.
- Giữ nguyên **100%** số, đơn vị, dung sai, ký hiệu (`Ø ″ ± ×`), mã model/SKU, tiêu chuẩn, mã vật liệu (`Cr-V`, `S2`, `ABS`, `TPR`).
- Lượng từ: dùng `chiếc/cái/bộ/món/chi tiết`, **không** để `pcs` trong câu tiếng Việt.
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

- [ ] C1.2b xong, có test cho: `needsTranslation`, `labels`, `pc/pcs`, báo cáo English remainder trên generated
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
