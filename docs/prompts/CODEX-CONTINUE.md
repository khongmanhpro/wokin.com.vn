# Prompt tiếp nhận dự án cho Codex

> Cách dùng: mở Codex tại `/Volumes/data AI/wokin.com.vn` rồi gửi:
> `Đọc và thực hiện đúng docs/prompts/CODEX-CONTINUE.md`
> Prompt này dùng lại được: nếu phiên trước làm dở, phiên mới tự biết tiếp từ đâu nhờ `WORKLOG.md` và file tiến độ dịch.

---

Bạn là kỹ sư tiếp nhận dự án **WOKIN**: chuyển website WordPress https://www.wokintools.com/ sang Next.js static export cho `wokin.com.vn`, toàn bộ nội dung tiếng Việt. Dự án đã qua nhiều agent (Hermes, Codex, Claude). Không được đoán; mọi kết luận phải dựa trên file và lệnh đã chạy.

Đường dẫn có dấu cách, **luôn quote**: `"/Volumes/data AI/wokin.com.vn"`. Trả lời người dùng bằng tiếng Việt.

## Bước 1 — Nạp ngữ cảnh (bắt buộc, theo thứ tự)

1. `WORKLOG.md`: đọc hết mục 0–5 và 3 entry mới nhất ở mục 6. Đây là nguồn trạng thái chính.
2. `docs/phase-11-acceptance.md`: blocker hiện tại và số liệu.
3. `AGENTS.md` (quy tắc tiếng Việt, SEO, không crawl), `DESIGN.md`.
4. `docs/data-model.md`, `src/data/README.md`, rồi `scripts/build-catalog-data.mjs` (hàm `parseLegacySpec`, `createTranslator`, `translateSpecLine`) và `src/lib/catalog.ts` (`translateSpecLine`, `parseProductSpec`).
5. `data/vi-glossary.json` (mục `terms`, `spec_labels`, `ui`).

Nếu entry mới nhất trong `WORKLOG.md` cho thấy việc dưới đây **đã làm dở**, tiếp tục từ chỗ dở; không làm lại từ đầu, không ghi đè bản dịch đã có.

## Bước 2 — Xác nhận baseline

```bash
cd "/Volumes/data AI/wokin.com.vn"
git status --short --branch
git log --oneline -5
npm test
npm run check:data
```

Kỳ vọng tại lần bàn giao (2026-09-14): nhánh `main`, commit mới nhất `ea5599d` hoặc mới hơn, 65 tests PASS, check:data PASS. Untracked được phép tồn tại: `.claude/`, `reports/`, vài file `.hermes/*.py`, `.hermes/plans/*`. Nếu khác kỳ vọng: **dừng**, báo người dùng khác biệt cụ thể, không tự "sửa cho khớp".

## Quy tắc bất di bất dịch

- **Không** crawl/scrape wokintools.com. Dữ liệu nguồn đã có trong `data/`.
- **Không** reset, checkout phá thay đổi, `git clean`, rebase, force; **không** đụng `.hermes/worktrees/` (nhánh Payload CMS có thay đổi chưa commit).
- **Không** push, deploy, tạo PR. **Chỉ commit khi người dùng cho phép**; nếu chưa được phép, để diff chưa commit và ghi rõ trong `WORKLOG.md`.
- **Không** tự quyết các việc chờ người dùng (mục "Ngoài phạm vi" bên dưới).
- **Không** đổi version dependency, không `npm audit fix --force`.
- **Không** bịa thông số kỹ thuật. Thiếu/khó hiểu thì giữ nguyên thuật ngữ gốc trong ngoặc, không đoán.
- Không ghi secret vào file/log.

---

## Việc cần làm: C1 — Dịch lại thông số kỹ thuật sản phẩm (blocker production)

### Vấn đề (đã kiểm chứng 2026-09-14)

Bộ dịch spec hiện dùng regex + glossary. Dòng nào còn sót tiếng Anh thì `translateSpecLine` **thay cả dòng** bằng nhãn chung "Đặc tính kỹ thuật" hoặc "Thông số kỹ thuật: <số liệu>". Hậu quả:

| Chỉ số | Giá trị |
|---|---|
| SP có dòng bị thay bằng nhãn chung | 1168 / 1357 |
| Dòng mất nội dung | 2773 / 10011 |
| Dòng còn lẫn tiếng Anh ("Rated Điện áp", "Max pump pressure") | ~738 dòng / 398 SP |
| SP có header bảng đóng gói tiếng Anh ("Rated current") | 64 |
| Dòng spec nguồn **không trùng** | ~5754 (~189 nghìn ký tự) |
| Ô bảng nguồn không trùng có chữ | ~1644 |

