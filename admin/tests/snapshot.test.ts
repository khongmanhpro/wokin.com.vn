import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { exportCatalogSnapshot } from '../src/catalog/exporter.js'
import { exportReleaseSnapshot, selectReleaseCandidate, writeReleaseArtifact } from '../src/catalog/release-exporter.js'
import { snapshotChecksum, stableStringify, validateCatalogSnapshot } from '../../contracts/catalog-snapshot-validator.mjs'

const fixturePath = path.resolve('fixtures/poc-products.json')
const schemaPath = path.resolve('../contracts/catalog-snapshot.schema.json')
const unsafeMediaPaths = [
  'https://example.com/image.jpg',
  'file:///tmp/image.jpg',
  '/images/product.jpg',
  String.raw`\\server\share\image.jpg`,
  'images/../product.jpg',
  String.raw`images\..\product.jpg`,
]

test('export is deterministic, validates, and excludes admin-only fields', async () => {
  const products = JSON.parse(await readFile(fixturePath, 'utf8'))
  const first = exportCatalogSnapshot(products)
  const second = exportCatalogSnapshot([...products].reverse())

  assert.deepEqual(first, second)
  assert.deepEqual(validateCatalogSnapshot(first), [])
  const serialized = JSON.stringify(first)
  assert.doesNotMatch(serialized, /createdAt|updatedAt|email|password|hash|salt/)
  assert.match(first.checksum, /^[a-f\d]{64}$/)
  assert.match(first.snapshotId, /^poc-[a-f\d]{16}$/)
})

test('snapshot validator reports every invalid record instead of dropping it', () => {
  const errors = validateCatalogSnapshot({ schemaVersion: 1, products: [{}], categories: [], media: [] })
  assert.ok(errors.length >= 4)
  assert.ok(errors.some((error: string) => error.includes('checksum')))
  assert.ok(errors.some((error: string) => error.includes('products[0]')))
})

test('v2 release contract rejects a zero-product artifact even with a valid envelope', () => {
  const withoutChecksum = {
    schemaVersion: 2,
    catalog: { schemaVersion: 1, sourceChecksum: 'a'.repeat(64), canonicalSlugSha256: 'b'.repeat(64), categories: [], products: [] },
    glossary: { ui: {} },
  }
  const snapshotId = `release-${createHash('sha256').update(stableStringify(withoutChecksum)).digest('hex').slice(0, 16)}`
  const snapshot = { ...withoutChecksum, snapshotId, checksum: snapshotChecksum({ ...withoutChecksum, snapshotId }) }
  assert.ok(validateCatalogSnapshot(snapshot).some((error: string) => error.includes('catalog.products must be non-empty')))
})

test('v2 release contract rejects a malformed embedded public catalog', () => {
  const content = {
    schemaVersion: 2,
    catalog: {
      schemaVersion: 1,
      sourceChecksum: 'a'.repeat(64),
      canonicalSlugSha256: 'b'.repeat(64),
      categories: [],
      products: [{ internalId: 'product-1' }],
    },
    glossary: { ui: {} },
  }
  const snapshotId = `release-${createHash('sha256').update(stableStringify(content)).digest('hex').slice(0, 16)}`
  const snapshot = { ...content, snapshotId, checksum: snapshotChecksum({ ...content, snapshotId }) }
  assert.ok(validateCatalogSnapshot(snapshot).some((error: string) => error.includes('catalog.products[0].translation')))
})

