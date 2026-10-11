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
  isFirstUserBootstrap,
} from '../src/access/fieldAccess.js'
import { enforceProductMutationPolicy } from '../src/access/productPolicy.js'
import { Admins } from '../src/collections/Admins.js'

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

test('first-user bootstrap renders and submits admin security fields while anonymous admin creation remains denied', async () => {
  const bootstrapPostReq = {
    method: 'POST',
    // Payload's create-first-user form-state server action posts back to the
    // admin view route; it is not the REST first-register endpoint.
    url: 'http://localhost:3000/admin/create-first-user',
    user: null,
  }
  const bootstrapGetReq = { ...bootstrapPostReq, method: 'GET' }
  const anonymousCreateReq = {
    method: 'POST',
    routeParams: { collection: 'admins' },
    url: 'http://localhost:3000/api/admins',
    user: null,
  }
  const role = Admins.fields.find((field) => 'name' in field && field.name === 'role') as any
  const active = Admins.fields.find((field) => 'name' in field && field.name === 'active') as any

  assert.ok(role && active)
  assert.equal(isFirstUserBootstrap(bootstrapGetReq), true)
  assert.equal(isFirstUserBootstrap(bootstrapPostReq), true)
  assert.equal(isFirstUserBootstrap({ ...bootstrapPostReq, url: 'http://localhost:3000/admin/collections/admins/create' }), false)
  assert.equal(isFirstUserBootstrap({ ...bootstrapPostReq, url: 'http://localhost:3000/api/admins/first-register', routeParams: { collection: 'admins' } }), true)
  assert.equal(isFirstUserBootstrap({ ...bootstrapPostReq, url: 'http://localhost:3000/admin/unrelated' }), false)
  assert.equal(isFirstUserBootstrap({ ...bootstrapPostReq, method: 'DELETE' }), false)
  assert.equal(await role.access?.create?.({ req: bootstrapGetReq } as any), true)
  assert.equal(await active.access?.create?.({ req: bootstrapGetReq } as any), true)
  assert.equal(await role.access?.create?.({ req: bootstrapPostReq } as any), true)
  assert.equal(await active.access?.create?.({ req: bootstrapPostReq } as any), true)
  assert.equal(typeof role.defaultValue === 'function' ? role.defaultValue({ req: bootstrapGetReq, user: null }) : role.defaultValue, 'owner')
  assert.equal(typeof role.defaultValue === 'function' ? role.defaultValue({ req: { ...bootstrapPostReq, url: 'http://localhost:3000/api/admins/first-register', routeParams: { collection: 'admins' } }, user: null }) : role.defaultValue, 'owner')
  const bootstrapHookResult = await Admins.hooks?.beforeChange?.[0]?.({
    data: { active: false, role: 'readonly' },
    operation: 'create',
    req: { ...bootstrapPostReq, url: 'http://localhost:3000/api/admins/first-register', routeParams: { collection: 'admins' } },
  } as any)
  assert.deepEqual(bootstrapHookResult, { active: true, role: 'owner' })
  assert.equal(await Admins.access?.create?.({ req: anonymousCreateReq } as any), false)
  assert.equal(await role.access?.create?.({ req: anonymousCreateReq } as any), false)
  assert.equal(await active.access?.create?.({ req: anonymousCreateReq } as any), false)
})

test('audit events require audit.read and inactive users lose all access immediately', async () => {
  assert.equal(await canReadAudit({ req: req('editor') } as any), false)
  assert.equal(await canReadAudit({ req: req('owner') } as any), true)
  assert.equal(await canReadAudit({ req: req('owner', false) } as any), false)
})
