import assert from 'node:assert/strict'
import test from 'node:test'

import { Products } from '../src/collections/Products.js'

type NamedField = { name?: string; type?: string; admin?: { readOnly?: boolean } }
type EditorTab = { label: string; fields: NamedField[] }

function editorTabs(): EditorTab[] {
  const tabs = Products.fields.find((field) => field.type === 'tabs')
  assert.ok(tabs && 'tabs' in tabs)
  return tabs.tabs as EditorTab[]
}

test('P0-5-R mounts product operations as a body-flow UI field after native tabs', () => {
  assert.equal(Products.admin?.components?.edit?.beforeDocumentControls, undefined)

  const tabsIndex = Products.fields.findIndex((field) => field.type === 'tabs')
  const operationsIndex = Products.fields.findIndex((field) => 'name' in field && field.name === 'productOperations')
  const operations = Products.fields[operationsIndex]

  assert.ok(tabsIndex >= 0)
  assert.ok(operationsIndex > tabsIndex)
  assert.ok(operations && 'name' in operations && operations.name === 'productOperations')
  assert.equal(operations.type, 'ui')
  assert.equal(operations.admin?.components?.Field, '/components/ProductEditorHeader#ProductEditorHeader')
})

test('R5.2 organizes the Product editor into native Vietnamese sections without changing field paths', () => {
  const tabs = editorTabs()

  assert.deepEqual(tabs.map((tab) => tab.label), [
    'Định danh',
    'Nội dung tiếng Việt',
    'Thông số kỹ thuật',
    'Đóng gói & thuộc tính',
    'Danh mục & hình ảnh',
    'SEO',
    'Vòng đời & kiểm tra',
    'Nguồn gốc',
  ])
  assert.deepEqual(tabs.map((tab) => tab.fields.map((field) => field.name)), [
    ['legacySourceId', 'sku'],
    ['nameVi', 'slugVi', 'descriptionVi'],
    ['specifications'],
    ['packaging', 'attributes'],
    ['categories', 'media'],
    ['seo'],
    ['status', 'publishedAt'],
    ['sourceMetadata'],
  ])

  const identity = tabs[0]?.fields[0] as NamedField
  assert.equal(identity.admin?.readOnly, true)
  assert.equal(tabs.at(-1)?.fields[0]?.admin?.readOnly, true)
})