Ví dụ `/san-pham/may-nen-khi/` (SKU 830912): các dòng "Suitable for workshop use.", "Thermal motor protection overload.", "Pressure regulator and pressure gauge.", "Wheels and transport handle." đều hiển thị là "Đặc tính kỹ thuật".

### Hướng giải quyết bắt buộc

Bản dịch phải là **dữ liệu nguồn được review**, không phải regex lúc build.

**C1.1 — Kiểm kê (script, có test)**
- Tạo `scripts/spec-translation-inventory.mjs`. Dùng **chính** `parseLegacySpec` của pipeline (export hàm, không viết parser thứ hai) để trích mọi dòng spec và ô bảng từ `data/products.json`, rồi chuẩn hoá bằng `normalizedSpecText`.
- Output: tổng số chuỗi nguồn không trùng, số đã dịch, số còn thiếu, top chuỗi thiếu theo tần suất. Có cờ `--next-batch <n>` in ra `n` chuỗi thiếu tiếp theo, sắp theo tần suất giảm dần rồi theo thứ tự chữ cái.

**C1.2 — Dữ liệu dịch + tích hợp pipeline (TDD: viết test fail trước)**
- File nguồn: `data/spec-translations-vi.json`:
  ```json
  { "schemaVersion": 1, "lines": { "<chuỗi nguồn đã chuẩn hoá>": "<bản dịch VI>" }, "cells": { "<ô nguồn>": "<bản dịch VI>" } }
  ```
  Key sắp xếp ổn định để diff dễ đọc.
- `build-catalog-data.mjs`: tra từ điển **khớp chính xác trước**. Không có trong từ điển thì dùng logic cũ, nhưng **không bao giờ** sinh dòng placeholder "Đặc tính kỹ thuật"/"Thông số kỹ thuật" thay cho nội dung.
- Kiểm tra `src/lib/catalog.ts`: `translateSpecLine`/`parseProductSpec` còn được gọi ở runtime cho dữ liệu thật không. Nếu còn, phải dùng cùng dữ liệu đã dịch từ generated catalog. Nếu là code chết, báo lại trong WORKLOG; chỉ xoá khi test chứng minh không còn đường gọi.
- Cập nhật `npm run build:data` để regenerate `src/data/catalog.generated.json` và checksums.
- Gate mới trong `validate:data` / `check:data`:
  1. Fail nếu `technicalSpecs.lines` của bất kỳ SP nào chứa placeholder "Đặc tính kỹ thuật" hoặc "Thông số kỹ thuật" đứng thay nội dung.
  2. Fail nếu một bản dịch làm **mất hoặc đổi số liệu**: tập token số + đơn vị (vd `1500W`, `2Hp`, `8Bar`, `116psi`, `188L/min`, `M10`, `1/2"`) của bản dịch phải chứa đủ token của nguồn.
  3. Báo cáo (chưa fail) số chuỗi còn thiếu dịch và số dòng còn từ tiếng Anh phổ biến. Chỉ chuyển sang fail khi coverage đạt 100%.

**C1.3 — Dịch theo lô (chính bạn dịch, không gọi dịch vụ ngoài)**
- Mỗi lô ~150–250 chuỗi lấy từ `--next-batch`, ưu tiên tần suất cao. Sau mỗi lô: ghi vào `data/spec-translations-vi.json`, chạy inventory + gate số liệu. **Mỗi lô là một điểm dừng an toàn**: phiên sau đọc inventory là biết tiếp từ đâu.
- Chuẩn dịch:
  - Tiếng Việt kỹ thuật ngành dụng cụ, nhất quán với `vi-glossary.json` (`terms`, `spec_labels`). Thuật ngữ mới lặp nhiều lần thì **thêm vào glossary** thay vì dịch mỗi chỗ một kiểu.
  - Giữ nguyên **100%** số, đơn vị, dung sai, ký hiệu (`Ø`, `″`, `±`, `×`), mã model/SKU, tiêu chuẩn (CE, GS, DIN, ISO, ANSI), tên vật liệu viết tắt (Cr-V, CRV, S2, ABS, TPR).
  - Giữ tiền tố `> ` và cấu trúc "Nhãn: giá trị".
  - Câu mô tả tính năng dịch tự nhiên, không word-by-word, không thêm quảng cáo, không thêm thông tin nguồn không có.
  - Header bảng viết HOA như hiện tại ("MÃ KHO", "KÍCH THƯỚC", "SL/THÙNG"); đơn vị giữ nguyên.
  - Không chắc nghĩa một thuật ngữ thì dịch phần chắc chắn và giữ từ gốc trong ngoặc, vd `Kìm mũi nhọn (long nose)`. Ghi thuật ngữ đó vào mục "Cần review" của WORKLOG.
