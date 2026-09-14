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

_Cập nhật: 2026-09-14 bởi Codex_

- **Nhánh `main`:** Phase 0–11 đã commit; prompt tiếp nhận ở `98e8d3b`. Thay đổi C1 hiện chưa commit.
- **Gate (Claude chạy lại ngoài sandbox, 2026-09-14):** audit 0, typecheck PASS, **68/68 tests PASS**, validate:data/check:data PASS, build 1452 trang, validate:export + smoke PASS. (`EPERM` trong log Codex là do sandbox của Codex.)
- **Kết luận nghiệm thu:** **NO-GO production.** Kỹ thuật đạt; nội dung spec đang được dịch theo lô và các quyết định giao diện vẫn chờ (xem mục 3).
- **Payload CMS worktree:** 11 commit trên nhánh riêng + ~36 file sửa chưa commit. Admin UX **chưa được nghiệm thu**. Chưa merge vào `main`.
- **Chưa push, chưa deploy** bất cứ thứ gì.

---

## 3. Việc mở / chờ quyết định

| ID | Việc | Trạng thái | Chờ ai | Ghi chú |
|---|---|---|---|---|
| C1 | Dịch lại spec sản phẩm: đã thêm inventory + từ điển review + gate bảo toàn số liệu; coverage hiện 282/7400 chuỗi. Còn 7118 chuỗi thiếu (5594 dòng + 1524 ô bảng) | **Blocker**, đang làm theo lô | Codex | `npm run spec:inventory -- --next-batch 220`; lô kế tiếp bắt đầu `GRIT`. Placeholder generated = 0; 10011 dòng vẫn giữ đủ |
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
**Commit:** chưa commit (thay đổi C1 của Codex vẫn chưa commit)
**Việc tiếp theo:** chờ người dùng quyết định có cập nhật prompt Codex theo phát hiện 3–6 hay không, và có commit checkpoint hạ tầng C1 không.

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
