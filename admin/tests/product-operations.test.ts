import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { Products } from '../src/collections/Products.js'
import { ProductReadinessBadge } from '../src/components/ProductReadinessBadge.js'
import { ProductStatusBadge } from '../src/components/ProductStatusBadge.js'
import { getProductReadiness, getProductWorkflowActions, productStatusLabel } from '../src/lib/productOperations.js'

test('UX-4 gives status and readiness a readable, deterministic operational meaning', () => {
  assert.equal(productStatusLabel('changes_requested'), 'Cần chỉnh sửa')
  const statusMarkup = renderToStaticMarkup(createElement(ProductStatusBadge, { status: 'approved' }))
  assert.match(statusMarkup, /wokin-status-badge--success/)
  assert.match(statusMarkup, /Đã duyệt/)

  assert.deepEqual(getProductReadiness({
    categories: ['cat-1'],
    media: ['media-1'],
    seo: { title: 'Máy khoan', description: 'Mô tả', canonicalPath: '/san-pham/may-khoan', noIndex: false },
  }), { media: 'ready', seo: 'ready' })
  assert.match(renderToStaticMarkup(createElement(ProductReadinessBadge, { type: 'media', readiness: 'missing' })), /Thiếu hình ảnh/)
})

test('UX-4 presents only policy-permitted workflow actions for the current state and role', () => {
  assert.deepEqual(getProductWorkflowActions('editor', 'draft'), ['save_draft', 'preview', 'request_review'])
  assert.deepEqual(getProductWorkflowActions('publisher', 'in_review'), ['preview', 'request_changes', 'approve'])
  assert.deepEqual(getProductWorkflowActions('publisher', 'approved'), ['preview', 'publish'])
  assert.deepEqual(getProductWorkflowActions('readonly', 'approved'), ['preview'])
})

test('UX-4 configures native triage cells without changing immutable source fields or server policies', () => {
  assert.deepEqual(Products.admin?.defaultColumns, ['nameVi', 'sku', 'status', 'categories', 'legacySourceId', 'slugVi'])

  const tabs = Products.fields.find((field) => field.type === 'tabs')
  assert.ok(tabs && 'tabs' in tabs)
  const fields = tabs.tabs.flatMap((tab) => tab.fields)
  const byName = new Map(fields.filter((field) => 'name' in field).map((field) => [field.name, field]))

  assert.equal(byName.get('status')?.admin?.components?.Cell, '/components/ProductStatusBadge#ProductStatusCell')
  assert.equal(byName.get('media')?.admin?.components?.Cell, '/components/ProductReadinessBadge#ProductMediaReadinessCell')
  assert.equal(byName.get('seo')?.admin?.components?.Cell, '/components/SeoReadinessBadge#ProductSeoReadinessCell')
  assert.equal((byName.get('legacySourceId')?.admin as { readOnly?: boolean } | undefined)?.readOnly, true)
  assert.equal((byName.get('sourceMetadata')?.admin as { readOnly?: boolean } | undefined)?.readOnly, true)
})
