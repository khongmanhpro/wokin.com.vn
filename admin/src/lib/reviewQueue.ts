import { hasCapability, type Role } from '../access/hasCapability'
import type { Where } from 'payload'

export type ReviewQueueView = 'assigned' | 'requested' | 'changes' | 'completed'
export type ReviewState = 'open' | 'resolved'

export type ReviewQueueIdentity = { id: string; email?: string; role?: Role }
export type ReviewQueueProduct = { id: string; nameVi?: string; sku?: string; status?: string }
export type ReviewQueueRequest = {
  id: string
  comment: string
  createdAt?: string
  updatedAt?: string
  state: ReviewState
  requester?: ReviewQueueIdentity
  reviewer?: ReviewQueueIdentity
  product?: ReviewQueueProduct
  resolution?: string
  resolvedAt?: string
}

export type ReviewAction = 'open_product' | 'request_changes' | 'approve_resolve' | 'view_history'

export const reviewQueueViews: Array<{ key: ReviewQueueView; label: string }> = [
  { key: 'assigned', label: 'Chờ tôi xử lý' },
  { key: 'requested', label: 'Tôi đã gửi' },
  { key: 'changes', label: 'Cần sửa' },
  { key: 'completed', label: 'Đã hoàn tất' },
]

export function reviewStatusLabel(state: unknown): string {
  return state === 'resolved' ? 'Đã hoàn tất' : 'Đang chờ xử lý'
}

export function reviewQueueView(value: unknown): ReviewQueueView {
  return reviewQueueViews.some(({ key }) => key === value) ? value as ReviewQueueView : 'assigned'
}

export function reviewQueueWhere(userID: string, view: ReviewQueueView, query = ''): Where {
  const conditions: Where[] = view === 'assigned'
    ? [{ state: { equals: 'open' } }, { reviewer: { equals: userID } }]
    : view === 'requested' ? [{ requester: { equals: userID } }]
      : view === 'changes' ? [{ state: { equals: 'open' } }, { 'product.status': { equals: 'changes_requested' } }]
        : [{ state: { equals: 'resolved' } }]
  if (query.trim()) conditions.push({ or: [
    { 'product.nameVi': { contains: query.trim() } },
    { 'product.sku': { contains: query.trim() } },
    { comment: { contains: query.trim() } },
  ] })
  return { and: conditions }
}

export function queueRequests(requests: ReviewQueueRequest[], user: ReviewQueueIdentity, view: ReviewQueueView): ReviewQueueRequest[] {
  return requests.filter((request) => {
    if (view === 'assigned') return request.state === 'open' && request.reviewer?.id === user.id
    if (view === 'requested') return request.requester?.id === user.id
    if (view === 'changes') return request.state === 'open' && request.product?.status === 'changes_requested'
    return request.state === 'resolved'
  })
}

export function reviewActions(request: ReviewQueueRequest, user: ReviewQueueIdentity): ReviewAction[] {
  const actions: ReviewAction[] = []
  if (request.product?.id) actions.push('open_product')

  const canResolve = request.state === 'open'
    && (request.reviewer?.id === user.id || hasCapability({ active: true, role: user.role }, 'user.manage'))
  const canReviewProduct = request.product?.status === 'in_review' && hasCapability({ active: true, role: user.role }, 'product.review')
  if (canResolve && canReviewProduct) actions.push('request_changes', 'approve_resolve')
  if (hasCapability({ active: true, role: user.role }, 'audit.read')) actions.push('view_history')
  return actions
}

export function changedFieldNames(before: unknown, after: unknown): string[] {
  const previous = before && typeof before === 'object' ? before as Record<string, unknown> : {}
  const next = after && typeof after === 'object' ? after as Record<string, unknown> : {}
  return [...new Set([...Object.keys(previous), ...Object.keys(next)])]
    .filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]))
    .filter((key) => !['id', 'createdAt', 'updatedAt'].includes(key))
    .slice(0, 8)
}
