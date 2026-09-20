import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { adminComponents } from '../src/payload.config.js'
import { Products } from '../src/collections/Products.js'
import { ReleaseReadiness } from '../src/components/ReleaseReadiness.js'
import { ReleaseCenter } from '../src/components/ReleaseCenter.js'
import { SeoReadinessBadge } from '../src/components/SeoReadinessBadge.js'
import { releaseCenterState } from '../src/lib/releaseCenter.js'
import { enforceReleaseReadiness } from '../src/access/releaseReadiness.js'

const validatedSnapshot = {
  id: 'snapshot-db-1',
  snapshotId: 'release-abc123',
  checksum: 'a'.repeat(64),
  status: 'validated',
  counts: { products: 120, categories: 30, media: 240 },
  createdAt: '2026-08-28T12:00:00.000Z',
  createdBy: { email: 'owner@example.test' },
}

test('UX-7 exposes a supported, role-aware Release center view without a runtime build operation', () => {
  assert.deepEqual(adminComponents.views?.releaseCenter, {
    Component: '/components/ReleaseCenter#ReleaseCenter',
    path: '/release-center',
  })

  assert.deepEqual(releaseCenterState('editor', validatedSnapshot, undefined), {
    canCreateSnapshot: false,
    canApprove: false,
    canRollback: false,
    canPublish: false,
    buildArtifactState: 'blocked_import_managed',
  })
  assert.deepEqual(releaseCenterState('publisher', validatedSnapshot, { id: 'previous-release', status: 'released' }), {
    canCreateSnapshot: true,
    canApprove: true,
    canRollback: true,
    canPublish: false,
    buildArtifactState: 'blocked_import_managed',
  })
})

test('UX-7 makes persisted validation blockers and pipeline truth visible before approval or release', () => {
  const markup = renderToStaticMarkup(createElement(ReleaseReadiness, {
    snapshot: { ...validatedSnapshot, importReport: { errors: ['Thiếu ảnh đã xác nhận quyền', 'Canonical không hợp lệ'] } },
    release: { id: 'release-db-1', name: 'Phát hành tháng 8', status: 'draft', createdAt: '2026-08-28T13:00:00.000Z' },
  }))

  assert.match(markup, /release-abc123/)
  assert.match(markup, /120/)
  assert.match(markup, /Thiếu ảnh đã xác nhận quyền/)
  assert.match(markup, /Validate snapshot/)
  assert.match(markup, /BLOCKED: Tạo build artifact/)
  assert.match(markup, /Chưa sẵn sàng/)
})

test('UX-7 gives product SEO a concrete Vietnamese readiness explanation and source-domain canonical error', () => {
  const markup = renderToStaticMarkup(createElement(SeoReadinessBadge, {
    seo: {
      title: 'Máy khoan WOKIN',
      description: '',
      canonicalPath: 'https://www.wokintools.com/product/drill',
      noIndex: false,
    },
    slugVi: 'may-khoan-wokin',
  }))

  assert.match(markup, /Chưa sẵn sàng SEO/)
  assert.match(markup, /Thiếu mô tả SEO/)
  assert.match(markup, /Canonical phải là đường dẫn nội bộ/)
  assert.match(markup, /JSON-LD cần bổ sung/)

  const tabs = Products.fields.find((field) => field.type === 'tabs')
  assert.ok(tabs && 'tabs' in tabs)
  const seo = tabs.tabs.flatMap((tab) => tab.fields).find((field) => 'name' in field && field.name === 'seo')
  assert.equal(seo?.admin?.components?.Cell, '/components/SeoReadinessBadge#ProductSeoReadinessCell')
})

test('UX-7 prevents a release API update from bypassing persisted snapshot validation', async () => {
  const request = (snapshot: Record<string, unknown>) => ({
    user: { active: true, role: 'publisher' },
    payload: { find: async () => ({ docs: [snapshot] }) },
  })
  await assert.rejects(
    () => enforceReleaseReadiness({ data: { status: 'ready', catalogSnapshot: 'snapshot-db-1' }, req: request({ ...validatedSnapshot, status: 'draft' }) } as never),
    /Snapshot chưa được xác thực/,
  )
  await assert.doesNotReject(() => enforceReleaseReadiness({ data: { status: 'ready', catalogSnapshot: 'snapshot-db-1' }, req: request(validatedSnapshot) } as never))
})

test('Release Center accepts authenticated identity from initPageResult', async () => {
  const markup = renderToStaticMarkup(await ReleaseCenter({
    initPageResult: {
      req: {
        user: { active: true, role: 'owner' },
        payload: { find: async () => ({ docs: [] }) },
      },
    },
  } as never))

  assert.doesNotMatch(markup, /phiên đăng nhập không hợp lệ/)
  assert.match(markup, /Trung tâm phát hành/)
})
