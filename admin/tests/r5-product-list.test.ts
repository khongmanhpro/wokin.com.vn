import assert from 'node:assert/strict'
import test from 'node:test'
import type { CollectionConfig } from 'payload'
import { renderToStaticMarkup } from 'react-dom/server'

import { Products } from '../src/collections/Products.js'
import { ProductSkuCell } from '../src/components/ProductSkuCell.js'

function field(collection: CollectionConfig, name: string) {
  return collection.fields.flatMap((candidate) => candidate.type === 'tabs' ? candidate.tabs.flatMap((tab) => tab.fields) : [candidate])
    .find((candidate) => 'name' in candidate && candidate.name === name)
}

test('R5.1 configures the native Products list for catalog triage', () => {
  assert.deepEqual(Products.admin?.pagination, { defaultLimit: 25, limits: [25, 50, 100] })
  assert.deepEqual(Products.admin?.listSearchableFields, ['nameVi', 'sku', 'legacySourceId'])
  assert.deepEqual(Products.admin?.defaultColumns, ['nameVi', 'sku', 'status', 'categories', 'legacySourceId', 'slugVi'])

  const sku = field(Products, 'sku')
  assert.equal(sku && 'admin' in sku ? sku.admin?.components?.Cell : undefined, '/components/ProductSkuCell#ProductSkuCell')
})

test('R5.1 shows the duplicate-SKU badge only when the global SKU count exceeds one', async () => {
  const calls: unknown[] = []
  let total = 0
  const payload = {
    find: async (options: unknown) => {
      calls.push(options)
      return { totalDocs: total }
    },
  }
  const render = async (cellData: string) => renderToStaticMarkup(await ProductSkuCell({ cellData, payload } as never))

  assert.doesNotMatch(await render(''), /SKU trùng lặp/)
  assert.equal(calls.length, 0)

  total = 1
  assert.doesNotMatch(await render('WOK-001'), /SKU trùng lặp/)
  assert.deepEqual(calls.at(-1), {
    collection: 'products',
    limit: 0,
    where: { sku: { equals: 'WOK-001' } },
  })

  total = 2
  assert.match(await render('WOK-002'), /SKU trùng lặp/)
  assert.deepEqual(calls.at(-1), {
    collection: 'products',
    limit: 0,
    where: { sku: { equals: 'WOK-002' } },
  })
})
