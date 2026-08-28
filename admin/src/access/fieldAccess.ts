import type { FieldAccess } from 'payload'

import { hasAnyCapability, hasCapability, isActiveAdmin } from './hasCapability'
import { isSeparationOfDutiesEnabled } from './productPolicy'

function requestedStatus(args: Parameters<FieldAccess>[0]): unknown {
  return args.siblingData?.status ?? args.data?.status
}

export const canManageAdminSecurityFields: FieldAccess = ({ req }) => hasCapability(req.user, 'user.manage')

export const canChangeProductContent: FieldAccess = ({ req }) => {
  if (!isActiveAdmin(req.user)) return false
  if (isSeparationOfDutiesEnabled(req) && req.user.role === 'publisher') return false
  return hasCapability(req.user, 'product.update')
}

export const canChangeProductSEO: FieldAccess = ({ req }) => {
  return hasAnyCapability(req.user, ['product.update', 'seo.review'])
}

export const canChangeProductStatus: FieldAccess = (args) => {
  const { req } = args
  if (!isActiveAdmin(req.user)) return false

  const status = requestedStatus(args)
  if (status === 'published' || status === 'archived') return hasCapability(req.user, 'product.publish')
  if (status === 'approved' || status === 'changes_requested') return hasCapability(req.user, 'product.review')
  return hasAnyCapability(req.user, ['product.update', 'product.review'])
}