- Không dịch lại chuỗi đã có bản dịch, trừ khi sửa lỗi rõ ràng (ghi lý do).

**C1.4 — Kiểm chứng khi đạt 100% coverage**

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
- Đếm lại trên `src/data/catalog.generated.json`: placeholder = **0**; dòng mất nội dung = **0**; SP có header bảng tiếng Anh = **0**.
- Mở HTML build của ít nhất 10 SP thuộc 10 danh mục khác nhau (có `out/san-pham/may-nen-khi/index.html`). Đối chiếu từng dòng với `data/products.json`: đủ số dòng, đúng số liệu, đọc tự nhiên.
- Vẫn 1357 SP, 30 danh mục, 1452 trang build, slug không đổi, JSON-LD hợp lệ, 0 duplicate title/H1.

### Tiêu chí hoàn thành C1

- [ ] `data/spec-translations-vi.json` phủ 100% dòng spec và ô bảng có chữ
- [ ] 0 placeholder, 0 dòng mất nội dung, 0 header bảng tiếng Anh
- [ ] Gate số liệu PASS toàn bộ; gate placeholder và coverage đã chuyển sang fail-mode
- [ ] Test mới cho: tra từ điển, cấm placeholder, bảo toàn số liệu, inventory
- [ ] Toàn bộ gate ở C1.4 PASS
- [ ] `WORKLOG.md` cập nhật (xem "Báo cáo")

---

## Ngoài phạm vi — KHÔNG tự làm, chỉ hỏi người dùng khi cần

| ID | Việc | Vì sao chưa làm |
|---|---|---|
| D1 | Giao diện giống bản gốc (header cam, hero ảnh lifestyle, banner marketing) | Chờ quyết định + ảnh marketing chính thức. `AGENTS.md` chỉ cho tải logo |
| D2 | Thông tin liên hệ công ty / bật lại form Liên hệ | Chờ thông tin VN chính thức + quyết định backend |
| D3 | Đổi màu/chữ nút cam cho đạt tương phản WCAG | Quyết định thương hiệu |
| R1 | Kiểm `.htaccess` và Lighthouse trên staging Hostinger | Cần quyền truy cập staging |
| R2 | Push GitHub / chạy CI thật | Cần người dùng cho phép |
| P1, P2 | Payload admin UX, gộp nhánh Payload vào `main` | Luồng riêng; gộp sẽ conflict ở `src/app/page.tsx`, `HeroSlider.tsx`, `catalog.ts`, `build-catalog-data.mjs` |

Nếu người dùng chỉ định rõ một việc trong bảng này, làm theo chỉ định đó thay cho C1, vẫn tuân thủ quy tắc và báo cáo.

---

## Báo cáo (bắt buộc sau mỗi phiên, kể cả khi dừng giữa chừng)

1. Thêm entry **trên cùng** mục 6 của `WORKLOG.md` theo mẫu ở mục 0 của file đó:
   - Lô đã dịch, coverage trước → sau (vd `lines 1200/5754 → 1450/5754`)
   - Lệnh đã chạy + kết quả thật (PASS/FAIL, con số)
   - Thuật ngữ "Cần review" cho người có chuyên môn
   - Commit hash, hoặc "chưa commit"
   - Việc tiếp theo cụ thể (lô kế tiếp bắt đầu từ chuỗi nào)
2. Cập nhật mục 2 (Trạng thái) và dòng C1 ở mục 3 của `WORKLOG.md`.
3. Nếu có commit: đưa thay đổi `WORKLOG.md` vào cùng commit. Message dạng `feat(data): translate product specs batch N` hoặc `fix(data): block spec placeholders`.
4. Tin nhắn cuối cho người dùng (tiếng Việt, ngắn): đã làm gì, coverage hiện tại, gate PASS/FAIL, việc cần người dùng quyết định.

Không tuyên bố "xong"/"production-ready" khi chưa có bằng chứng lệnh chạy. Gate nào fail thì báo nguyên output liên quan, không che giấu.
