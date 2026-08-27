import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import type { Payload } from 'payload'

import { PayloadCatalogRepository } from '../src/catalog/payload-repository.js'

const fixturePath = path.resolve('fixtures/poc-products.json')

test('listProducts follows Payload pagination until every product is returned', async () => {
  const [first, second] = JSON.parse(await readFile(fixturePath, 'utf8'))
  const documents = [first, second].map((product) => ({
    ...product,
    categories: product.categories.map((category: { nameVi: string; slug: string }) => ({ id: category.slug, ...category })),
    media: product.media.map((media: { alt: string; path: string }) => ({ id: media.path, ...media })),
  }))
  const requestedPages: number[] = []
  const payload = {
    async find(options: { page?: number }) {
      const page = options.page ?? 1
      requestedPages.push(page)
      return page === 1
        ? { docs: [documents[0]], hasNextPage: true, nextPage: 2 }
        : { docs: [documents[1]], hasNextPage: false, nextPage: null }
    },
  } as unknown as Payload

  const products = await new PayloadCatalogRepository(payload).listProducts()

  assert.deepEqual(requestedPages, [1, 2])
  assert.deepEqual(products.map((product) => product.legacySourceId), [first.legacySourceId, second.legacySourceId])
})