test('v2 release export is deterministic and retains the public catalog shape', () => {
  const category = { id: '11111111-1111-5111-8111-111111111111', legacySourceId: 1, nameVi: 'Dụng cụ', sourceName: 'Tools', slug: 'tools', status: 'active', parentId: null, sortOrder: 0 }
  const media = { id: '22222222-2222-5222-8222-222222222222', path: 'images/products/tool.jpg', alt: 'Dụng cụ', rightsStatus: 'cleared' }
  const product = {
    id: '33333333-3333-5333-8333-333333333333', legacySourceId: 1, sku: 'TOOL-1', status: 'published', nameVi: 'Dụng cụ thử nghiệm', slugVi: 'dung-cu-thu-nghiem', descriptionVi: 'Mô tả',
    specifications: [{ label: 'Điện áp', value: '20', unit: 'V', sourceLine: '> Điện áp: 20 V' }], packaging: [{ cells: [{ value: 'SKU' }, { value: 'TOOL-1' }] }], attributes: [{ legacySourceId: 7, name: 'Màu sắc', values: [{ value: 'Cam' }] }],
    categoryIds: [category.id], mediaIds: [media.id], publishedAt: '2026-08-01T00:00:00.000Z', sourceMetadata: { sourceType: 'simple', legacySlug: 'tool', sourceName: 'Tool', legacyDescription: 'source-only', sourceChecksum: 'a'.repeat(64), canonicalSlugSha256: 'b'.repeat(64), searchIndex: {}, importedAt: '2026-01-01T00:00:00.000Z', legacyPublishedAt: null },
  }
  const first = exportReleaseSnapshot({ categories: [category], media: [media], products: [product], glossary: { ui: { search: 'Tìm kiếm' } } })
  const second = exportReleaseSnapshot({ categories: [category], media: [media], products: [product], glossary: { ui: { search: 'Tìm kiếm' } } })
  assert.deepEqual(first, second)
  assert.match(first.snapshotId, /^release-[a-f\d]{16}$/)
  assert.equal(first.catalog.products[0].publishedAt, product.publishedAt)
  assert.deepEqual(validateCatalogSnapshot(first), [])
})

test('v2 release selection includes the complete active category ancestor chain', () => {
  const root = { id: 'root-category', legacySourceId: 1, nameVi: 'Danh mục gốc', slug: 'danh-muc-goc', status: 'active' as const, parentId: null }
  const parent = { id: 'parent-category', legacySourceId: 2, nameVi: 'Danh mục cha', slug: 'danh-muc-cha', status: 'active' as const, parentId: root.id }
  const child = { id: 'child-category', legacySourceId: 3, nameVi: 'Danh mục con', slug: 'danh-muc-con', status: 'active' as const, parentId: parent.id }
  const media = { id: 'nested-media', path: 'images/nested.jpg', alt: 'Ảnh', rightsStatus: 'cleared' as const }
  const product = { id: 'nested-product', legacySourceId: 1, sku: null, status: 'published' as const, nameVi: 'Sản phẩm lồng', slugVi: 'san-pham-long', descriptionVi: '', specifications: [], packaging: [], attributes: [], categoryIds: [child.id], mediaIds: [media.id], publishedAt: '2026-08-01T00:00:00.000Z' }
  const selected = selectReleaseCandidate({ categories: [root, parent, child], media: [media], products: [product], glossary: { ui: {} } })
  assert.deepEqual(selected.categories, [root, parent, child])
  assert.deepEqual(validateCatalogSnapshot(exportReleaseSnapshot(selected)), [])
})

test('v2 release contract rejects a category with a missing parent reference', () => {
  const parent = { id: 'valid-parent', legacySourceId: 1, nameVi: 'Danh mục gốc', slug: 'danh-muc-goc', status: 'active' as const, parentId: null }
  const child = { id: 'valid-child', legacySourceId: 2, nameVi: 'Danh mục con', slug: 'danh-muc-con', status: 'active' as const, parentId: parent.id }
  const media = { id: 'parent-media', path: 'images/parent.jpg', alt: 'Ảnh', rightsStatus: 'cleared' as const }
  const product = { id: 'parent-product', legacySourceId: 1, sku: null, status: 'published' as const, nameVi: 'Sản phẩm', slugVi: 'san-pham', descriptionVi: '', specifications: [], packaging: [], attributes: [], categoryIds: [child.id], mediaIds: [media.id], publishedAt: '2026-08-01T00:00:00.000Z' }
  const valid = exportReleaseSnapshot({ categories: [parent, child], media: [media], products: [product], glossary: { ui: {} } })
  const { checksum: _checksum, snapshotId: _snapshotId, ...content } = structuredClone(valid)
  content.catalog.categories.find((category) => category.internalId === child.id)!.parentInternalId = 'missing-parent'
  const snapshotId = `release-${createHash('sha256').update(stableStringify(content)).digest('hex').slice(0, 16)}`
  const invalid = { ...content, snapshotId, checksum: snapshotChecksum({ ...content, snapshotId }) }
  assert.ok(validateCatalogSnapshot(invalid).some((error: string) => error.includes('parentInternalId references a missing category')))
})

