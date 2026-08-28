import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { Products } from '../src/collections/Products.js'
import type { ProductStatus } from '../src/catalog/types.js'
import config from '../src/payload.config.js'
import { enforceProductMutationPolicy } from '../src/access/productPolicy.js'
import { enforceReviewRequestPolicy } from '../src/collections/ReviewRequests.js'
import { migrations } from '../src/migrations/index.js'
import { canChangeProductStatus } from '../src/access/fieldAccess.js'

test('R5.3 exposes changes_requested as a durable product lifecycle state', () => {
  const status = Products.fields
    .flatMap((field) => field.type === 'tabs' ? field.tabs.flatMap((tab) => tab.fields) : [field])
    .find((field) => 'name' in field && field.name === 'status')

  assert.deepEqual(
    status && 'options' in status ? status.options?.map((option) => typeof option === 'string' ? option : option.value) : [],
    ['draft', 'in_review', 'changes_requested', 'approved', 'published', 'archived'],
  )
  const changed: ProductStatus = 'changes_requested'
  assert.equal(changed, 'changes_requested')
})

function workflowRequest(role: 'editor' | 'publisher' | 'owner' = 'editor') {
  return { user: { active: true, collection: 'admins', id: 'actor-1', role }, context: { separationOfDuties: true } } as any
}

test('R5.3 enforces the product workflow matrix on the server', () => {
  assert.doesNotThrow(() => enforceProductMutationPolicy({
    data: { status: 'in_review' }, originalDoc: { status: 'draft' }, req: workflowRequest('editor'),
  } as any))
  assert.doesNotThrow(() => enforceProductMutationPolicy({
    data: { status: 'changes_requested' }, originalDoc: { status: 'in_review' }, req: workflowRequest('owner'),
  } as any))
  assert.doesNotThrow(() => enforceProductMutationPolicy({
    data: { status: 'published' }, originalDoc: { status: 'approved' }, req: workflowRequest('publisher'),
  } as any))
  assert.doesNotThrow(() => enforceProductMutationPolicy({
    data: { status: 'archived' }, originalDoc: { status: 'published' }, req: workflowRequest('publisher'),
  } as any))

  assert.throws(() => enforceProductMutationPolicy({
    data: { status: 'approved' }, originalDoc: { status: 'draft' }, req: workflowRequest('owner'),
  } as any), /invalid product status transition/i)
  assert.throws(() => enforceProductMutationPolicy({
    data: { status: 'published' }, originalDoc: { status: 'in_review' }, req: workflowRequest('publisher'),
  } as any), /invalid product status transition/i)
  assert.throws(() => enforceProductMutationPolicy({
    data: { status: 'in_review' }, originalDoc: { status: 'approved' }, req: workflowRequest('editor'),
  } as any), /invalid product status transition/i)
})

test('R5.3 only exposes reviewer and publisher status actions to their capabilities', async () => {
  assert.equal(await canChangeProductStatus({ req: workflowRequest('editor'), siblingData: { status: 'changes_requested' } } as any), false)
  assert.equal(await canChangeProductStatus({ req: workflowRequest('publisher'), siblingData: { status: 'changes_requested' } } as any), true)
  assert.equal(await canChangeProductStatus({ req: workflowRequest('editor'), siblingData: { status: 'archived' } } as any), false)
})

test('R5.3 blocks editor content edits after a product is published', () => {
  assert.throws(() => enforceProductMutationPolicy({
    data: { nameVi: 'Tên đã sửa' }, originalDoc: { status: 'published', nameVi: 'Tên gốc' }, req: workflowRequest('editor'),
  } as any), /published product content/i)
})

test('R5.3 requires resolution metadata before a review request can close', () => {
  assert.throws(() => enforceReviewRequestPolicy({
    data: { state: 'resolved' }, originalDoc: { state: 'open' }, req: workflowRequest('owner'),
  } as any), /resolution metadata/i)
  assert.doesNotThrow(() => enforceReviewRequestPolicy({
    data: { state: 'resolved', resolvedAt: '2026-08-28T00:00:00.000Z', resolvedBy: 'actor-1', resolution: 'Đã cập nhật.' },
    originalDoc: { state: 'open' }, req: workflowRequest('owner'),
  } as any))
})

