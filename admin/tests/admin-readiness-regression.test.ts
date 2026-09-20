import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'

import { enforceProductMutationPolicy } from '../src/access/productPolicy.js'
import { enforcePublishReadiness } from '../src/access/publishReadiness.js'
import { enforceReviewRequestPolicy } from '../src/collections/ReviewRequests.js'
import { ProductDraftPreview, ProductPreviewContent } from '../src/components/ProductDraftPreview.js'
import { mediaLibraryQueryString } from '../src/lib/mediaCategoryWorkspace.js'
import { normalizeUploadedImage, MAX_IMAGE_BYTES } from '../src/lib/mediaUpload.js'
import { reviewQueueWhere } from '../src/lib/reviewQueue.js'
import { workspacePage } from '../src/lib/workspacePagination.js'

const actor = { active: true, id: 'publisher-1', role: 'publisher' }

test('runtime: publisher accepts hydrated unchanged null date but rejects forged timestamps', () => {
  const result = enforceProductMutationPolicy({ data: { status: 'published', publishedAt: null }, originalDoc: { status: 'approved', publishedAt: null }, req: { user: actor } } as never) as { publishedAt: string }
  assert.match(result.publishedAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.throws(() => enforceProductMutationPolicy({ data: { status: 'published', publishedAt: '2000-01-01' }, originalDoc: { status: 'approved', publishedAt: null }, req: { user: actor } } as never), /server-derived/)
})

test('runtime: resolving accepts hydrated null actor and derives real identity', () => {
  const originalDoc = { state: 'open', reviewer: actor.id, resolvedBy: null, resolvedAt: null }
  const result = enforceReviewRequestPolicy({ data: { state: 'resolved', resolvedBy: null, resolution: 'Đã kiểm tra.' }, originalDoc, operation: 'update', req: { user: actor } } as never) as { resolvedBy: string; resolvedAt: string }
  assert.equal(result.resolvedBy, actor.id)
  assert.match(result.resolvedAt, /^\d{4}/)
  assert.throws(() => enforceReviewRequestPolicy({ data: { state: 'resolved', resolvedBy: 'attacker', resolution: 'X' }, originalDoc, operation: 'update', req: { user: actor } } as never), /active actor/)
})

test('runtime: publish media lookup retains authenticated request and transaction', async () => {
  const req = { user: actor, transactionID: 'test-transaction', payload: { find: async (options: Record<string, unknown>) => {
    assert.equal(options.req, req)
    assert.equal(options.overrideAccess, false)
    return { docs: [{ id: 'media-1', rightsStatus: 'cleared' }], hasNextPage: false }
  } } }
  await enforcePublishReadiness({ data: { status: 'published' }, originalDoc: { status: 'approved', nameVi: 'Máy khoan', slugVi: 'may-khoan', seo: { title: 'Máy khoan', description: 'Thông tin', canonicalPath: '/san-pham/may-khoan', noIndex: false }, categories: ['category-1'], media: ['media-1'] }, req } as never)
})

test('media pagination composes filters server-side and uses stable sort/page', () => {
  const params = new URLSearchParams(mediaLibraryQueryString({ query: 'photo', rights: 'pending', missingAlt: true }, 3))
  assert.equal(params.get('page'), '3')
  assert.equal(params.get('limit'), '25')
  assert.equal(params.get('sort'), '-createdAt,id')
  assert.equal(params.get('where'), null)
  assert.equal(params.get('where[and][0][or][0][path][contains]'), 'photo')
  assert.equal(params.get('where[and][1][rightsStatus][equals]'), 'pending')
  assert.equal(params.get('where[and][2][or][1][alt][exists]'), 'false')
  for (const invalid of ['-1', '1.5', 'abc', Infinity, null]) assert.equal(workspacePage(invalid), 1)
})

test('review tabs filter within the query rather than a truncated first page', () => {
  assert.deepEqual(reviewQueueWhere(actor.id, 'assigned'), { and: [{ state: { equals: 'open' } }, { reviewer: { equals: actor.id } }] })
  assert.deepEqual(reviewQueueWhere(actor.id, 'changes'), { and: [{ state: { equals: 'open' } }, { 'product.status': { equals: 'changes_requested' } }] })
  assert.match(JSON.stringify(reviewQueueWhere(actor.id, 'requested', 'WK-last')), /product.sku.*WK-last/)
})

test('upload decodes valid raster images and rejects spoofed, SVG, oversized or broken files', async () => {
  const png = await sharp({ create: { width: 12, height: 12, channels: 3, background: '#fe7700' } }).png().toBuffer()
  const result = await normalizeUploadedImage(png, 'image/png')
  assert.equal(result.extension, 'png')
  assert.equal((await sharp(result.buffer).metadata()).width, 12)
  await assert.rejects(normalizeUploadedImage(png, 'image/jpeg'))
  await assert.rejects(normalizeUploadedImage(Buffer.from('<svg/>'), 'image/svg+xml'))
  await assert.rejects(normalizeUploadedImage(Buffer.alloc(MAX_IMAGE_BYTES + 1), 'image/png'))
  await assert.rejects(normalizeUploadedImage(Buffer.from('not an image'), 'image/png'))
})

test('preview denies missing identity and fetches populated saved document using access checks', async () => {
  const denied = renderToStaticMarkup(await ProductDraftPreview({ doc: { id: 'product-1' } }))
  assert.match(denied, /Vui lòng đăng nhập/)
  const req = { user: actor }
  const markup = renderToStaticMarkup(await ProductDraftPreview({ doc: { id: 'product-1' }, initPageResult: { req }, payload: { findByID: async (options: Record<string, unknown>) => {
    assert.equal(options.req, req); assert.equal(options.overrideAccess, false); assert.equal(options.depth, 1)
    return { nameVi: 'Máy khoan đã lưu', categories: [{ id: 'cat', nameVi: 'Dụng cụ' }], media: [{ id: 'img', filename: 'photo.png', alt: 'Máy khoan' }] }
  } } } as never))
  assert.match(markup, /Máy khoan đã lưu/)
  assert.match(markup, /api\/media\/file\/photo.png/)
  assert.match(markup, /Dụng cụ/)
  assert.doesNotMatch(renderToStaticMarkup(ProductPreviewContent({ product: { nameVi: '<script>alert(1)</script>' } })), /<script>/)
})
