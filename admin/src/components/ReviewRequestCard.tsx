import type { ReviewAction, ReviewQueueRequest } from '../lib/reviewQueue'
import { ProductChangeSummary } from './ProductChangeSummary'
import { ReviewActionBar } from './ReviewActionBar'
import { ReviewStatusBadge } from './ReviewStatusBadge'

function person(person: ReviewQueueRequest['requester']): string {
  return person?.email || person?.id || 'Chưa xác định'
}

function date(value?: string): string {
  return value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có'
}

export function ReviewRequestCard({ actions, changedFields, historyUnavailable, request }: { actions: ReviewAction[]; changedFields: string[]; historyUnavailable?: boolean; request: ReviewQueueRequest }) {
  return <article className="wokin-review-card">
    <header><div><p className="wokin-nav__label">Yêu cầu rà soát</p><h2>{request.product?.nameVi || 'Sản phẩm không còn khả dụng'}</h2><p>SKU: {request.product?.sku || '—'}</p></div><ReviewStatusBadge state={request.state} /></header>
    <dl>
      <div><dt>Người gửi</dt><dd>{person(request.requester)}</dd></div>
      <div><dt>Người duyệt</dt><dd>{person(request.reviewer)}</dd></div>
      <div><dt>Tạo lúc</dt><dd>{date(request.createdAt)}</dd></div>
      <div><dt>Cập nhật</dt><dd>{date(request.updatedAt)}</dd></div>
      {request.resolvedAt && <div><dt>Hoàn tất</dt><dd>{date(request.resolvedAt)}</dd></div>}
    </dl>
    <p className="wokin-review-card__comment"><strong>Ghi chú:</strong> {request.comment}</p>
    {request.resolution && <p className="wokin-review-card__comment"><strong>Kết luận:</strong> {request.resolution}</p>}
    <ProductChangeSummary fields={changedFields} unavailable={historyUnavailable} />
    <ReviewActionBar actions={actions} request={request} />
  </article>
}
