import type { CollectionBeforeChangeHook } from 'payload'

import { hasCapability, isActiveAdmin } from './hasCapability'

const publisherAllowedFields = new Set(['status', 'publishedAt'])
const statusFields = new Set(['status', 'publishedAt'])

type ProductStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'published' | 'archived'

function changedFields(data: Record<string, unknown>, originalDoc?: Record<string, unknown>): string[] {
  return Object.keys(data).filter((key) => !originalDoc || JSON.stringify(data[key]) !== JSON.stringify(originalDoc[key]))
}

function enforceProductStatusTransition(user: unknown, previous: ProductStatus | undefined, next: ProductStatus): void {
  if (!previous) {
    if (next !== 'draft') throw new Error('Invalid product status transition: new products must start as draft')
    return
  }
  if (previous === next) return

  const isAllowed = (
    (previous === 'draft' || previous === 'changes_requested') && next === 'in_review' && hasCapability(user, 'product.update')
  ) || (
    previous === 'in_review' && (next === 'approved' || next === 'changes_requested') && hasCapability(user, 'product.review')
  ) || (
    previous === 'approved' && next === 'published' && hasCapability(user, 'product.publish')
  ) || (
    previous === 'published' && next === 'archived' && hasCapability(user, 'product.publish')
  )

  if (!isAllowed) throw new Error(`Invalid product status transition: ${previous} to ${next}`)
}

export function isSeparationOfDutiesEnabled(req: { context?: Record<string, unknown> }): boolean {
  if (typeof req.context?.separationOfDuties === 'boolean') return req.context.separationOfDuties
  return process.env.PAYLOAD_SEPARATION_OF_DUTIES !== 'false'
}

export const enforceProductMutationPolicy: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  // Payload's R3 importers intentionally use overrideAccess for trusted maintenance work.
  // Network and user-driven Local API requests are stopped by collection access before this hook.
  if (!req.user) return data
  if (!isActiveAdmin(req.user)) throw new Error('Active authentication is required')

  const previousStatus = originalDoc?.status as ProductStatus | undefined
  const nextStatus = (data.status ?? previousStatus ?? 'draft') as ProductStatus
  enforceProductStatusTransition(req.user, previousStatus, nextStatus)

  const mutations = changedFields(data as Record<string, unknown>, originalDoc as Record<string, unknown> | undefined)
  if (previousStatus === 'published' && mutations.some((field) => !statusFields.has(field)) && !hasCapability(req.user, 'product.publish')) {
    throw new Error('Editors cannot modify published product content')
  }

  if (isSeparationOfDutiesEnabled(req) && req.user.role === 'publisher') {
    const publisherChangedFields = Object.keys(data).filter((key) => {
      if (publisherAllowedFields.has(key)) return false
      return !originalDoc || JSON.stringify(data[key]) !== JSON.stringify(originalDoc[key])
    })
    if (publisherChangedFields.length > 0) throw new Error('Publisher cannot modify product content while separation of duties is enabled')
  }

  return data
}