test('v2 release selection retains published products and only their referenced release-ready relations', () => {
  const activeCategory = { id: 'active-category', legacySourceId: 1, nameVi: 'Nhóm đang hoạt động', slug: 'nhom-hoat-dong', status: 'active' as const, parentId: null }
  const archivedCategory = { id: 'archived-category', legacySourceId: 2, nameVi: 'Nhóm lưu trữ', slug: 'nhom-luu-tru', status: 'archived' as const, parentId: null }
  const clearedMedia = { id: 'cleared-media', path: 'images/release-ready.jpg', alt: 'Ảnh đã duyệt', rightsStatus: 'cleared' as const }
  const pendingMedia = { id: 'pending-media', path: 'images/pending.jpg', alt: 'Ảnh chờ duyệt', rightsStatus: 'pending' as const }
  const publishedProduct = { id: 'published-product', legacySourceId: 1, sku: 'READY-1', status: 'published' as const, nameVi: 'Sản phẩm sẵn sàng', slugVi: 'san-pham-san-sang', descriptionVi: '', specifications: [], packaging: [], attributes: [], categoryIds: [activeCategory.id], mediaIds: [clearedMedia.id], publishedAt: '2026-08-01T00:00:00.000Z' }
  const draftProduct = { id: 'draft-product', legacySourceId: 2, sku: null, status: 'draft' as const, nameVi: '', slugVi: '', descriptionVi: null, specifications: [], packaging: [], attributes: [], categoryIds: [archivedCategory.id], mediaIds: [pendingMedia.id], publishedAt: null }
  const input = { categories: [activeCategory, archivedCategory], media: [clearedMedia, pendingMedia], products: [publishedProduct, draftProduct], glossary: { ui: {} } }

  const selected = selectReleaseCandidate(input)

  assert.deepEqual(selected.categories, [activeCategory])
  assert.deepEqual(selected.media, [clearedMedia])
  assert.deepEqual(selected.products, [publishedProduct])
  assert.deepEqual(validateCatalogSnapshot(exportReleaseSnapshot(selected)), [])
  assert.throws(
    () => selectReleaseCandidate({ ...input, products: [draftProduct] }),
    /zero published products/i,
  )
})

test('v2 release export reports inactive categories and uncleared media with record context', () => {
  const category = { id: 'bad-category', legacySourceId: 1, nameVi: 'Nhóm', slug: 'nhom', status: 'archived', parentId: null }
  const media = { id: 'bad-media', path: 'images/x.jpg', alt: 'Ảnh', rightsStatus: 'pending' }
  const product = { id: 'published-product', legacySourceId: 1, sku: null, status: 'published', nameVi: 'Sản phẩm', slugVi: 'san-pham', descriptionVi: '', specifications: [], packaging: [], attributes: [], categoryIds: [category.id], mediaIds: [media.id], publishedAt: '2026-08-01T00:00:00.000Z' }
  assert.throws(() => exportReleaseSnapshot({ categories: [category], media: [media], products: [product], glossary: { ui: {} } }), /bad-category[\s\S]*bad-media[\s\S]*inactive category[\s\S]*uncleared media/)
})

test('v2 release checksum rejects modified canonical content', () => {
  const content = { schemaVersion: 2, catalog: { schemaVersion: 1, sourceChecksum: 'a'.repeat(64), canonicalSlugSha256: 'b'.repeat(64), categories: [], products: [] }, glossary: { ui: {} as Record<string, string> } }
  const snapshotId = `release-${createHash('sha256').update(stableStringify(content)).digest('hex').slice(0, 16)}`
  const snapshot = { ...content, snapshotId, checksum: snapshotChecksum({ ...content, snapshotId }) }
  snapshot.glossary.ui.search = 'Tìm kiếm'
  assert.ok(validateCatalogSnapshot(snapshot).some((error: string) => error.includes('checksum')))
})

