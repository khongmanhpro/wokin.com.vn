import type { CollectionBeforeChangeHook } from 'payload'

import { hasCapability, isActiveAdmin } from './hasCapability'

const publisherAllowedFields = new Set(['status', 'publishedAt'])

export function isSeparationOfDutiesEnabled(req: { context?: Record<string, unknown> }): boolean {
  if (typeof req.context?.separationOfDuties === 'boolean') return req.context.separationOfDuties
  return process.env.PAYLOAD_SEPARATION_OF_DUTIES !== 'false'
}

export const enforceProductMutationPolicy: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  // Payload's R3 importers intentionally use overrideAccess for trusted maintenance work.
  // Network and user-driven Local API requests are stopped by collection access before this hook.
  if (!req.user) return data
  if (!isActiveAdmin(req.user)) throw new Error('Active authentication is required')

  if (data.status === 'published' && !hasCapability(req.user, 'product.publish')) {
    throw new Error('Role is not allowed to set product status to published')
  }

  if (data.status === 'approved' && !hasCapability(req.user, 'product.review')) {
    throw new Error('Role is not allowed to approve products')
  }

  if (isSeparationOfDutiesEnabled(req) && req.user.role === 'publisher') {
    const changedFields = Object.keys(data).filter((key) => {
      if (publisherAllowedFields.has(key)) return false
      return !originalDoc || JSON.stringify(data[key]) !== JSON.stringify(originalDoc[key])
    })
    if (changedFields.length > 0) throw new Error('Publisher cannot modify product content while separation of duties is enabled')
  }

  return data
}
