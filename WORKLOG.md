# WORKLOG — Nhật ký dự án WOKIN

> **File đầu tiên phải đọc** khi tiếp nhận dự án (người hoặc AI: Claude, Codex, Hermes...).
> Nó cho biết dự án là gì, đang ở đâu, việc gì còn mở và ai đã làm gì.
> File chi tiết theo chủ đề nằm ở mục 4; file này là mục lục + nhật ký.

## 0. Quy tắc ghi log (bắt buộc)

1. **Trước khi làm:** đọc mục 2, 3 và 5 entry mới nhất ở mục 6. Chạy `git status --short --branch` và `git log --oneline -5` để đối chiếu.
2. **Sau mỗi phiên làm việc** (kể cả chỉ audit, nghiên cứu, không commit): thêm entry **trên cùng** mục 6 theo mẫu dưới.
3. **Luôn cập nhật** mục 2 (Trạng thái hiện tại) và mục 3 (Việc mở) nếu có thay đổi. Việc xong thì chuyển trạng thái, không xoá.
4. Ghi **sự thật đã kiểm chứng**: lệnh đã chạy + kết quả. Chưa kiểm được thì ghi "chưa kiểm". Không ghi "chắc là", không bịa.
5. Ngày dạng tuyệt đối `YYYY-MM-DD`. Ghi rõ agent (Claude / Codex / Hermes / tên người).
6. Không ghi secret, mật khẩu, token, API key vào đây.
7. Nếu commit: ghi hash. Commit log nên nằm **cùng commit** với thay đổi code.

### Mẫu entry

```markdown
### YYYY-MM-DD — <Agent> — <Tiêu đề ngắn>
**Yêu cầu:** <người dùng yêu cầu gì>
**Đã làm:**
- ...
**Kiểm chứng:** `lệnh` → kết quả
**Commit:** `hash` message (hoặc "chưa commit")
**Còn dở / rủi ro:** ...
**Việc tiếp theo:** ...
```

---

## 1. Tổng quan nhanh

| | |
|---|---|
| Mục tiêu | Chuyển website WordPress https://www.wokintools.com/ sang **Next.js** cho `wokin.com.vn`. Bố cục giống bản gốc, **toàn bộ nội dung tiếng Việt**, URL tiếng Việt (SEO thị trường VN). |
| Stack public | Next.js 15.5 App Router, React 19, TypeScript, **static export** (`output: "export"`, `trailingSlash: true`) |
| Hosting | Hostinger (Apache/LiteSpeed). Upload `release/hostinger/` (có sẵn `.htaccess`) |
| Dữ liệu | 1.357 sản phẩm, 30 danh mục. Nguồn: `data/*.json` → `npm run build:data` → `src/data/catalog.generated.json` |
| CMS (song song) | Payload CMS 3.88 + Next 16 + PostgreSQL, nằm ở worktree `.hermes/worktrees/payload-r1` (nhánh `checkpoint/payload-r1-r4-1`) |
| Remote | `origin` = github.com/khongmanhpro/wokin.com.vn. `origin/main` mới có initial commit, **chưa push các phase** |
| Đường dẫn | `/Volumes/data AI/wokin.com.vn` (**có dấu cách**, luôn quote) |

### Lệnh chính

```bash
npm run dev                 # dev server
npm run verify              # typecheck + test + validate:data + build + validate:export
npm run check:data          # generated catalog khớp nguồn
npm run package:release     # tạo release/ cho Hostinger (release/ phải chưa tồn tại)
python3 -m http.server 4173 --directory out   # xem bản static (không dùng next start)
```

Gate đầy đủ trước khi commit một phase: `npm audit --audit-level=high`, `npm run typecheck`, `npm test`, `npm run validate:data`, `npm run check:data`, `npm run build`, `npm run validate:export`.

---

## 2. Trạng thái hiện tại

_Cập nhật: 2026-09-14 bởi Claude (review C1.2d đạt; gate chạy lại PASS 77/77)_

- **Nhánh `main`:** Phase 0–11 và checkpoint hạ tầng C1 đã commit; thay đổi C1.2b + C1.2c + C1.2d hiện tại đang để uncommitted theo quy định chưa được người dùng cho phép commit.
- **Gate (Codex, 2026-09-14):** audit 0, typecheck PASS, **77/77 tests PASS**, validate:data/check:data PASS, build 1452 trang, validate:export + smoke PASS.
- **Kết luận nghiệm thu:** **NO-GO production.** Kỹ thuật đạt; nội dung spec đang được dịch theo lô và các quyết định giao diện vẫn chờ (xem mục 3).
- **Payload CMS worktree:** 11 commit trên nhánh riêng + ~36 file sửa chưa commit. Admin UX **chưa được nghiệm thu**. Chưa merge vào `main`.
- **Chưa push, chưa deploy** bất cứ thứ gì.

---

## 3. Việc mở / chờ quyết định

