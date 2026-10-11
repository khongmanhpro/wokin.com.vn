import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { productStatusLabel } from '../lib/productOperations'

import { hasCapability, isActiveAdmin } from './hasCapability'

// Shown to editors as-is (APIError 400), so the admin explains the problem instead of "Something went wrong".
function policyError(message: string): APIError {
  return new APIError(message, 400)
}

const publisherAllowedFields = new Set(['status', 'publishedAt'])
const statusFields = new Set(['status', 'publishedAt'])

type ProductStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'published' | 'archived'

function changedFields(data: Record<string, unknown>, originalDoc?: Record<string, unknown>): string[] {
  return Object.keys(data).filter((key) => !originalDoc || JSON.stringify(data[key]) !== JSON.stringify(originalDoc[key]))
}

function enforceProductStatusTransition(user: unknown, previous: ProductStatus | undefined, next: ProductStatus): void {
  if (!previous) {
    // New products start as drafts, or go live directly for whoever may publish (owner decision 2026-10-11).
    if (next !== 'draft' && !(next === 'published' && hasCapability(user, 'product.publish'))) {
      throw policyError('Không thể chuyển trạng thái: sản phẩm mới chỉ được lưu nháp vì bạn chưa có quyền xuất bản.')
    }
    return
  }
  if (previous === next) return

  const isAllowed = (
    (previous === 'draft' || previous === 'changes_requested') && next === 'in_review' && hasCapability(user, 'product.update')
  ) || (
    previous === 'in_review' && (next === 'approved' || next === 'changes_requested') && hasCapability(user, 'product.review')
  ) || (
    // Owner decision 2026-10-11: whoever may publish posts directly, no second reviewer required.
    previous !== 'archived' && next === 'published' && hasCapability(user, 'product.publish')
  ) || (
    previous === 'published' && (next === 'archived' || next === 'draft') && hasCapability(user, 'product.publish')
  )

  if (!isAllowed) throw policyError(`Không thể chuyển trạng thái từ "${productStatusLabel(previous)}" sang "${productStatusLabel(next)}" với quyền hiện tại.`)
}

export function isSeparationOfDutiesEnabled(req: { context?: Record<string, unknown> }): boolean {
  if (typeof req.context?.separationOfDuties === 'boolean') return req.context.separationOfDuties
  return process.env.PAYLOAD_SEPARATION_OF_DUTIES !== 'false'
}

export const enforceProductMutationPolicy: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  const previousStatus = originalDoc?.status as ProductStatus | undefined
  const nextStatus = (data.status ?? previousStatus ?? 'draft') as ProductStatus

  // Payload's importers intentionally use overrideAccess for trusted maintenance work: they carry the live catalog's
  // own status and publish dates. Network and user-driven Local API requests are stopped by collection access first.
  if (!req.user) return data
  if (!isActiveAdmin(req.user)) throw policyError('Phiên đăng nhập không hợp lệ; hãy đăng nhập lại.')

  const isPublishing = previousStatus !== 'published' && nextStatus === 'published'
  // The admin form always posts publishedAt, empty (null/'') when unset; only a real different date is a change.
  const storedPublishedAt = (originalDoc?.publishedAt as string | null | undefined) || null
  const requestedPublishedAt = data.publishedAt === undefined ? undefined : (data.publishedAt as string | null) || null
  if (requestedPublishedAt === null && storedPublishedAt === null) delete data.publishedAt
  const changesPublishedAt = requestedPublishedAt !== undefined && requestedPublishedAt !== storedPublishedAt
  if (isPublishing) {
    if (changesPublishedAt) throw policyError('Ngày xuất bản do hệ thống tự đặt khi xuất bản.')
    // Re-publishing keeps the first publish date so the product does not jump to "Sản phẩm mới".
    data.publishedAt = (originalDoc?.publishedAt as string | null | undefined) || new Date().toISOString()
  } else if (changesPublishedAt) {
    throw policyError('Ngày xuất bản do hệ thống tự đặt, không sửa tay được.')
  }

  enforceProductStatusTransition(req.user, previousStatus, nextStatus)

  const mutations = changedFields(data as Record<string, unknown>, originalDoc as Record<string, unknown> | undefined)
  if (previousStatus === 'published' && mutations.some((field) => !statusFields.has(field)) && !hasCapability(req.user, 'product.publish')) {
    throw policyError('Sản phẩm đã xuất bản: cần quyền xuất bản để sửa nội dung (hoặc nhờ chủ tài khoản gỡ xuống trước).')
  }

  if (isSeparationOfDutiesEnabled(req) && req.user.role === 'publisher') {
    const publisherChangedFields = Object.keys(data).filter((key) => {
      if (publisherAllowedFields.has(key)) return false
      return !originalDoc || JSON.stringify(data[key]) !== JSON.stringify(originalDoc[key])
    })
    if (publisherChangedFields.length > 0) throw policyError('Vai trò duyệt xuất bản không được sửa nội dung sản phẩm.')
  }

  return data
}