test('public builder accepts a v2 release without discarding public fields', async () => {
  const category = { id: '11111111-1111-5111-8111-111111111111', legacySourceId: 1, nameVi: 'Dụng cụ', sourceName: 'Tools', slug: 'tools', status: 'active', parentId: null, sortOrder: 0 }
  const media = { id: '22222222-2222-5222-8222-222222222222', path: 'images/products/tool.jpg', alt: 'Dụng cụ', rightsStatus: 'cleared' }
  const product = { id: '33333333-3333-5333-8333-333333333333', legacySourceId: 1, sku: 'TOOL-1', status: 'published', nameVi: 'Dụng cụ thử nghiệm', slugVi: 'dung-cu-thu-nghiem', descriptionVi: 'Mô tả', specifications: [{ label: 'Điện áp', value: '20', sourceLine: '> Điện áp: 20' }], packaging: [], attributes: [{ legacySourceId: 7, name: 'Màu sắc', values: [{ value: 'Cam' }] }], categoryIds: [category.id], mediaIds: [media.id], publishedAt: '2026-08-01T00:00:00.000Z', sourceMetadata: {} }
  const snapshot = exportReleaseSnapshot({ categories: [category], media: [media], products: [product] as never, glossary: { ui: { search: 'Tìm kiếm' } } })
  const snapshotFile = path.join(await mkdtemp(path.join(os.tmpdir(), 'wokin-v2-snapshot-')), 'release.json')
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'wokin-public-v2-'))
  await writeFile(snapshotFile, stableStringify(snapshot))
  const { buildCatalogDataFromSnapshot } = await import('../../scripts/build-catalog-data.mjs')
  await buildCatalogDataFromSnapshot({ snapshotFile, outputDir })
  const catalog = JSON.parse(await readFile(path.join(outputDir, 'catalog.generated.json'), 'utf8'))
  assert.equal(catalog.products[0].publishedAt, product.publishedAt)
  assert.equal(catalog.products[0].legacyDescription, product.descriptionVi)
  assert.deepEqual(catalog.products[0].attributes, [{ legacySourceId: 7, name: 'Màu sắc', values: ['Cam'] }])
})

test('release artifact rerun is immutable when content is identical', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wokin-release-artifact-'))
  const snapshot = exportReleaseSnapshot({
    categories: [{ id: 'artifact-category', legacySourceId: 1, nameVi: 'Nhóm', slug: 'nhom', status: 'active', parentId: null }],
    media: [{ id: 'artifact-media', path: 'images/artifact.jpg', alt: 'Ảnh', rightsStatus: 'cleared' }],
    products: [{ id: 'artifact-product', legacySourceId: 1, sku: null, status: 'published', nameVi: 'Sản phẩm', slugVi: 'san-pham', descriptionVi: '', specifications: [], packaging: [], attributes: [], categoryIds: ['artifact-category'], mediaIds: ['artifact-media'], publishedAt: '2026-08-01T00:00:00.000Z' }],
    glossary: { ui: {} },
  })
  const first = await writeReleaseArtifact(root, snapshot)
  const second = await writeReleaseArtifact(root, snapshot)
  assert.equal(first, second)
  assert.equal(await readFile(path.join(root, snapshot.snapshotId, 'catalog-release.json'), 'utf8'), stableStringify(snapshot))
})

test('snapshot validator rejects external and traversing media paths', async () => {
  const products = JSON.parse(await readFile(fixturePath, 'utf8'))

  for (const unsafePath of unsafeMediaPaths) {
    const snapshot = exportCatalogSnapshot(products)
    snapshot.media[0].path = unsafePath
    assert.ok(validateCatalogSnapshot(snapshot).some((error: string) => error.includes('media[0].path')), unsafePath)
  }
})

test('snapshot JSON Schema uses the same relative-safe media path policy', async () => {
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'))
  const mediaPathPattern = new RegExp(schema.$defs.media.properties.path.pattern)

  assert.match('images/products/621821/0.jpg', mediaPathPattern)
  for (const unsafePath of unsafeMediaPaths) assert.doesNotMatch(unsafePath, mediaPathPattern)
})

test('public catalog builder consumes the POC snapshot deterministically without changing output architecture', async () => {
  const { buildCatalogDataFromSnapshot } = await import('../../scripts/build-catalog-data.mjs')
  assert.equal(typeof buildCatalogDataFromSnapshot, 'function')
  const snapshotFile = path.resolve('snapshots/catalog-poc.json')
  const firstDir = await mkdtemp(path.join(os.tmpdir(), 'wokin-public-poc-a-'))
  const secondDir = await mkdtemp(path.join(os.tmpdir(), 'wokin-public-poc-b-'))
  const first = await buildCatalogDataFromSnapshot({ snapshotFile, outputDir: firstDir })
  const second = await buildCatalogDataFromSnapshot({ snapshotFile, outputDir: secondDir })
  assert.deepEqual(first, second)
  for (const name of ['catalog.generated.json', 'categories.json', 'products_vi.json', 'search-index.json', 'vi-glossary.json', 'README.md', 'catalog-data.checksums.json']) {
    assert.equal(await readFile(path.join(firstDir, name), 'utf8'), await readFile(path.join(secondDir, name), 'utf8'))
  }
  const catalog = JSON.parse(await readFile(path.join(firstDir, 'catalog.generated.json'), 'utf8'))
  assert.equal(catalog.products.length, 20)
  assert.equal(catalog.schemaVersion, 1)
  assert.equal(catalog.sourceChecksum.length, 64)
})