test('R5.3 binds review evidence to the active actor and preserves its immutable audit trail', () => {
  const reviewerRequest = workflowRequest('editor')
  const createData = { product: 'product-1', requester: 'owner-1', comment: 'Please review.' }
  const created = enforceReviewRequestPolicy({ data: createData, operation: 'create', req: reviewerRequest } as any)
  assert.equal(created.reviewer, 'actor-1')
  assert.equal(created.requester, 'owner-1')
  assert.throws(() => enforceReviewRequestPolicy({
    data: { ...createData, reviewer: 'other-reviewer' }, operation: 'create', req: reviewerRequest,
  } as any), /reviewer/i)
  assert.throws(() => enforceReviewRequestPolicy({
    data: createData, operation: 'create', req: { user: { active: false, id: 'actor-1', role: 'editor' } },
  } as any), /active actor/i)

  const originalDoc = { ...created, state: 'open' }
  assert.throws(() => enforceReviewRequestPolicy({
    data: { comment: 'Altered' }, originalDoc, operation: 'update', req: reviewerRequest,
  } as any), /immutable/i)
  assert.throws(() => enforceReviewRequestPolicy({
    data: { state: 'resolved', resolution: 'Done.' }, originalDoc, operation: 'update',
    req: { user: { active: true, collection: 'admins', id: 'actor-2', role: 'editor' } },
  } as any), /assigned reviewer/i)
  assert.throws(() => enforceReviewRequestPolicy({
    data: { state: 'resolved', resolution: 'Done.', resolvedBy: 'other-user' }, originalDoc, operation: 'update', req: reviewerRequest,
  } as any), /resolvedBy/i)

  const resolved = enforceReviewRequestPolicy({
    data: { state: 'resolved', resolution: 'Đã cập nhật.' }, originalDoc, operation: 'update', req: reviewerRequest,
  } as any)
  assert.equal(resolved.resolvedBy, 'actor-1')
  assert.match(resolved.resolvedAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.throws(() => enforceReviewRequestPolicy({
    data: { state: 'open' }, originalDoc: { ...originalDoc, ...resolved }, operation: 'update', req: reviewerRequest,
  } as any), /cannot be reopened/i)
})

test('R5.3 generated migration is registered for the workflow schema contract', () => {
  const migration = migrations.find((entry) => entry.name.endsWith('_r5_review_workflow'))
  assert.ok(migration)
  assert.equal(typeof migration.up, 'function')
  assert.equal(typeof migration.down, 'function')
})

test('R5.3 registers auditable review requests with durable identities and resolution metadata', async () => {
  const payloadConfig = await config
  const reviewRequests = payloadConfig.collections?.find((collection) => collection.slug === 'review-requests')
  assert.ok(reviewRequests)

  const fields = reviewRequests.fields
  const byName = (name: string) => fields.find((field) => 'name' in field && field.name === name)
  for (const name of ['product', 'requester', 'reviewer', 'comment', 'state', 'resolvedAt', 'resolvedBy', 'resolution']) {
    assert.ok(byName(name), name)
  }
  assert.equal(byName('product')?.type, 'relationship')
  const comment = byName('comment') as { required?: boolean } | undefined
  const state = byName('state') as { options?: string[] } | undefined
  assert.equal(comment?.required, true)
  assert.deepEqual(
    state?.options,
    ['open', 'resolved'],
  )
  assert.equal(reviewRequests.hooks?.afterChange?.length, 1)
  assert.equal(typeof reviewRequests.access?.create, 'function')
  assert.equal(typeof reviewRequests.access?.update, 'function')
})

test('R5.3.1 preserves resolved evidence on later resolved updates', () => {
  const reviewerRequest = workflowRequest('editor')
  const resolvedAt = '2026-08-28T00:00:00.000Z'
  const originalDoc = {
    product: 'product-1', requester: 'owner-1', reviewer: 'actor-1', comment: 'Please review.',
    state: 'resolved', resolvedAt, resolvedBy: 'actor-1', resolution: 'Đã cập nhật.',
  }

  const noOp = enforceReviewRequestPolicy({ data: {}, originalDoc, operation: 'update', req: reviewerRequest } as any)
  assert.equal(noOp.resolvedAt, resolvedAt)
  assert.equal(noOp.resolvedBy, 'actor-1')
  assert.equal(noOp.resolution, 'Đã cập nhật.')
  assert.throws(() => enforceReviewRequestPolicy({
    data: { resolution: 'Bằng chứng đã bị sửa.' }, originalDoc, operation: 'update', req: reviewerRequest,
  } as any), /resolution.*immutable/i)
})

test('R5.3.1 old workflow DOWN removes relationship FK before dropping review requests and normalizes product status', () => {
  const source = readFileSync(new URL('../src/migrations/20260827_230437_r5_review_workflow.ts', import.meta.url), 'utf8')
  const down = source.slice(source.indexOf('export async function down'))
  const constraintDrop = down.indexOf('ALTER TABLE IF EXISTS "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_review_requests_fk"')
  const tableDrop = down.indexOf('DROP TABLE "review_requests" CASCADE')

  assert.ok(constraintDrop >= 0 && constraintDrop < tableDrop, 'relationship FK must be dropped before the table')
  assert.match(down, /ALTER COLUMN "status" SET DATA TYPE text/)
  assert.match(down, /UPDATE "products" SET "status" = 'draft' WHERE "status" = 'changes_requested'/)
})

test('R5.3.1 registers FK integrity migration with RESTRICT up and SET NULL down', () => {
  const file = new URL('../src/migrations/20260828_000001_r5_review_fk_integrity.ts', import.meta.url)
  assert.ok(existsSync(file), 'R5.3.1 FK integrity migration must exist')
  const source = readFileSync(file, 'utf8')
  const up = source.slice(source.indexOf('export async function up'), source.indexOf('export async function down'))
  const down = source.slice(source.indexOf('export async function down'))

  for (const constraint of [
    'review_requests_product_id_products_id_fk',
    'review_requests_requester_id_admins_id_fk',
    'review_requests_reviewer_id_admins_id_fk',
  ]) {
    assert.match(up, new RegExp(`DROP CONSTRAINT "${constraint}"`))
    assert.match(up, new RegExp(`ADD CONSTRAINT "${constraint}"[\\s\\S]*ON DELETE restrict`))
    assert.match(down, new RegExp(`DROP CONSTRAINT "${constraint}"`))
    assert.match(down, new RegExp(`ADD CONSTRAINT "${constraint}"[\\s\\S]*ON DELETE set null`))
  }
  for (const statement of [up, down]) {
    assert.doesNotMatch(statement, /(?:^|;)\s*(?:INSERT|UPDATE|DELETE|MERGE)\b/im, 'FK policy migration must not mutate data')
  }
  assert.ok(migrations.some((entry) => entry.name === '20260828_000001_r5_review_fk_integrity'))
})