| ID | Việc | Trạng thái | Chờ ai | Ghi chú |
|---|---|---|---|---|
| C1 | **C1.2d hoàn tất**; coverage hiện **1232 đã dịch / 1547 không cần dịch / 4621 còn thiếu trên 7400** (dòng 4298, ô bảng 323; 758 nhãn chưa phủ) | **Blocker**; C1.3 cần dịch review thủ công trước khi production | Codex (2026-09-14) | Placeholder = 0; English remainder generated 4415 chuỗi/5841 occurrences (dòng 4161/5417, ô 254/424). Quality gate: hybrid có dấu 0, Vietnamese+pcs 0, `N chi tiết` tự động ngoài từ điển 0; audit rộng còn 46 chuỗi/80 occurrences Việt trộn English ngoài allowlist (đều ở ô bảng chưa dịch). Dictionary 217 dòng / 274 nhãn / 28 ô (519 mục). Lô kế tiếp bắt đầu từ nhãn `size`. |
| D1 | Độ giống giao diện: header cam, hero ảnh lifestyle, trust banner cam, banner marketing | Chờ quyết định | Người dùng | `AGENTS.md` chỉ cho tải logo → cần WOKIN cấp ảnh marketing hoặc chấp nhận khác bản gốc |
| D2 | Trang Liên hệ không có địa chỉ/điện thoại/email công ty; form đã tắt từ Phase 7 | Chờ quyết định | Người dùng | Cần thông tin liên hệ VN chính thức + backend form nếu bật lại |
| D3 | Tương phản màu cam thương hiệu (#FE7700) không đạt WCAG AA | Chờ quyết định | Người dùng | Đề xuất chữ tối trên nút cam |
| R1 | Kiểm `.htaccess` (headers, 301) và đo Lighthouse mobile trên staging Hostinger | Chưa làm | Cần staging | `RELEASE-CHECKLIST.md` mục 4 |
| R2 | Push lên GitHub để CI chạy thật | Chưa làm | Người dùng cho phép push | |
| P1 | Payload admin UX roadmap (UX-0 → UX-9) | Đang dở | — | `.hermes/plans/2026-08-28_233449-admin-ux-codex-roadmap.md`; backlog go-live: `.hermes/worktrees/payload-r1/.hermes/plans/2026-08-29_184212-go-live-po-backlog.md` |
| P2 | Gộp nhánh Payload với `main` | Chưa làm | — | **Sẽ conflict**, xem mục 5 |

---

## 4. Bản đồ tài liệu

| File | Nội dung | Còn đúng? |
|---|---|---|
| `WORKLOG.md` | File này: trạng thái + nhật ký | Nguồn chính |
| `docs/prompts/CODEX-CONTINUE.md` | Prompt tiếp nhận cho Codex: nạp ngữ cảnh, quy tắc, đặc tả chi tiết việc C1, việc ngoài phạm vi, cách báo cáo | Dùng lại nhiều phiên |
| `AGENTS.md` | Brief gốc cho agent: quy tắc clone, tiếng Việt, SEO chống duplicate | Quy tắc còn hiệu lực; phần G0–G5 là kế hoạch ban đầu (vd không dùng Tailwind, form liên hệ đã bỏ) |
| `DESIGN.md` | Design tokens trích từ site gốc | Đúng, trừ `--text` đã thành `#767676` |
| `PROMPT-CLONE-NEXTJS.md` | Kiến trúc, routes, schema ban đầu | Tham khảo |
| `CODEX-HANDOFF.md` | Chi tiết nghiệm thu từng phase 0–11 | Đúng (lịch sử chi tiết) |
| `docs/phase-11-acceptance.md` | Biên bản nghiệm thu cuối: Lighthouse, blocker, so sánh giao diện | Đúng tại 2026-09-14 |
| `docs/data-model.md`, `src/data/README.md` | Schema dữ liệu catalog | |
| `DEPLOYMENT.md`, `RELEASE-CHECKLIST.md` | Quy trình đóng gói, staging, GO/NO-GO, rollback | |
| `BAO-CAO-NGHIEN-CUU.md` | Nghiên cứu site gốc | Lịch sử |
| `.hermes/plans/*` | Roadmap Payload CMS / admin UX | |
| `reports/*.xlsx` | Báo cáo tiến độ gửi sếp (không commit) | |

---

## 5. Lưu ý quan trọng / bẫy

- **Không crawl wokintools.com khi build.** Dữ liệu đã có trong `data/`. Được mở site gốc để so sánh giao diện.
- Chỉ hiển thị `name_vi`; URL `/san-pham/{slug_vi}`, `/danh-muc/{slug}`. Không canonical trỏ về site gốc.
- `public/images/products-responsive/` bị Git ignore → clone mới phải `npm run build` (prebuild tạo ảnh WebP) trước khi có `out/` đầy đủ.
- `next start` không dùng được (static export) → xem bằng `python3 -m http.server`.
- `.htaccess` chỉ kiểm được trên Apache/Hostinger, server local không áp dụng.
- **Nhánh Payload (`payload-r1`) tách từ `6622c73`.** Worktree đang sửa chưa commit `src/app/page.tsx`, `src/components/HeroSlider.tsx`, `src/lib/catalog.ts`, `scripts/build-catalog-data.mjs`..., những file mà `main` đã sửa ở Phase 10–11. Gộp phải xử lý conflict thủ công. **Không** reset/checkout/clean worktree đó.
- Không tự commit/push/deploy khi người dùng chưa yêu cầu. Quy ước dự án: mỗi phase xong → chạy đủ gate → commit checkpoint trên `main`.
- `.claude/launch.json` là cấu hình preview local (server `wokin-static`, cổng 4173).

---

## 6. Nhật ký (mới nhất trên cùng)

### 2026-09-14 — Claude — Review C1.2d của Codex
**Yêu cầu:** Codex báo xong C1.2d, kiểm tra.
**Đã làm (chỉ review, không sửa code/dữ liệu của Codex):** đọc `spec-translation-utils.mjs`, diff `build-catalog-data.mjs`, `spec-translation-inventory.mjs`, `validate-catalog.mjs`; audit độc lập trên generated + từ điển.
**Kiểm chứng:** gate đầy đủ → audit 0; typecheck PASS; **77/77 tests PASS**; validate:data PASS (1232 / 1547 / 4621; remainder 4415/5841; quality hybrid 0, VI+pcs 0, auto chi tiết 0, Việt trộn English 46/80); check:data PASS checksum `0a2de779…`; build 1452 trang; validate:export 1447 route + smoke PASS. Số liệu log Codex khớp.
**Đánh giá: C1.2d đạt.** Thay thuật ngữ theo biên Unicode; detector token lai dùng chung cho fallback, gate từ điển và báo cáo. Đã bỏ `N pcs → N chi tiết` ở cả `translateText` lẫn nhánh `labels`, inventory tính khớp. Allowlist tách `LOANWORDS` (toàn cục) / `VIETNAMESE_ASCII_WORDS` (chỉ trong chuỗi có dấu). Gate target từ điển fail ngay. Satin thống nhất. Audit độc lập: hybrid 0, VI+pcs 0, `N chi tiết` 0, **dòng spec Việt trộn English = 0**. Các từ cần xác minh đều đúng nghĩa: `ram` (tôi và ram), `leo dốc`, `lon`, `kìm phe`, `tấm che`, `MÀU CAM`, `lưỡi dao`, `ly hợp`, `thẻ skin`, `PA/PC`.
**Phát hiện nhỏ (không chặn C1.3):**
1. Còn **1 chuỗi lai / 3 lần xuất hiện**: "> Khởi động êmer" (nguồn "Soft starter"). Regex cứng `/Soft start/gi` trong `translateText` (dòng 254, 267) thiếu biên từ; detector chỉ bắt đuôi `s` nên không thấy. Nên thêm biên từ cho các regex cứng và mở rộng detector sang phụ âm cuối không có trong tiếng Việt (`[bdfjklqrswxz]`); đã thử regex này, chỉ 1 hit.
2. **46 ô bảng lai** hiển thị rõ ("OPERATING Áp suất khí", "FREE Tốc độ", "CABLE KÍCH THƯỚC", "Charging Điện áp"). Nguyên nhân là fallback ô bảng giữ regex header theo thiết kế. Đều tính `missing`, nên đưa lên **đầu C1.3** vì là header bảng dễ thấy.
3. Mỹ quan: "> Đóng gói:hộp màu" thiếu khoảng trắng sau `:` (nguồn thiếu, fallback không chuẩn hoá).
4. Thực trạng: chỉ **1230/5675 dòng spec không trùng** trên generated là tiếng Việt, còn lại hiển thị tiếng Anh nguyên văn. Còn 4621 mục thiếu.
**Commit:** người dùng cho phép; C1.2b–d commit cùng entry này (hash ghi ở entry kế tiếp).
**Việc tiếp theo:** C1.2b–d đủ điều kiện commit checkpoint (gate PASS) nếu người dùng cho phép; sau đó Codex làm C1.3 (ưu tiên 46 ô header lai + nhãn `size`), kèm sửa nhỏ mục 1, 3.

### 2026-09-14 — Codex — C1.2d sửa lỗi review lần 3
**Yêu cầu:** Đọc và thực hiện đúng `docs/prompts/CODEX-CONTINUE.md`; hoàn tất C1.2d trước khi bắt đầu C1.3.
**Đã làm:**
- Viết test đỏ trước khi sửa cho fallback hybrid, `N pcs`, target từ điển còn English, satin, allowlist và các chuỗi nguồn thật trong `data/products.json`.
- Thay thế glossary/spec label theo biên Unicode để không tạo `giács`, `hợps`, `khóas`, `víts`; thêm detector token lai dùng chung cho fallback và báo cáo remainder. Generated giảm **59 chuỗi hybrid có dấu → 0**.
- Bỏ thay tự động `N pcs → N chi tiết`; nhánh `labels` bỏ qua giá trị có `N pcs`, fallback trả nguồn nếu còn Vietnamese+pcs. Generated giữ **0 Vietnamese+pcs**; `N chi tiết` tự động ngoài từ điển **175 → 0**.
- Tách `VIETNAMESE_ASCII_WORDS` (chỉ áp dụng khi chuỗi có dấu) và `LOANWORDS`; bỏ regex hyphen dư; thêm gate build fail ngay khi target `lines`/`labels`/`cells` còn English hoặc token lai. Sửa các target kỹ thuật hợp lệ (`Bộ pin`, `Mối ren`, `MÀU CAM`, `lưỡi dao`...) để gate pass; target English ngoài allowlist **~40 → 0**.
- Giữ thống nhất `satin finish` và `stain finish` → `hoàn thiện satin`; thêm `satin` vào nhóm từ mượn. Inventory/validate báo cáo riêng ba chỉ số quality.
**Coverage trước → sau:** **1223 / 1551 / 4626 → 1232 / 1547 / 4621** (translated / notNeeded / missing); English remainder **4365/6078 → 4415/5841** (đo trên generated, tăng là do allowlist chính xác hơn và fallback an toàn hơn); audit Việt trộn English ngoài allowlist **(46/80 ở ô bảng) chưa xử lý**, còn hybrid có dấu trong fallback **59 → 0**.
**Kiểm chứng:** `npm test` → **77/77 PASS**; `npm run build:data` → PASS, checksum `0a2de779082143c68e9088f7db658c47f3c4307fdbb4309d914b126ae2c0b287`; `npm run check:data` → PASS; `npm run validate:data` → PASS, quality 0/0/0; `npm run spec:inventory` → 1232/1547/4621; `npm run typecheck` → PASS; `npm audit --audit-level=high` → 0 vulnerabilities; `npm run build` → PASS 1452 trang; `npm run validate:export` → PASS 1447 route/10271 file/1357 Product JSON-LD, smoke 11×200 + 3 legacy×404; `git diff --check` → PASS.
**Commit:** chưa commit; chưa push/deploy.
**Còn dở / rủi ro:** C1 vẫn **NO-GO production** vì còn 4621 chuỗi cần dịch; English remainder còn 4416 chuỗi và gate fail-mode chỉ bật khi coverage đạt 100%.
**Việc tiếp theo:** C1.3 — dịch review thủ công theo nhóm, bắt đầu từ nhãn `size`, mục tiêu ≥500 mục mới/phiên; sau mỗi lô chạy build/check/inventory.

### 2026-09-14 — Claude — Review C1.2c + lô thử C1.3 của Codex
**Yêu cầu:** Codex báo xong, review lại.
**Đã làm (chỉ review, không sửa code/dữ liệu của Codex):** đọc diff `spec-translation-utils.mjs`, `build-catalog-data.mjs`, inventory, validate, tests; chạy script audit trên `src/data/catalog.generated.json` và `data/spec-translations-vi.json`.
**Kiểm chứng:** gate đầy đủ → audit 0; typecheck PASS; **75/75 tests PASS**; validate:data PASS (1223 / 1551 / 4626; remainder 4365/6078); check:data PASS, checksum `e837f692…` khớp log Codex; build 1452 trang; validate:export 1447 route + smoke PASS. Lô thử C1.3 đã gỡ sạch: từ điển còn 217 dòng / 274 nhãn / 28 ô, 0 target chứa `Npc(s)`.
**Đánh giá:** 5 mục C1.2c có code + test đúng chỗ. Số liệu log khớp. Riêng "dictionary có 276 key" không khớp (thực tế 519 mục).
**Phát hiện:**
1. **Fallback vẫn lọt câu lai:** `needsTranslation` bỏ qua token có dấu, nên chữ `s` số nhiều dính vào từ đã dịch không bị bắt. Generated còn **59** chuỗi kiểu "2 chi tiết lục giács", "7 chi tiết SAE cờ lê kết hợps", "1 chi tiết φ3hex cờ lê", "kìm kẹp khóas". Chỉ số "2103 → 92 dòng lai" của Codex không đo được loại này.
2. **`N pcs → N chi tiết` tự động:** 175 chuỗi generated (không có trong từ điển), vd "1 chi tiết cờ lê", "Sức chứa hộp đạn: 125 chi tiết". Không tự nhiên và trái đặc tả (chiếc/cái/bộ). Nhánh `labels` cũng thay kiểu này.
3. **Allowlist tiếng Việt không dấu chưa đủ → gate cuối không thể PASS:** từ Việt/loanword trong target đã review bị tính là English: `phun`, `ren`, `rung`, `khung`, `chia`, `quay`, `nung`, `xi-lanh`/`xy-lanh`, `poly`, `LED`, `NPT`, `Phillips`, `Pozidriv`, `carbon`, `acrylic`, `niken`… Hệ quả: (a) dòng glossary dịch đủ có các từ này bị trả về tiếng Anh; (b) khi `missing = 0`, lỗi "English remainder" vẫn bật vì chính target review. Ngược lại list có từ trùng tiếng Anh (`the`, `in`, `than`, `go`, `may`), rủi ro thấp.
4. **Glossary `satin finish` vô hiệu:** output "hoàn thiện satin" bị gate coi `satin` là English nên fallback về tiếng Anh. Test mới còn assert "> satin finish" giữ nguyên, tức là test khóa luôn mâu thuẫn này. Cần chọn: allowlist `satin` là từ mượn, hoặc dịch "xước mờ".
5. Nhỏ: assertion `hop` trong test remainder vô nghĩa (`hộp` có dấu nên luôn bị bỏ qua); regex hyphen thứ hai là tập con của regex đầu.
**Commit:** chưa commit.
**Việc tiếp theo:** người dùng chọn giao Codex. Đã viết `docs/prompts/CODEX-CONTINUE.md` v5 với bước **C1.2d** (sửa 1–5, gate target từ điển fail-mode, chỉ số audit trước → sau; chốt giữ "hoàn thiện satin" với `satin` là từ mượn). Đã chạy thử regex token lai: 59 chuỗi generated, 0 false positive, 0 trong target từ điển. Chạy Codex: `Đọc và thực hiện đúng docs/prompts/CODEX-CONTINUE.md`.

### 2026-09-14 — Codex — C1.3 kiểm thử lô nhãn 500 mục
**Yêu cầu:** Tiếp tục theo `CODEX-CONTINUE.md`, bắt đầu C1.3 từ nhãn `size`.
**Đã làm:**
- Thử sinh lô 500 target nhãn đầu tiên, giữ số/mã/đơn vị và chạy gate build.
- Audit snapshot phát hiện nhiều câu lai kỹ thuật do các nhãn dài/typo chưa có bản dịch review; đã loại toàn bộ lô thử bằng `apply_patch`, không giữ bản dịch kém chất lượng.
- Trạng thái dữ liệu quay về đúng snapshot C1.2c; không có mục dictionary mới được ghi nhận trong lô này.
**Kiểm chứng:** `npm test` → **75/75 PASS**; `npm run check:data` → PASS, checksum `e837f69277fbae44719203ca72d37b353bfe80021823c61a60ff32adba96e088`; `npm run validate:data` → PASS, coverage **1223 / 1551 / 4626**, English remainder **4365 chuỗi/6078 occurrences**; `git diff --check` → PASS.
**Commit:** chưa commit; chưa push/deploy.
**Còn dở / rủi ro:** C1.3 chưa đạt mục tiêu ≥500 mục mới; cần dịch review thủ công theo nhóm, không dùng lô sinh tự động tạo câu lai.
**Việc tiếp theo:** dịch nhóm nhãn đơn giản bắt đầu từ `size`, `material`, `including`, `working pressure`; sau mỗi lô build/check/inventory và audit output.

### 2026-09-14 — Codex — C1.2c sửa lỗi review lần 2
**Yêu cầu:** Đọc và thực hiện đúng `docs/prompts/CODEX-CONTINUE.md`; hoàn tất C1.2c trước khi dịch lô C1.3.
**Đã làm:**
- Thêm gate từ điển: target có ký tự tiếng Việt không được chứa `Npcs/Npc`; sửa đủ **19** target (dùng `chiếc/cái/bộ`), không ảnh hưởng mã vật liệu `PC`.
- Bỏ `collectVietnameseWords`; remainder chỉ dùng allowlist tường minh và `VIETNAMESE_ASCII_WORDS`; thêm test để `satin` vẫn được báo, còn `hộp` không bị báo.
- Sửa nhận diện token mã có gạch nối: `2Tx3M-Green` cần dịch; `GP20V`, `M14`, `ABC-2`, `40Cr`, `Cr-V` không cần dịch.
- Sửa fallback dòng spec: bản dịch tự động còn tiếng Anh trả nguyên văn nguồn, không tạo câu lai; fallback ô bảng giữ nguyên để bảo toàn header.
- Thêm glossary `satin finish` và `stain finish` → `hoàn thiện satin`, cập nhật target reviewed và test.
**Coverage trước → sau:**
- Tổng: **1276 / 1646 / 4478 → 1223 / 1551 / 4626** (translated / notNeeded / missing).
- Dòng: **1248 / 265 / 4243 → 1195 / 259 / 4302**; ô bảng: **28 / 1381 / 235 → 28 / 1292 / 324**.
- Nhãn: **794 thiếu → 755 thiếu**; dictionary có 276 key sau kiểm tra. Không thêm lô dịch mới; đây là 19 hiệu chỉnh target + 2 thuật ngữ glossary.
**Kiểm chứng:** `node --test` → **75/75 PASS**; `npm audit --audit-level=high` → 0 vulnerabilities; `npm run typecheck` → PASS; `npm run build:data` → PASS (1357 SP/30 danh mục/1720 ảnh, checksum `e837f69277fbae44719203ca72d37b353bfe80021823c61a60ff32adba96e088`); `npm run check:data` → PASS; `npm run validate:data` → PASS; `npm run spec:inventory -- --next-batch 20` → 1223/1551/4626, remainder **4365 chuỗi/6078 occurrences** (dòng 4111/5648, ô 254/430); `npm run build` → PASS 1452 trang; `npm run validate:export` → PASS 1447 route/10271 file/1357 Product JSON-LD, smoke 11×200 + 3 legacy×404; `git diff --check` → PASS. Fallback audit theo tiêu chí dòng có dấu tiếng Việt + Latin ≥3 ngoài allowlist: **2103 → 92** dòng lai trong mô phỏng trước/snapshot sau; 451 ví dụ review đã được xử lý theo fallback. Generated còn **0** câu tiếng Việt chứa `Npcs/Npc`.
**Thuật ngữ cần review:** `size`, `material`, `sl`, `including`, `working pressure`, `standard nozzle`, `steel`, `storage temperature`, `stroke`, `torx (with hole)`, `vaccum pressure`, `vacuum pressure`, `viewing area`, `wood`, `working width` và các dòng còn English trong remainder.
**Commit:** chưa commit (chưa được người dùng cho phép); chưa push/deploy.
**Còn dở / rủi ro:** C1 chưa đạt `missing = 0`; English remainder vẫn là REPORT; coverage giảm số translated/notNeeded do token hyphen được phân loại đúng, không phải mất dữ liệu. Không production-ready.
**Việc tiếp theo:** bắt đầu C1.3 bằng lô nhãn từ `size`, mục tiêu tối thiểu 500 mục mới/phiên; sau mỗi lô chạy `build:data` + `check:data` + inventory.

### 2026-09-14 — Claude — Review C1.2b + lô nhãn của Codex
**Yêu cầu:** Kiểm tra phần Codex vừa làm xong.
**Đã làm (chỉ review, không sửa code/dữ liệu của Codex):** đọc diff `spec-translation-utils.mjs`, `build-catalog-data.mjs`, `spec-translation-inventory.mjs`, `validate-catalog.mjs`, tests; soi mẫu `notNeeded`, `labels`, `lines`; kiểm SKU 830912; đếm `pcs` và dòng lai trong generated.
**Kiểm chứng (chạy ngoài sandbox):** audit 0; typecheck PASS; `npm test` 73/73 PASS; validate:data PASS (1276 dịch / 1646 không cần / 4478 thiếu); check:data PASS; build 1452 trang; validate:export + smoke PASS. Số liệu trong entry Codex khớp.
**Đánh giá:** C1.2b đúng đặc tả: allowlist dùng chung, `labels` (ưu tiên `lines` → `labels` → fallback), gate `N pcs` chỉ giữ số (có test), remainder đo trên generated. Mẫu `notNeeded` hợp lệ (`31mm`, `120PSI`, `Ø63x400mm`). Bản dịch nhãn tốt (vd "Rated current" → "Dòng điện định mức"). SKU 830912 đã có "Điện áp định mức", "Độ ồn".
**Phát hiện:**
1. **Log Codex chưa chính xác về `pcs`:** còn **19 bản dịch trong từ điển** chứa `1pc/Npcs` (vd "1pc cờ lê", "1pc sách hướng dẫn", "Bao gồm 1pc lưỡi cưa"), không phải "6 mã PC vật liệu".
2. **Báo cáo English remainder bị lọt từ:** `ignoredWords` gom mọi từ ASCII trong bản dịch tiếng Việt thành danh sách bỏ qua toàn cục → `to`, `an`, `mini`, `satin`, `led`, `con`, `cho`, `pin`, `bar` không bao giờ bị đếm. Gate fail-mode cuối (khi missing = 0) vì vậy yếu hơn. Nên chỉ bỏ qua từ trong allowlist tường minh.
3. Luật "token chữ+số là mã" che chữ tiếng Anh trong token có gạch nối, vd ô `2Tx3M-Green` bị tính "không cần dịch" (ít, nhưng sai).
4. **Fallback regex làm hỏng câu chưa dịch:** 451 dòng lai rác, vd "These face frame bản lềs provide…", "Extra tủ đựng compartments", "makes máy thổi & vacuum". Các dòng này vẫn tính `missing` nên sẽ được dịch, nhưng trạng thái trung gian khó đọc hơn tiếng Anh gốc.
5. Không nhất quán thuật ngữ: "satin finish" → "hoàn thiện satin" nhưng "stain finish" (lỗi chính tả nguồn) → "hoàn thiện mờ".
6. **Khối lượng thực trong phiên:** +46 dòng, +274 nhãn, −92 ô sao y (~320 mục, dưới mục tiêu ≥500). Coverage nhảy 282 → 1276 chủ yếu nhờ nhãn phủ nhiều dòng và phân loại lại `notNeeded`. Còn ~5272 mục (4243 dòng tự do + 794 nhãn + 235 ô) → ước ~16 phiên nếu giữ tốc độ này.
**Commit:** chưa commit (người dùng chọn để Codex sửa trước)
**Việc tiếp theo:** người dùng chọn giao Codex. Đã đưa phát hiện 1–5 vào `docs/prompts/CODEX-CONTINUE.md` v3 thành bước **C1.2c** (có test bắt buộc cho từng mục; fallback chỉ đổi cho dòng spec, không đổi ô bảng để giữ header `MÃ KHO`), làm trước C1.3. Mục tiêu C1.3 đổi thành ≥500 mục mới/phiên, không tính mục phân loại lại.

### 2026-09-14 — Codex — C1.2b + lô nhãn kỹ thuật
**Yêu cầu:** Thực hiện đúng `docs/prompts/CODEX-CONTINUE.md`, làm C1.2b trước rồi tiếp tục C1.3 theo lô.
**Đã làm:**
- Tạo `scripts/spec-translation-utils.mjs` làm module dùng chung cho allowlist, `needsTranslation`, chuẩn hóa nhãn và báo cáo từ tiếng Anh; inventory loại nhóm số đo/mã/đơn vị khỏi `missing` và báo cáo `translated / notNeeded / missing`.
- Thêm `labels` vào `data/spec-translations-vi.json`; builder ưu tiên `lines` → `labels` → fallback cho dạng `Nhãn: số liệu`; cập nhật schema validation và `docs/data-model.md`.
- Sửa `numericTokens` để `N pc(s)` chỉ yêu cầu giữ số, cho phép dịch thành `chiếc/cái/bộ`; thêm test cho `2pcs`, `100pcs`, mất số liệu và nhãn.
- English remainder chuyển sang đo trên `src/data/catalog.generated.json`, có top 20 từ còn sót; placeholder vẫn bằng 0.
- Thêm lô nhãn kỹ thuật lớn và xóa các mục từ điển là bản sao y nguồn; effective coverage tăng **282 → 446 → 1276**. Trạng thái cuối: **1276 translated / 1646 notNeeded / 4478 missing**; thiếu 4243 dòng, 235 ô bảng, 794 nhãn. Dịch bổ sung 48 dòng có `pc/pcs` thành lượng từ tiếng Việt; còn 6 mã `PC` vật liệu, không phải đơn vị số lượng.
**Kiểm chứng:** `npm test` → **73/73 PASS**; `npm run build:data` → PASS; `npm run check:data` → PASS; `npm run validate:data` → PASS; `npm run spec:inventory` → 7400 chuỗi, 1276/1646/4478, English remainder generated 4089 chuỗi/5504 occurrences (dòng 3874/5079, ô 215/425); `npm run typecheck` → PASS; `npm run build` → PASS 1452 trang; `node scripts/validate-static-export.mjs` → PASS 1447 route/10271 file/1357 JSON-LD; `npm run validate:export` → PASS (11 route HTTP 200, 3 legacy route HTTP 404); `npm audit --audit-level=high` → 0 lỗ hổng; `git diff --check` → PASS.
**Thuật ngữ cần review:** `sl`, `vaccum pressure`, `torx (with hole)`, `standard nozzle`, `storage temperature`, `table diameter`, và các dòng tự do còn English trong báo cáo remainder.
**Commit:** chưa commit
**Còn dở / rủi ro:** C1 chưa đạt `missing = 0`; 4478 chuỗi còn thiếu nên vẫn **NO-GO production**. Một số fallback còn câu lai; 6 chuỗi `PC` là mã vật liệu, không phải đơn vị số lượng.
**Việc tiếp theo:** tiếp tục batch nhãn bắt đầu từ `size`, sau đó dòng tự do; mỗi lô chạy `build:data` + `check:data` + inventory.

### 2026-09-14 — Claude — Commit checkpoint C1 + prompt Codex v2
**Yêu cầu:** Làm cả hai: commit checkpoint hạ tầng C1 và cập nhật prompt Codex theo phát hiện review.
**Đã làm:**
- Xác nhận Codex không còn ghi file (file cuối sửa 13:46, trạng thái trùng lúc chạy gate), rồi commit toàn bộ thay đổi C1 của Codex + entry review.
- Viết lại `docs/prompts/CODEX-CONTINUE.md` (v2): baseline mới (`a40cff1`, 68 tests, test smoke `EPERM` trong sandbox không phải regression); C1.1/C1.2 đánh dấu xong; thêm **C1.2b** làm trước khi dịch tiếp: (1) `needsTranslation` + allowlist dùng chung, loại ô chỉ có số/đơn vị khỏi `missing`; (2) mục `labels` cho dòng `Nhãn: số liệu` (692 nhãn phủ ~1317 dòng); (3) gate số liệu coi `N pcs` ≈ số N để dịch thành lượng từ tiếng Việt; (4) báo cáo English remainder dựa trên output generated. C1.3: mục tiêu ≥500 chuỗi/nhãn mỗi phiên, ưu tiên nhãn → dòng tự do → ô bảng; cấm dòng lai và `pcs` trong câu tiếng Việt.
**Kiểm chứng:** trước commit `npm run check:data` PASS; các gate đầy đủ đã chạy lúc review trên cùng trạng thái (68/68 tests, build, validate:export PASS).
**Commit:** `a40cff1` feat(data): add reviewed spec translation pipeline (C1 checkpoint); prompt v2 + entry này ở commit kế tiếp.
**Việc tiếp theo:** chạy Codex với prompt v2, bắt đầu C1.2b.

### 2026-09-14 — Claude — Review tiến độ C1 của Codex
**Yêu cầu:** Review xem Codex làm tới đâu.
**Đã làm (chỉ review, không sửa code của Codex):**
- Đọc diff: `build-catalog-data.mjs` (tra từ điển trước, bỏ placeholder, gate bảo toàn số liệu cho dòng + ô bảng), `validate-catalog.mjs` (fail khi generated còn placeholder, báo coverage), `spec-translation-inventory.mjs` + test, `catalog.ts` (bỏ placeholder ở fallback). Thiết kế đúng đặc tả C1.1/C1.2.
- Soi mẫu bản dịch: chất lượng tốt, số liệu giữ đúng; `STOCK NO.` → `MÃ KHO` khớp nhận diện header bảng Phase 11.
**Kiểm chứng:** audit 0; typecheck PASS; `npm test` 68/68 PASS; validate:data PASS (coverage 282/7400); check:data PASS; build 1452 trang; validate:export + smoke PASS; placeholder trong generated = 0.
**Phát hiện:**
1. **Tiến độ chậm:** 2 phiên được 282/7400 (3,8%, ~141 chuỗi/phiên, dưới mức 150–250 của prompt). Giữ tốc độ này thì cần ~50 phiên.
2. **Trạng thái trung gian hiện ra nhiều tiếng Anh hơn:** placeholder đã bỏ nên dòng chưa dịch hiển thị nguyên tiếng Anh hoặc lai (vd SKU 830912: "Rated Điện áp: 220V", "Noise: 88db", "Suitable for workshop use."). Không mất thông tin nữa, nhưng không được release khi chưa xong.
3. **Inventory tính dư:** 805/1524 ô thiếu chỉ là số + đơn vị (vd `11mm`), không cần dịch; 94 mục trong từ điển là bản sao y nguồn. Coverage thật cần loại nhóm này.
4. **Đòn bẩy chưa dùng:** 1317 dòng thiếu có dạng "Nhãn: số liệu" với chỉ 692 nhãn khác nhau (top: input power 52, size 35, rated current 28). Từ điển nhãn + gate số liệu sẽ phủ nhanh.
5. **Gate số liệu ép giữ `pc/pcs`** → câu kém tự nhiên ("Kèm 2pcs bộ pin", "100pcs trong một túi"). Nên coi `N pc(s)` tương đương `N chiếc/cái/bộ`.
6. Regex `englishRemainder` bỏ sót từ phổ biến (`rated`, `noise`, `air`) → báo cáo English remainder thấp hơn thực tế.
**Commit:** checkpoint hạ tầng C1 + 282 bản dịch: `a40cff1` (người dùng đồng ý)
**Việc tiếp theo:** cập nhật prompt Codex (xem entry trên).

### 2026-09-14 — Codex — C1 lô dịch tiếp theo
**Yêu cầu:** Tiếp tục dịch thông số kỹ thuật sản phẩm theo checkpoint C1.
**Đã làm:**
- Dịch thêm các nhãn kích thước/màu sắc/đóng gói và tính năng có nghĩa rõ ràng trong `data/spec-translations-vi.json`; giữ nguyên mã model, số đo, tiêu chuẩn và đơn vị.
- Coverage tăng từ 141 lên **282/7400 chuỗi**; số thiếu giảm còn 7118 (5594 dòng + 1524 ô bảng).
**Kiểm chứng:** `npm run spec:inventory -- --next-batch 20` → 282 đã dịch, lô kế tiếp bắt đầu `GRIT`; `npm run build:data` → PASS 1357 SP/30 danh mục/1720 ảnh; `npm run check:data` → PASS; `npm run validate:data` → PASS, English remainder 2605 chuỗi/3503 occurrences; `npm run typecheck` → PASS; test C1 → 9/9 PASS; `npm run build` → PASS 1452 trang; `node scripts/validate-static-export.mjs` → PASS 1447 route/10271 file/1357 JSON-LD.
**Thuật ngữ cần review:** `GRIT`, `Skin card`, `Non-Ferrous-Alloy`, `Reverse Rotation Auto Stop Mode` và các mục kỹ thuật còn lại trong batch.
**Commit:** chưa commit
**Còn dở / rủi ro:** 7118 chuỗi chưa có bản dịch review; chưa đạt 100% coverage nên vẫn NO-GO production.
**Việc tiếp theo:** tiếp tục batch từ `GRIT`, ưu tiên khoảng 150–250 chuỗi; chạy lại inventory và các gate sau batch.

### 2026-09-14 — Codex — C1.1/C1.2 và lô dịch spec đầu tiên
**Yêu cầu:** Đọc prompt tiếp nhận và tiếp tục xử lý blocker dịch thông số kỹ thuật sản phẩm.
**Đã làm:**
- Xuất `parseLegacySpec` và `normalizedSpecText` dùng chung; thêm `scripts/spec-translation-inventory.mjs` + `npm run spec:inventory` để kiểm kê theo tần suất và lấy batch kế tiếp.
- Thêm `data/spec-translations-vi.json`, tích hợp tra từ điển khớp chính xác trước fallback; fallback giữ nội dung nguồn, không sinh placeholder.
- Thêm gate không cho mất token số/đơn vị ở spec và ô bảng; `validate:data` fail nếu generated snapshot còn placeholder. Cập nhật runtime fallback và tài liệu data model.
- Dịch/chuẩn hóa lô đầu: 141/7400 chuỗi (coverage trước → sau: 0 → 141; 5756 dòng, 1644 ô bảng được inventory).
**Kiểm chứng:** `npm run spec:inventory -- --next-batch 10` → 141 đã dịch, 7259 thiếu; `npm run build:data` → PASS 1357 SP/30 danh mục/1720 ảnh; `npm run check:data` → PASS; `npm run validate:data` → PASS, báo English remainder 2658 chuỗi/3856 occurrences; `npm run typecheck` → PASS; test hẹp → 9/9 PASS; `npm run build` → PASS 1452 trang; `npm run validate:export` → static export PASS (1447 route/10271 file/1357 JSON-LD), smoke server fail `EPERM`; `npm test` → 66/68 PASS, 2 test mở localhost fail `EPERM` do sandbox.
**Thuật ngữ cần review:** `Drop forged special tool steel`, `Chemically molybdenum`, `blow mould case`, `Non-Ferrous-Alloy` và các nhãn bảng hỗn hợp còn tiếng Anh.
**Commit:** chưa commit
**Còn dở / rủi ro:** 7259 chuỗi chưa có bản dịch review; generated snapshot hiện giữ nguyên tiếng Anh ở fallback để không mất dữ liệu. Chưa đạt tiêu chí 100% coverage.
**Việc tiếp theo:** chạy lô kế tiếp từ `10 boxes`, ưu tiên khoảng 150–250 chuỗi theo `--next-batch 220`; sau mỗi lô chạy inventory + gate số liệu.

### 2026-09-14 — Claude — Viết prompt tiếp nhận cho Codex
**Yêu cầu:** Viết prompt để Codex vào vẫn hiểu dự án và xử lý việc tiếp theo.
**Đã làm:**
- Tạo `docs/prompts/CODEX-CONTINUE.md`: thứ tự nạp ngữ cảnh, baseline cần xác nhận, quy tắc cấm, đặc tả C1 (inventory → từ điển `data/spec-translations-vi.json` + gate → dịch theo lô → kiểm chứng), bảng việc ngoài phạm vi (D1–D3, R1–R2, P1–P2), cách báo cáo vào WORKLOG.
- Đo khối lượng C1: ~5754 dòng spec nguồn không trùng (~189 nghìn ký tự), ~1644 ô bảng có chữ (ước lượng bằng tách HTML đơn giản; Codex phải đo lại bằng `parseLegacySpec`).
**Kiểm chứng:** đối chiếu nguồn SKU 830912 trong `data/products.json` khớp ví dụ trong prompt.
**Commit:** cùng commit với entry này
**Việc tiếp theo:** người dùng chạy Codex với prompt; Codex bắt đầu C1.1.

### 2026-09-14 — Claude — Tạo WORKLOG.md
**Yêu cầu:** Tạo một file .md để mọi lần làm việc đều ghi lại, AI khác tiếp nhận vẫn hiểu.
**Đã làm:**
- Tạo `WORKLOG.md` (quy tắc, tổng quan, trạng thái, việc mở, bản đồ tài liệu, bẫy, nhật ký). Ghi bù lịch sử từ git log, `CODEX-HANDOFF.md` và `.hermes/plans`.
- Thêm chỉ dẫn "đọc và cập nhật WORKLOG.md" vào đầu `AGENTS.md`; tạo `CLAUDE.md` trỏ về các file này.
**Kiểm chứng:** đối chiếu `git log` của `main` và `payload-r1`, `git merge-base` = `6622c73`.
**Commit:** cùng commit với file này
**Việc tiếp theo:** chờ người dùng quyết định C1, D1–D3.

### 2026-09-14 — Claude — Phase 10 (CI/release) + Phase 11 (nghiệm thu)
**Yêu cầu:** Hoàn thành Phase 10 và 11, mở site để review.
**Đã làm:**
- Phase 10: rà và xác nhận CI `.github/workflows/ci.yml`, `scripts/package-release.mjs`, `tests/release-artifact.test.mjs`, `RELEASE-CHECKLIST.md`; thêm `release/`, `.hermes/worktrees/`, `.hermes/xlsx-venv/` vào `.gitignore`.
- Phase 11: Lighthouse 5 trang × mobile/desktop; chụp full-page so sánh với wokintools.com (puppeteer-core từ Lighthouse, trong scratchpad).
- Sửa: ảnh LCP sản phẩm bị lazy; hero/banner/card danh mục dùng WebP (`src/components/ResponsiveBackground.tsx` mới); trang chủ chỉ 1 `h1`; `<th>` cho bảng đóng gói; tỉ lệ logo; alt/aria-label card; `--text` #767676. Phát hiện và sửa lỗi tự gây ra: `<picture>` đẩy chữ hero ra ngoài khung (thêm `.responsive-product-picture-fill`).
- Phát hiện blocker C1 (spec) và các khác biệt D1–D3.
**Kiểm chứng:** audit 0; typecheck OK; 65 tests PASS; build 1452 trang; validate:export PASS; release SHA256SUMS OK, archive giống nhau qua 2 lần đóng gói. Lighthouse sau sửa: desktop Perf 98–100, A11y 96–100, BP 100, SEO 100; mobile Perf 78–87.
**Commit:** `5806d8e` ci: add release pipeline and deterministic Hostinger pack · `30443e5` fix: resolve Phase 11 LCP, heading, and a11y audit findings
**Còn dở / rủi ro:** C1, D1–D3, R1, R2 (mục 3). Số đo mobile lấy trên server không nén.
**Việc tiếp theo:** người dùng review tại `http://localhost:4173`, quyết định hướng xử lý.

### 2026-08-29 — Hermes/Codex — Payload: ổn định admin + PO go-live backlog (ghi bù từ tài liệu)
**Đã làm (theo tài liệu, chưa kiểm lại):** kế hoạch sửa ổn định admin (Release Center identity, `validate:release`, icon a11y); lập backlog go-live P0-x; UX kiểu WordPress cho admin.
**Kiểm chứng (theo tài liệu):** admin 122/122 tests, typecheck/build PASS; `operations-readiness` = `ready=false` (`dependency_risk_open`). Admin UX **NOT ACCEPTED** (lỗi overlay Product Editor desktop, P0-5-R).
**Commit:** chưa commit (~36 file sửa trong worktree).
**Nguồn:** `.hermes/worktrees/payload-r1/.hermes/plans/2026-08-29_*.md`

### 2026-08-28 — Hermes/Codex — Payload CMS R1–R5 (nhánh `checkpoint/payload-r1-r4-1`)
**Đã làm:** nền tảng Payload + PostgreSQL + RBAC + audit; product list triage; product editor; workflow review/approve; redirects; publishing gate + internal preview; pipeline catalog snapshot bất biến cho public site. Lập roadmap admin UX UX-0 → UX-9.
**Commit:** `01c3fc8` → `50c211f` (11 commit, chưa merge `main`)

### 2026-08-27 — Hermes điều phối Codex — Phase 0–9 site public
**Đã làm:** checkpoint catalog (P0); quality gates (P1); nâng Next 15.5.24, audit 0 (P2); render spec an toàn + JSON-LD + `.htaccess` headers (P3); route VI canonical + 301 (P4); metadata sản phẩm unique (P5); pipeline dữ liệu có validate (P6); tắt form liên hệ, không thu PII (P7); search lazy-load + ảnh WebP responsive (P8); a11y bàn phím/dialog/carousel (P9). Lập roadmap Payload CMS.
**Commit:** `50aa1b5` → `6622c73`
**Chi tiết:** `CODEX-HANDOFF.md`

### 2026-08-26 — (chưa rõ agent) — Khởi tạo
**Đã làm:** nghiên cứu site gốc, trích dữ liệu 1.357 SP / 30 danh mục, tải ảnh, dịch tên + slug VI, glossary, reference HTML, dựng bản Next.js đầu tiên.
**Commit:** `9be51a9` Initial commit
