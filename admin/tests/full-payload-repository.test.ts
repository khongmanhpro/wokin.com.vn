import assert from 'node:assert/strict'
import test from 'node:test'
import type { Payload } from 'payload'

import { PayloadFullCatalogRepository } from '../src/catalog/full-payload-repository.js'
import type { ProductionProductInput } from '../src/catalog/types.js'

const product: ProductionProductInput = {
  id: '10000000-0000-5000-8000-000000010463',
  legacySourceId: 10463,
  sku: '621821',
  status: 'draft',
  nameVi: 'Máy thổi',
  slugVi: 'may-thoi',
  descriptionVi: null,
  specifications: [{ label: 'Điện áp', value: '20V', sourceLine: '> Điện áp: 20V' }],
  packaging: [{ cells: [{ value: 'MÃ KHO' }, { value: '621821' }] }],
  attributes: [],
  categoryIds: ['20000000-0000-5000-8000-000000000061'],
  mediaIds: ['30000000-0000-5000-8000-000000000001'],
  publishedAt: null,
  seo: { title: 'Máy thổi', description: 'Máy thổi chính hãng.', canonicalPath: '/san-pham/may-thoi', noIndex: true },
  sourceMetadata: {
    sourceType: 'simple', legacySlug: 'blower', sourceName: 'BLOWER', legacyDescription: '',
    sourceChecksum: 'a'.repeat(64), canonicalSlugSha256: 'b'.repeat(64), searchIndex: { id: 10463 },
    importedAt: '2026-08-27T00:00:00.000Z', legacyPublishedAt: '2026-08-01T00:00:00',
  },
}

test('Payload full repository strips nested row IDs and populated relationship documents', async () => {
  const document = {
    ...product,
    descriptionVi: undefined,
    categories: product.categoryIds.map((id) => ({ id, slug: 'tools' })),
    media: product.mediaIds.map((id) => ({ id, storageKey: 'images/products/621821/0.jpg' })),
    specifications: product.specifications.map((item) => ({ id: 'row-spec', ...item, unit: null })),
    packaging: product.packaging.map((row) => ({ id: 'row-pack', cells: row.cells.map((cell) => ({ id: 'row-cell', ...cell })) })),
    attributes: [],
    publishedAt: undefined,
  }
  const payload = {
    async find({ collection }: { collection: string }) {
      return { docs: collection === 'products' ? [document] : [], hasNextPage: false, nextPage: null }
    },
  } as unknown as Payload

  assert.deepEqual(await new PayloadFullCatalogRepository(payload).listProducts(), [product])
})

test('Payload full repository writes draft products with deterministic relation IDs and no publishedAt', async () => {
  let created: Record<string, unknown> | undefined
  const payload = {
    async create(options: Record<string, unknown>) { created = options; return { id: product.id } },
  } as unknown as Payload

  await new PayloadFullCatalogRepository(payload).createProduct(product)
  const data = created?.data as Record<string, unknown>
  assert.equal(created?.collection, 'products')
  assert.equal(data.id, product.id)
  assert.equal(data.status, 'draft')
  assert.equal('publishedAt' in data, false)
  assert.deepEqual(data.categories, product.categoryIds)
  assert.deepEqual(data.media, product.mediaIds)
})
