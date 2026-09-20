export function ProductChangeSummary({ fields, unavailable = false }: { fields: string[]; unavailable?: boolean }) {
  if (unavailable) return <p className="wokin-review-card__summary">Tóm tắt thay đổi bị giới hạn bởi quyền đọc nhật ký.</p>
  if (!fields.length) return <p className="wokin-review-card__summary">Chưa có thay đổi trường dữ liệu được ghi nhận.</p>
  return <p className="wokin-review-card__summary"><strong>Thay đổi gần nhất:</strong> {fields.join(', ')}</p>
}
