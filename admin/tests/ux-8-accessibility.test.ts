import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { WokinConfirmAction } from '../src/components/WokinConfirmAction.js'
import { WokinEmptyState } from '../src/components/WokinEmptyState.js'
import { WokinErrorState } from '../src/components/WokinErrorState.js'
import { WokinIcon } from '../src/components/WokinBrand.js'
import { WokinStatusBadge, wokinStatus } from '../src/components/WokinStatusBadge.js'

test('UX-8 state modifiers follow the base rule so their semantic colours win the cascade', () => {
  const stylesheet = readFileSync(new URL('../src/app/(payload)/custom.scss', import.meta.url), 'utf8')
  const baseRule = stylesheet.indexOf('.wokin-state { background:')
  const errorModifier = stylesheet.indexOf('.wokin-state--error { border-color:')
  const successModifier = stylesheet.indexOf('.wokin-state--success { border-color:')

  assert.ok(baseRule >= 0, 'the neutral .wokin-state rule must exist')
  assert.ok(errorModifier > baseRule, 'the error modifier must follow the base rule')
  assert.ok(successModifier > baseRule, 'the success modifier must follow the base rule')
})

test('UX-8 presents semantic status with a Vietnamese label and non-colour indicator', () => {
  assert.deepEqual(wokinStatus('approved'), {
    label: 'Đã duyệt',
    symbol: '✓',
    tone: 'success',
  })

  const markup = renderToStaticMarkup(createElement(WokinStatusBadge, { status: 'approved' }))
  assert.match(markup, /wokin-status-badge--success/)
  assert.match(markup, /aria-hidden="true" class="wokin-status-badge__symbol">✓/)
  assert.match(markup, /Đã duyệt/)
})

test('UX-8 state components give Vietnamese recovery guidance with correct live semantics', () => {
  const emptyMarkup = renderToStaticMarkup(createElement(WokinEmptyState, {
    title: 'Chưa có yêu cầu',
    description: 'Thử đổi bộ lọc hoặc quay lại sau.',
  }))
  const errorMarkup = renderToStaticMarkup(createElement(WokinErrorState, {
    title: 'Không thể tải dữ liệu',
    description: 'Hãy làm mới trang hoặc liên hệ quản trị hệ thống.',
  }))

  assert.match(emptyMarkup, /role="status"/)
  assert.match(emptyMarkup, /Chưa có yêu cầu/)
  assert.match(errorMarkup, /role="alert"/)
  assert.match(errorMarkup, /Không thể tải dữ liệu/)
})

test('UX-8 confirmation trigger has one accessible name and advertises its dialog', () => {
  const markup = renderToStaticMarkup(createElement(WokinConfirmAction, {
    confirmLabel: 'Xác nhận yêu cầu sửa',
    label: 'Yêu cầu sửa',
    message: 'Sản phẩm sẽ chuyển sang trạng thái cần chỉnh sửa.',
    onConfirm: async () => undefined,
    title: 'Xác nhận yêu cầu sửa',
  }))

  assert.match(markup, /aria-haspopup="dialog"/)
  assert.match(markup, /<dialog aria-labelledby=/)
  assert.match(markup, /aria-modal="true"/)
  assert.match(markup, />Yêu cầu sửa</)
  assert.doesNotMatch(markup, /aria-label="Yêu cầu sửa"/)
})

test('UX-8 WOKIN icon exposes its accessible image semantics', () => {
  const markup = renderToStaticMarkup(createElement(WokinIcon))

  assert.match(markup, /role="img"/)
  assert.match(markup, /aria-label="WOKIN Admin"/)
})
