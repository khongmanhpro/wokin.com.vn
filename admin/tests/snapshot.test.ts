import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { exportCatalogSnapshot } from '../src/catalog/exporter.js'
import { validateCatalogSnapshot } from '../../contracts/catalog-snapshot-validator.mjs'

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
