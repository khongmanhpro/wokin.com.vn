import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import {
  InMemoryCatalogRepository,
  importProducts,
  validateImportInput,
} from '../src/catalog/importer.js'

const fixturePath = path.resolve('fixtures/poc-products.json')

async function fixture() {
  return JSON.parse(await readFile(fixturePath, 'utf8'))
}

test('POC fixture covers duplicate SKU, missing SKU, multiple media and Vietnamese slugs', async () => {
  const products = await fixture()
  assert.equal(products.length, 20)
  assert.ok(products.some((product: { sku: string | null }) => product.sku === null))
  assert.ok(products.some((product: { media: unknown[] }) => product.media.length > 1))
  assert.ok(products.every((product: { specifications: unknown[] }) => product.specifications.length > 0))
  assert.ok(products.every((product: { slugVi: string }) => /^[a-z0-9-]+$/.test(product.slugVi)))
  const skus = products.map((product: { sku: string | null }) => product.sku).filter(Boolean)
  assert.ok(skus.some((sku: string, index: number) => skus.indexOf(sku) !== index))
})

test('second import is idempotent while duplicate SKU records remain distinct', async () => {
  const input = await fixture()
  const repository = new InMemoryCatalogRepository()
  const first = await importProducts(repository, input, { dryRun: false })
  const second = await importProducts(repository, input, { dryRun: false })

  assert.equal(first.created, 20)
  assert.equal(second.created, 0)
  assert.equal(second.unchanged, 20)
  assert.equal(repository.products.length, 20)
  const duplicateSku = input.find((product: { sku: string | null }, index: number) =>
    product.sku && input.findIndex((candidate: { sku: string | null }) => candidate.sku === product.sku) !== index,
  ).sku
  assert.equal(repository.products.filter((product) => product.sku === duplicateSku).length, 2)
})

test('dry-run reports work without mutating the repository', async () => {
  const repository = new InMemoryCatalogRepository()
  const result = await importProducts(repository, await fixture(), { dryRun: true })
  assert.equal(result.created, 20)
  assert.equal(repository.products.length, 0)
})

test('idempotency comparison ignores object key order returned by the database', async () => {
  const [product] = await fixture()
  const reordered = {
    ...product,
    categories: product.categories.map((category: { slug: string; nameVi: string }) => ({ nameVi: category.nameVi, slug: category.slug })),
    media: product.media.map((media: { path: string; alt: string }) => ({ alt: media.alt, path: media.path })),
  }
  const repository = new InMemoryCatalogRepository()
  repository.products = [reordered]
  const result = await importProducts(repository, [product], { dryRun: false })
  assert.equal(result.updated, 0)
  assert.equal(result.unchanged, 1)
})

test('slug collisions are blocked with both legacy IDs in the error', async () => {
  const input = await fixture()
  input[1].slugVi = input[0].slugVi
  await assert.rejects(
    () => importProducts(new InMemoryCatalogRepository(), input, { dryRun: true }),
    new RegExp(`slugVi collision.*${input[0].legacySourceId}.*${input[1].legacySourceId}`),
  )
})

test('an existing slug collision is preflighted before any repository mutation', async () => {
  const input = await fixture()
  const repository = new InMemoryCatalogRepository()
  repository.products = [structuredClone(input[0])]
  const before = structuredClone(repository.products)
  input[2].slugVi = input[0].slugVi

  await assert.rejects(
    () => importProducts(repository, [input[1], input[2]], { dryRun: false }),
    new RegExp(`slugVi collision.*${input[0].legacySourceId}.*${input[2].legacySourceId}`),
  )
  assert.deepEqual(repository.products, before)
})

test('media paths reject external schemes, absolute paths, and slash or backslash traversal', async () => {
  const [product] = await fixture()
  const unsafePaths = [
    'https://example.com/image.jpg',
    'data:image/png;base64,abc',
    '/images/product.jpg',
    String.raw`\\server\share\image.jpg`,
    '../images/product.jpg',
    'images/../product.jpg',
    String.raw`images\..\product.jpg`,
  ]

  for (const unsafePath of unsafePaths) {
    const input = [{ ...product, media: [{ ...product.media[0], path: unsafePath }] }]
    assert.ok(validateImportInput(input).some((error) => error.includes('[0].media[0]')), unsafePath)
  }
})

test('invalid input is reported with field context and never silently dropped', async () => {
  const input = await fixture()
  delete input[0].nameVi
  input[1].specifications = []
  const errors = validateImportInput(input)
  assert.ok(errors.some((error) => error.includes('[0].nameVi')))
  assert.ok(errors.some((error) => error.includes('[1].specifications')))
  await assert.rejects(
    () => importProducts(new InMemoryCatalogRepository(), input, { dryRun: false }),
    /2 validation error\(s\)/,
  )
})
