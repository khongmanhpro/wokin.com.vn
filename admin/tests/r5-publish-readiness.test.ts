import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { enforceProductMutationPolicy } from '../src/access/productPolicy.js'
import { enforcePublishReadiness } from '../src/access/publishReadiness.js'
import { Products } from '../src/collections/Products.js'
import { ProductPreviewContent } from '../src/components/ProductDraftPreview.js'

const approvedProduct = {
  id: 'product-1',
  status: 'approved',
  nameVi: 'Máy khoan',
  slugVi: 'may-khoan',
  descriptionVi: 'Mô tả đã lưu.',
  specifications: [{ label: 'Công suất', value: '500', unit: 'W' }],
  categories: ['category-1'],
  media: ['media-1'],
  seo: { title: 'Máy khoan', description: 'Máy khoan chuyên dụng.', canonicalPath: '/san-pham/may-khoan', noIndex: false },
}

function publisherRequest(mediaDocs = [{ id: 'media-1', rightsStatus: 'cleared' }]) {
  const calls: Array<Record<string, unknown>> = []
  return {
    calls,
    req: {
      user: { active: true, collection: 'admins', id: 'publisher-1', role: 'publisher' },
      context: { separationOfDuties: true },
      payload: {
        find: async (options: Record<string, unknown>) => {
          calls.push(options)
          return { docs: mediaDocs, hasNextPage: false, nextPage: null }
        },
      },
    },
  }
}

test('R5.5a publishes an approved persisted candidate after verifying cleared media through the Local API', async () => {
  const { req, calls } = publisherRequest()
  const data = { status: 'published' }

  const result = await enforcePublishReadiness({ data, originalDoc: approvedProduct, req } as never)

  assert.equal(result, data)
  assert.deepEqual(calls.map(({ collection, where, page, limit, overrideAccess }) => ({ collection, where, page, limit, overrideAccess })), [{
    collection: 'media', where: { id: { in: ['media-1'] } }, page: 1, limit: 100, overrideAccess: false,
  }])
})

test('R5.5a merges partial updates with persisted fields before assessing publish readiness', async () => {
  const { req } = publisherRequest([{ id: 'media-1', rightsStatus: 'cleared' }])

  await assert.doesNotReject(() => enforcePublishReadiness({
    data: { status: 'published', seo: { title: 'Tiêu đề đã đổi' }, media: [{ id: 'media-1', rightsStatus: 'restricted' }] },
    originalDoc: approvedProduct,
    req,
  } as never))
})

test('R5.5a rejects incomplete persisted SEO, relations, and no-index candidates', async () => {
  for (const [label, patch] of Object.entries({
    'blank name': { nameVi: '   ' },
    'missing SEO description': { seo: { ...approvedProduct.seo, description: '' } },
    'no index': { seo: { ...approvedProduct.seo, noIndex: true } },
    'missing no-index setting': { seo: { title: 'Máy khoan', description: 'Mô tả', canonicalPath: '/san-pham/may-khoan' } },
    'empty categories': { categories: [] },
    'empty media': { media: [] },
  })) {
    const { req } = publisherRequest()
    await assert.rejects(
      () => enforcePublishReadiness({ data: { status: 'published' }, originalDoc: { ...approvedProduct, ...patch }, req } as never),
      /publish readiness|SEO|Danh mục|Hình ảnh/i,
      label,
    )
  }
})

test('R5.5a rejects media that is not cleared, regardless of client-supplied relation data', async () => {
  const { req } = publisherRequest([{ id: 'media-1', rightsStatus: 'pending' }])

  await assert.rejects(
    () => enforcePublishReadiness({
      data: { status: 'published', media: [{ id: 'media-1', rightsStatus: 'cleared' }] }, originalDoc: approvedProduct, req,
    } as never),
    /right.*cleared/i,
  )
})

test('R5.5a rejects client-forged publish timestamps outside the approved-to-published transition', () => {
  assert.throws(() => enforceProductMutationPolicy({
    data: { publishedAt: '2000-01-01T00:00:00.000Z' }, originalDoc: approvedProduct, req: publisherRequest().req,
  } as never), /publishedAt/i)
  assert.throws(() => enforceProductMutationPolicy({
    data: { status: 'published', publishedAt: '2000-01-01T00:00:00.000Z' }, originalDoc: approvedProduct, req: publisherRequest().req,
  } as never), /publishedAt/i)
})

test('R5.5a assigns the publish timestamp on the server precisely for approved-to-published', () => {
  const result = enforceProductMutationPolicy({
    data: { status: 'published' }, originalDoc: approvedProduct, req: publisherRequest().req,
  } as never)

  assert.match(result.publishedAt as string, /^\d{4}-\d{2}-\d{2}T/)
  assert.notEqual(result.publishedAt, '2000-01-01T00:00:00.000Z')
})

test('R5.5a registers the protected persisted preview view with exact route and no-index robots', () => {
  const views = Products.admin?.components?.views as { edit?: { preview?: Record<string, unknown> } } | undefined
  const preview = views?.edit?.preview

  assert.deepEqual(preview, {
    Component: '/components/ProductDraftPreview#ProductDraftPreview',
    path: '/preview',
    meta: { robots: { index: false, follow: false } },
  })
})

test('R5.5a renders the persisted product supplied by Payload as a direct doc prop', () => {
  const markup = renderToStaticMarkup(ProductPreviewContent({ product: approvedProduct } as never))

  assert.match(markup, /Máy khoan/)
  assert.doesNotMatch(markup, /Sản phẩm chưa có dữ liệu/)
})
