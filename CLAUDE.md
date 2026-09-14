# CLAUDE.md

1. **Đọc [`WORKLOG.md`](WORKLOG.md) trước tiên**: trạng thái dự án, việc đang mở, bẫy cần tránh, nhật ký.
2. Quy tắc dự án và brief gốc: [`AGENTS.md`](AGENTS.md); design tokens: [`DESIGN.md`](DESIGN.md).
3. **Sau mỗi phiên làm việc** (kể cả chỉ audit/nghiên cứu, không commit): thêm entry trên cùng mục 6 của `WORKLOG.md` theo mẫu, cập nhật mục 2 (Trạng thái) và mục 3 (Việc mở). Nếu có commit, đưa thay đổi `WORKLOG.md` vào cùng commit.
4. Đường dẫn có dấu cách, luôn quote: `"/Volumes/data AI/wokin.com.vn"`.
5. Gate trước khi commit: `npm audit --audit-level=high && npm run typecheck && npm test && npm run validate:data && npm run check:data && npm run build && npm run validate:export`.
