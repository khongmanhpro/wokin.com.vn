import { hasCapability, type Role } from '../access/hasCapability'

export type ProductWorkflowStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'published' | 'archived'
export type ProductReadiness = 'ready' | 'missing'
export type ProductWorkflowAction = 'save_draft' | 'save' | 'preview' | 'request_review' | 'request_changes' | 'approve' | 'publish' | 'unpublish' | 'archive'

const statusLabels: Record<ProductWorkflowStatus, string> = {
  draft: 'Bản nháp',
  in_review: 'Đang duyệt',
  changes_requested: 'Cần chỉnh sửa',
  approved: 'Đã duyệt',
  published: 'Đã xuất bản',
  archived: 'Đã lưu trữ',
}

function isNonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function hasRelation(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

export function productStatusLabel(status: unknown): string {
  return typeof status === 'string' && status in statusLabels
    ? statusLabels[status as ProductWorkflowStatus]
    : 'Chưa xác định'
}

export function getProductReadiness(product: { media?: unknown; categories?: unknown; seo?: unknown }): { media: ProductReadiness; seo: ProductReadiness } {
  const seo = typeof product.seo === 'object' && product.seo !== null ? product.seo as Record<string, unknown> : {}
  return {
    media: hasRelation(product.media) ? 'ready' : 'missing',
    seo: isNonBlank(seo.title) && isNonBlank(seo.description) && isNonBlank(seo.canonicalPath) && seo.noIndex === false ? 'ready' : 'missing',
  }
}

export function getProductWorkflowActions(role: Role, status: ProductWorkflowStatus): ProductWorkflowAction[] {
  const user = { active: true, role }
  const actions: ProductWorkflowAction[] = ['preview']
  const canPublish = hasCapability(user, 'product.publish')

  if ((status === 'draft' || status === 'changes_requested') && hasCapability(user, 'product.update')) {
    actions.unshift('save_draft')
    // Direct publishing (owner decision 2026-10-11): publishers skip the review request.
    if (!canPublish) actions.push('request_review')
  }
  if (status === 'in_review' && hasCapability(user, 'product.review') && !canPublish) actions.push('request_changes', 'approve')
  if (canPublish && status !== 'published' && status !== 'archived') actions.push('publish')
  if (status === 'published' && canPublish) {
    if (hasCapability(user, 'product.update')) actions.unshift('save')
    actions.push('unpublish', 'archive')
  }

  return actions
}

export const workflowActionLabels: Record<ProductWorkflowAction, string> = {
  save_draft: 'Lưu bản nháp',
  save: 'Lưu thay đổi',
  preview: 'Xem trước',
  request_review: 'Gửi duyệt',
  request_changes: 'Yêu cầu sửa',
  approve: 'Duyệt',
  publish: 'Lưu và xuất bản',
  unpublish: 'Gỡ khỏi website',
  archive: 'Lưu trữ',
}

export const workflowActionTarget: Partial<Record<ProductWorkflowAction, ProductWorkflowStatus>> = {
  request_review: 'in_review',
  request_changes: 'changes_requested',
  approve: 'approved',
  publish: 'published',
  unpublish: 'draft',
  archive: 'archived',
}
