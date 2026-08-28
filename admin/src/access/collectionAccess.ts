import type { Access } from 'payload'

import { hasAnyCapability, hasCapability, isActiveAdmin, type Capability } from './hasCapability'

export const deny: Access = () => false

export const activeAuthenticated: Access = ({ req }) => isActiveAdmin(req.user)

export function requireCapability(capability: Capability): Access {
  return ({ req }) => hasCapability(req.user, capability)
}

export function requireAnyCapability(...capabilities: Capability[]): Access {
  return ({ req }) => hasAnyCapability(req.user, capabilities)
}

export const canCreateProduct = requireCapability('product.create')
export const canUpdateProduct = requireAnyCapability('product.update', 'product.review', 'product.publish', 'seo.review')
export const canDeleteProduct = requireCapability('product.archive')
export const canCreateReviewRequest = requireCapability('product.review')
export const canUpdateReviewRequest = requireCapability('product.review')

export const canManageCategories = requireCapability('category.manage')
export const canUploadMedia = requireCapability('media.upload')
export const canUpdateMedia = requireCapability('media.update')
export const canUpdatePages = requireCapability('page.update')
export const canManageRedirects = requireCapability('redirect.manage')
export const canCreateRelease = requireCapability('release.create')
export const canApproveRelease = requireAnyCapability('release.approve', 'release.rollback')
export const canReadAudit = requireCapability('audit.read')
export const canManageUsers = requireCapability('user.manage')

export const adminsRead: Access = ({ req }) => {
  if (!isActiveAdmin(req.user)) return false
  if (hasCapability(req.user, 'user.manage')) return true
  return { id: { equals: req.user.id } }
}

export const adminsUpdate: Access = ({ id, req }) => {
  if (!isActiveAdmin(req.user)) return false
  return hasCapability(req.user, 'user.manage') || id === req.user.id
}

export const adminsDelete: Access = ({ id, req }) => {
  if (!isActiveAdmin(req.user) || !hasCapability(req.user, 'user.manage')) return false
  return id !== req.user.id
}

export const internalAuditCreate: Access = ({ req }) => {
  return isActiveAdmin(req.user) && req.context?.internalAudit === true
}
