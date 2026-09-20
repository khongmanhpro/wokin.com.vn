import type { AdminViewServerProps } from 'payload'

import { hasCapability, isActiveAdmin, type Role } from '../access/hasCapability'
import { changedFieldNames, reviewActions, reviewQueueView, reviewQueueViews, reviewQueueWhere, type ReviewQueueIdentity, type ReviewQueueRequest } from '../lib/reviewQueue'
import { workspacePage } from '../lib/workspacePagination'
import { ReviewRequestCard } from './ReviewRequestCard'
import { WokinEmptyState } from './WokinEmptyState'
import { WokinErrorState } from './WokinErrorState'

type RawDocument = Record<string, unknown>
type ReviewQueueProps = Pick<AdminViewServerProps, 'initPageResult' | 'payload' | 'searchParams'>

function identity(value: unknown): ReviewQueueIdentity | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as RawDocument
  return typeof record.id === 'string' ? { email: typeof record.email === 'string' ? record.email : undefined, id: record.id, role: record.role as Role | undefined } : undefined
}

function requestFromDocument(document: RawDocument): ReviewQueueRequest {
  const product = document.product && typeof document.product === 'object' ? document.product as RawDocument : undefined
  return {
    comment: typeof document.comment === 'string' ? document.comment : 'Không có ghi chú.',
    createdAt: typeof document.createdAt === 'string' ? document.createdAt : undefined,
    id: String(document.id),
    product: product && typeof product.id === 'string' ? { id: product.id, nameVi: typeof product.nameVi === 'string' ? product.nameVi : undefined, sku: typeof product.sku === 'string' ? product.sku : undefined, status: typeof product.status === 'string' ? product.status : undefined } : undefined,
    requester: identity(document.requester),
    resolvedAt: typeof document.resolvedAt === 'string' ? document.resolvedAt : undefined,
    resolution: typeof document.resolution === 'string' ? document.resolution : undefined,
    reviewer: identity(document.reviewer),
    state: document.state === 'resolved' ? 'resolved' : 'open',
    updatedAt: typeof document.updatedAt === 'string' ? document.updatedAt : undefined,
  }
}

function auditSummaries(events: RawDocument[]): Map<string, string[]> {
  const summaries = new Map<string, string[]>()
  for (const event of events) {
    const id = typeof event.entityId === 'string' ? event.entityId : undefined
    if (!id || summaries.has(id)) continue
    summaries.set(id, changedFieldNames(event.before, event.after))
  }
  return summaries
}

export async function ReviewQueue({ initPageResult, payload, searchParams }: ReviewQueueProps) {
  const actor = initPageResult.req.user as { active?: boolean; id?: string; role?: Role } | undefined
  if (!actor?.id || !isActiveAdmin(actor)) return <WokinErrorState title="Không thể tải hàng chờ" description="Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại để tiếp tục." />
  const activeActor = actor as { active: true; id: string; role: Role }

  const view = reviewQueueView(typeof searchParams?.view === 'string' ? searchParams.view : undefined)
  const page = workspacePage(searchParams?.page)
  const query = typeof searchParams?.q === 'string' ? searchParams.q.trim() : ''
  const sort = searchParams?.sort === 'createdAt' ? 'createdAt' : '-createdAt'
  const pageURL = (next: number) => `/admin/collections/review-requests/queue?${new URLSearchParams({ view, q: query, sort, page: String(next) })}`
  try {
    const result = await payload.find({ collection: 'review-requests', depth: 1, limit: 25, page, overrideAccess: false, sort: [sort, 'id'], user: activeActor as never, where: reviewQueueWhere(activeActor.id, view, query) })
    const visible = (result.docs as unknown as RawDocument[]).map(requestFromDocument)
    const productIds = [...new Set(visible.flatMap((request) => request.product?.id ? [request.product.id] : []))]
    const canReadHistory = hasCapability(activeActor, 'audit.read')
    const histories = canReadHistory ? await Promise.all(productIds.map((id) => payload.find({ collection: 'audit-events', depth: 0, limit: 1, overrideAccess: false, sort: ['-occurredAt', 'id'], user: activeActor as never, where: { and: [{ entityType: { equals: 'products' } }, { entityId: { equals: id } }] } }))) : []
    const summaries = auditSummaries(histories.flatMap(({ docs }) => docs) as unknown as RawDocument[])

    return <section className="wokin-review-queue" aria-labelledby="review-queue-heading">
      <header><p className="wokin-nav__label">Biên tập</p><h1 id="review-queue-heading">Hàng chờ rà soát</h1><p>Mở yêu cầu để kiểm tra nội dung, phản hồi hoặc duyệt theo quyền được cấp.</p></header>
      <nav className="wokin-review-queue__tabs" aria-label="Nhóm hàng chờ">{reviewQueueViews.map((item) => <a aria-current={view === item.key ? 'page' : undefined} href={`/admin/collections/review-requests/queue?view=${item.key}`} key={item.key}>{item.label}</a>)}</nav>
      <form className="wokin-workspace__filters" method="get"><input type="hidden" name="view" value={view} /><label>Tìm tên, SKU hoặc ghi chú<input name="q" defaultValue={query} /></label><label>Sắp xếp<select name="sort" defaultValue={sort}><option value="-createdAt">Mới nhất</option><option value="createdAt">Cũ nhất</option></select></label><button type="submit">Tìm kiếm</button></form>
      {visible.length === 0
        ? <WokinEmptyState title="Không có yêu cầu cần xử lý" description={`Nhóm “${reviewQueueViews.find((item) => item.key === view)?.label}” hiện chưa có yêu cầu nào.`} />
        : <div className="wokin-review-queue__cards">{visible.map((request) => <ReviewRequestCard actions={reviewActions(request, { id: activeActor.id, role: activeActor.role })} changedFields={request.product ? summaries.get(request.product.id) || [] : []} historyUnavailable={!canReadHistory} key={request.id} request={request} />)}</div>}
      <nav className="wokin-pagination" aria-label="Phân trang yêu cầu">{page > 1 && <a href={pageURL(page - 1)}>Trang trước</a>}<span>Trang {page} / {Math.max(1, result.totalPages ?? 1)} · {result.totalDocs ?? 0} yêu cầu</span>{result.hasNextPage && <a href={pageURL(page + 1)}>Trang sau</a>}{page > (result.totalPages || 1) && <a href={pageURL(result.totalPages || 1)}>Về trang cuối có dữ liệu</a>}</nav>
    </section>
  } catch {
    return <WokinErrorState title="Không thể tải hàng chờ rà soát" description="Hãy làm mới trang; nếu lỗi tiếp diễn, liên hệ quản trị hệ thống." />
  }
}
