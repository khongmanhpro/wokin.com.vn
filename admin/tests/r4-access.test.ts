import assert from 'node:assert/strict'
import test from 'node:test'

import { hasCapability, ROLE_CAPABILITIES, ROLES } from '../src/access/hasCapability.js'
import {
  activeAuthenticated,
  adminsRead,
  canCreateProduct,
  canDeleteProduct,
  canReadAudit,
  canUpdateProduct,
} from '../src/access/collectionAccess.js'
import {
  canChangeProductContent,
  canChangeProductStatus,
  canManageAdminSecurityFields,
} from '../src/access/fieldAccess.js'
import { enforceProductMutationPolicy } from '../src/access/productPolicy.js'

type Role = (typeof ROLES)[number]

function req(role?: Role, active = true, id = 'user-1') {
  return {
    user: role ? { active, collection: 'admins', id, role } : null,
  } as any
}

test('R4 exposes the exact approved roles and a capability map for every role', () => {
  assert.deepEqual(ROLES, ['owner', 'admin', 'editor', 'seo_reviewer', 'media_manager', 'publisher', 'readonly'])
  for (const role of ROLES) assert.ok(ROLE_CAPABILITIES[role] instanceof Set, role)
})

test('hasCapability rejects anonymous and inactive identities before evaluating role', () => {
  assert.equal(hasCapability(undefined, 'product.read'), false)
  assert.equal(hasCapability({ active: false, role: 'owner' }, 'user.manage'), false)
  assert.equal(hasCapability({ active: true, role: 'readonly' }, 'product.update'), false)
  assert.equal(hasCapability({ active: true, role: 'owner' }, 'user.manage'), true)
})

test('the same server access functions deny anonymous requests for REST, GraphQL and Local API contexts', async () => {
  for (const transport of ['REST', 'GraphQL', 'Local API']) {
    const request = { ...req(), context: { transport } }
    assert.equal(await activeAuthenticated({ req: request } as any), false, transport)
    assert.equal(await canCreateProduct({ req: request } as any), false, transport)
  }
})

test('readonly can read but cannot mutate products through server access', async () => {
  const request = req('readonly')
  assert.equal(await activeAuthenticated({ req: request } as any), true)
  assert.equal(await canCreateProduct({ req: request } as any), false)
  assert.equal(await canUpdateProduct({ req: request } as any), false)
  assert.equal(await canDeleteProduct({ req: request } as any), false)
})

test('editor can edit content but cannot set product status to published', async () => {
  const request = req('editor')
  assert.equal(await canUpdateProduct({ req: request } as any), true)
  assert.equal(await canChangeProductContent({ req: request } as any), true)
  assert.equal(await canChangeProductStatus({ req: request, siblingData: { status: 'published' } } as any), false)
  assert.throws(
    () => enforceProductMutationPolicy({ data: { status: 'published' }, originalDoc: { status: 'approved' }, req: request } as any),
    /invalid product status transition/i,
  )
})

test('publisher can publish but cannot modify product content when separation of duties is enabled', async () => {
  const request = { ...req('publisher'), context: { separationOfDuties: true } }
  assert.equal(await canUpdateProduct({ req: request } as any), true)
  assert.equal(await canChangeProductStatus({ req: request, siblingData: { status: 'published' } } as any), true)
  assert.equal(await canChangeProductContent({ req: request } as any), false)
  assert.throws(
    () => enforceProductMutationPolicy({ data: { nameVi: 'Bypass' }, originalDoc: { nameVi: 'Original' }, req: request } as any),
    /publisher cannot modify product content/i,
  )
})

test('admin security fields require user.manage and admins read is self-only without that capability', async () => {
  assert.equal(await canManageAdminSecurityFields({ req: req('editor') } as any), false)
  assert.equal(await canManageAdminSecurityFields({ req: req('admin') } as any), true)
  assert.deepEqual(await adminsRead({ req: req('readonly', true, 'self') } as any), { id: { equals: 'self' } })
  assert.equal(await adminsRead({ req: req('admin') } as any), true)
})

test('audit events require audit.read and inactive users lose all access immediately', async () => {
  assert.equal(await canReadAudit({ req: req('editor') } as any), false)
  assert.equal(await canReadAudit({ req: req('owner') } as any), true)
  assert.equal(await canReadAudit({ req: req('owner', false) } as any), false)
})
