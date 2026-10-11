export type WokinStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export type WokinStatus = {
  label: string
  symbol: '✓' | '!' | 'i' | '•' | '✎'
  tone: WokinStatusTone
}

const statuses: Record<string, WokinStatus> = {
  active: { label: 'Đang hoạt động', symbol: '✓', tone: 'success' },
  approved: { label: 'Đã duyệt', symbol: '✓', tone: 'success' },
  archived: { label: 'Đã lưu trữ', symbol: 'i', tone: 'neutral' },
  changes_requested: { label: 'Cần chỉnh sửa', symbol: '!', tone: 'danger' },
  cleared: { label: 'Đã xác nhận', symbol: '✓', tone: 'success' },
  draft: { label: 'Bản nháp', symbol: '✎', tone: 'neutral' },
  expired: { label: 'Đã hết hạn', symbol: '!', tone: 'danger' },
  failed: { label: 'Thất bại', symbol: '!', tone: 'danger' },
  in_review: { label: 'Đang chờ duyệt', symbol: '!', tone: 'warning' },
  missing: { label: 'Cần bổ sung', symbol: '!', tone: 'danger' },
  open: { label: 'Đang chờ xử lý', symbol: '!', tone: 'warning' },
  pending: { label: 'Chờ xác nhận', symbol: '!', tone: 'warning' },
  published: { label: 'Đã xuất bản', symbol: '✓', tone: 'success' },
  ready: { label: 'Sẵn sàng', symbol: '✓', tone: 'success' },
  released: { label: 'Đã phát hành', symbol: '✓', tone: 'success' },
  resolved: { label: 'Đã hoàn tất', symbol: '✓', tone: 'success' },
  restricted: { label: 'Hạn chế sử dụng', symbol: '!', tone: 'warning' },
  validated: { label: 'Đã xác thực', symbol: '✓', tone: 'success' },
}

export function wokinStatus(value: unknown): WokinStatus {
  return typeof value === 'string' && statuses[value]
    ? statuses[value]
    : { label: 'Chưa xác định', symbol: 'i', tone: 'neutral' }
}

export function WokinStatusBadge({ label, status, tone }: { label?: string; status: unknown; tone?: WokinStatusTone }) {
  const resolved = wokinStatus(status)
  const finalTone = tone ?? resolved.tone
  return <span className={`wokin-status-badge wokin-status-badge--${finalTone}`}>
    <span aria-hidden="true" className="wokin-status-badge__symbol">{resolved.symbol}</span>
    <span>{label ?? resolved.label}</span>
  </span>
}
