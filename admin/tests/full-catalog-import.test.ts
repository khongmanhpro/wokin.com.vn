import assert from 'node:assert/strict'
import test from 'node:test'

import {
  InMemoryFullCatalogRepository,
  importFullCatalog,
} from '../src/catalog/full-importer.js'
import {
  loadFullCatalogSources,
  normalizeFullCatalog,
  verifyMediaChecksum,
} from '../src/catalog/full-normalizer.js'

const sourcesPromise = loadFullCatalogSources({ projectRoot: '..' })
const catalogPromise = sourcesPromise.then((sources) => normalizeFullCatalog(sources))

test('full normalization accounts for every production catalog record and image reference', async () => {
  const catalog = await catalogPromise

  assert.equal(catalog.products.length, 1_357)
  assert.equal(catalog.categories.length, 30)
  assert.equal(catalog.media.length, 1_717)
  assert.equal(catalog.report.imageReferences, 1_720)
  assert.equal(catalog.report.droppedProducts, 0)
  assert.equal(catalog.report.droppedCategories, 0)
  assert.equal(catalog.report.droppedImageReferences, 0)
  assert.ok(catalog.products.every((product) => product.status === 'draft' && product.publishedAt === null))
  assert.ok(catalog.media.every((media) => media.rightsStatus === 'pending'))
  assert.ok(catalog.media.every((media) => /^[a-f\d]{64}$/.test(media.contentSha256)))
})

test('normalization preserves nullable and duplicate SKU records as distinct legacy identities', async () => {
  const catalog = await catalogPromise
  assert.equal(catalog.products.filter((product) => product.sku === null).length, 5)
  assert.equal(catalog.products.filter((product) => product.sku === '789501').length, 2)
  assert.equal(new Set(catalog.products.map((product) => product.legacySourceId)).size, 1_357)
})

test('normalization reports a slug collision before producing import records', async () => {
  const sources = structuredClone(await sourcesPromise)
  sources.translations[1].slug_vi = sources.translations[0].slug_vi

  assert.throws(
    () => normalizeFullCatalog(sources),
    /slugVi collision.*legacySourceId.*legacySourceId/s,
  )
})

test('media checksum is verified against the referenced local binary', async () => {
  const catalog = await catalogPromise
  await assert.doesNotReject(() => verifyMediaChecksum(catalog.media[0], '..'))
  await assert.rejects(
    () => verifyMediaChecksum({ ...catalog.media[0], contentSha256: '0'.repeat(64) }, '..'),
    /checksum mismatch/,
  )
})

test('dry-run and repeated full imports are mutation-safe and idempotent', async () => {
  const catalog = await catalogPromise
  const repository = new InMemoryFullCatalogRepository()

  const dryRun = await importFullCatalog(repository, catalog, { dryRun: true })
  assert.deepEqual(dryRun.records, {
    categories: { created: 30, updated: 0, unchanged: 0 },
    media: { created: 1_717, updated: 0, unchanged: 0 },
    products: { created: 1_357, updated: 0, unchanged: 0 },
  })
  assert.equal(repository.count(), 0)

  const first = await importFullCatalog(repository, catalog, { dryRun: false })
  const second = await importFullCatalog(repository, catalog, { dryRun: false })
  assert.equal(first.records.products.created, 1_357)
  assert.equal(second.records.products.created, 0)
  assert.equal(second.records.products.unchanged, 1_357)
  assert.equal(second.records.categories.unchanged, 30)
  assert.equal(second.records.media.unchanged, 1_717)
  assert.equal(repository.count(), 3_104)
})
