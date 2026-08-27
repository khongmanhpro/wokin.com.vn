import assert from 'node:assert/strict'
import test from 'node:test'
import type { CollectionConfig } from 'payload'

import config from '../src/payload.config.js'
import { Categories } from '../src/collections/Categories.js'
import { Media } from '../src/collections/Media.js'
import { Products } from '../src/collections/Products.js'

function allFields(fields: CollectionConfig['fields']): CollectionConfig['fields'] {
  return fields.flatMap((field) => {
    if (field.type === 'tabs') return allFields(field.tabs.flatMap((tab) => tab.fields))
    return [field]
  })
}

function fieldNames(collection: CollectionConfig) {
  return new Set(allFields(collection.fields).map((field) => 'name' in field ? field.name : undefined).filter(Boolean))
}

test('R3 registers only the catalog model and migration-contract foundation collections', async () => {
  const payloadConfig = await config
  assert.deepEqual(
    payloadConfig.collections?.map((collection) => collection.slug).slice(0, 9),
    ['admins', 'categories', 'media', 'products', 'pages', 'redirects', 'catalog-snapshots', 'releases', 'audit-events'],
  )
})

test('products expose production identity, lifecycle, Vietnamese content, structured data, relations, SEO and provenance', () => {
  const names = fieldNames(Products)
  for (const name of [
    'legacySourceId', 'sku', 'status', 'nameVi', 'slugVi', 'descriptionVi',
    'specifications', 'packaging', 'attributes', 'categories', 'media',
    'publishedAt', 'seo', 'sourceMetadata',
  ]) assert.ok(names.has(name), name)

  const legacySourceId = allFields(Products.fields).find((field) => 'name' in field && field.name === 'legacySourceId')
  const sku = allFields(Products.fields).find((field) => 'name' in field && field.name === 'sku')
  const status = allFields(Products.fields).find((field) => 'name' in field && field.name === 'status')
  assert.equal(legacySourceId && 'unique' in legacySourceId ? legacySourceId.unique : undefined, true)
  assert.equal(legacySourceId && 'index' in legacySourceId ? legacySourceId.index : undefined, true)
  assert.notEqual(sku && 'unique' in sku ? sku.unique : undefined, true)
  assert.equal(sku && 'required' in sku ? sku.required : undefined, false)
  assert.deepEqual(
    status && 'options' in status ? status.options?.map((option) => typeof option === 'string' ? option : option.value) : [],
    ['draft', 'in_review', 'approved', 'published', 'archived'],
  )
})

test('categories and media expose migration identity, hierarchy, rights and content integrity fields', () => {
  const categoryNames = fieldNames(Categories)
  for (const name of ['legacySourceId', 'nameVi', 'slug', 'status', 'parent', 'sortOrder', 'seo']) assert.ok(categoryNames.has(name), name)

  const mediaNames = fieldNames(Media)
  for (const name of ['path', 'alt', 'metadata', 'width', 'height', 'contentSha256', 'storageKey', 'rightsStatus', 'variants']) {
    assert.ok(mediaNames.has(name), name)
  }
})
