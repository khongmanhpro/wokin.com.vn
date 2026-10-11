export const ROLES = ['owner', 'admin', 'editor', 'seo_reviewer', 'media_manager', 'publisher', 'readonly'] as const

export type Role = (typeof ROLES)[number]

export const CAPABILITIES = [
  'product.read',
  'product.create',
  'product.update',
  'product.archive',
  'product.review',
  'product.publish',
  'category.manage',
  'media.upload',
  'media.update',
  'page.update',
  'seo.review',
  'redirect.manage',
  'release.create',
  'release.approve',
  'release.rollback',
  'user.manage',
  'settings.manage',
  'audit.read',
] as const

export type Capability = (typeof CAPABILITIES)[number]

const allCapabilities = new Set<Capability>(CAPABILITIES)

export const ROLE_CAPABILITIES: Record<Role, ReadonlySet<Capability>> = {
  owner: allCapabilities,
  admin: allCapabilities,
  editor: new Set(['product.read', 'product.create', 'product.update', 'product.archive', 'page.update']),
  seo_reviewer: new Set(['product.read', 'seo.review', 'redirect.manage']),
  media_manager: new Set(['product.read', 'media.upload', 'media.update']),
  publisher: new Set([
    'product.read',
    'product.review',
    'product.publish',
    'release.create',
    'release.approve',
    'release.rollback',
    'audit.read',
  ]),
  readonly: new Set(['product.read']),
}

export type AdminIdentity = {
  active?: boolean | null
  role?: string | null
}

export function isActiveAdmin(user: unknown): user is AdminIdentity & { active: true; role: Role } {
  if (!user || typeof user !== 'object') return false
  const candidate = user as AdminIdentity
  return candidate.active === true && ROLES.includes(candidate.role as Role)
}

export function hasCapability(user: unknown, capability: Capability): boolean {
  return isActiveAdmin(user) && ROLE_CAPABILITIES[user.role].has(capability)
}

export function hasAnyCapability(user: unknown, capabilities: readonly Capability[]): boolean {
  return capabilities.some((capability) => hasCapability(user, capability))
}
