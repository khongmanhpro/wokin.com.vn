import type { FieldAccess } from 'payload'

import { hasAnyCapability, hasCapability, isActiveAdmin } from './hasCapability'
import { isSeparationOfDutiesEnabled } from './productPolicy'

function requestedStatus(args: Parameters<FieldAccess>[0]): unknown {
  return args.siblingData?.status ?? args.data?.status
}

export function isFirstUserBootstrap(req: { method?: string; routeParams?: { collection?: unknown }; url?: string; user?: unknown }): boolean {
  const method = req.method?.toUpperCase()
  if (req.user || (method !== 'GET' && method !== 'POST') || !req.url) return false

  try {
    const pathname = new URL(req.url).pathname
    // Payload 3.88 renders the form at this route, then submits it to its
    // auth endpoint. The endpoint itself verifies that no user exists.
    return pathname === '/admin/create-first-user'
      || (pathname === '/api/admins/first-register' && req.routeParams?.collection === 'admins')
  } catch {
    return false
  }
}

export const canManageAdminSecurityFields: FieldAccess = ({ req }) => {
  return hasCapability(req.user, 'user.manage') || isFirstUserBootstrap(req)
}

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
