import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ReviewRequests } from '../src/collections/ReviewRequests.js'
import { ReviewQueue } from '../src/components/ReviewQueue.js'
import { ReviewRequestCard } from '../src/components/ReviewRequestCard.js'
import { changedFieldNames, queueRequests, reviewActions, reviewStatusLabel, type ReviewQueueRequest } from '../src/lib/reviewQueue.js'

test('UX-5 mounts the editorial queue as a supported native Payload collection view', () => {
  const views = (ReviewRequests.admin as { components?: { views?: Record<string, { Component?: string; exact?: boolean; path?: string }> } } | undefined)?.components?.views

  assert.deepEqual(views?.queue, {
    Component: '/components/ReviewQueue#ReviewQueue',
    exact: true,
    path: '/queue',
  })
})

test('UX-9 accepts the authenticated Payload custom-view identity from initPageResult', async () => {
  const markup = renderToStaticMarkup(await ReviewQueue({
    initPageResult: { req: { user: { active: true, collection: 'admins', createdAt: '2026-08-29T00:00:00.000Z', email: 'owner@example.test', id: 'owner-1', role: 'owner', updatedAt: '2026-08-29T00:00:00.000Z' } } } as never,
    payload: { find: async () => ({ docs: [] }) } as never,
  }))

  assert.doesNotMatch(markup, /Phiên đăng nhập không hợp lệ/)
  assert.match(markup, /Hàng chờ rà soát/)
})

const request: ReviewQueueRequest = {
  comment: 'Kiểm tra thông số mô-men xoắn.',
  createdAt: '2026-08-28T01:00:00.000Z',
  id: 'review-1',
  product: { id: 'product-1', nameVi: 'Máy khoan pin', sku: 'WK-01', status: 'in_review' },
  requester: { id: 'editor-1', role: 'editor', email: 'editor@example.test' },
  reviewer: { id: 'publisher-1', role: 'publisher', email: 'publisher@example.test' },
  state: 'open',
  updatedAt: '2026-08-28T02:00:00.000Z',
}

test('UX-5 groups real review documents into the four editorial work queues', () => {
  const resolved = { ...request, id: 'review-2', state: 'resolved' as const }
  const changes = { ...request, id: 'review-3', product: { ...request.product!, status: 'changes_requested' } }
  const requests = [request, resolved, changes]

  assert.deepEqual(queueRequests(requests, { id: 'publisher-1', role: 'publisher' }, 'assigned').map(({ id }) => id), ['review-1', 'review-3'])
  assert.deepEqual(queueRequests(requests, { id: 'editor-1', role: 'editor' }, 'requested').map(({ id }) => id), ['review-1', 'review-2', 'review-3'])
  assert.deepEqual(queueRequests(requests, { id: 'publisher-1', role: 'publisher' }, 'changes').map(({ id }) => id), ['review-3'])
  assert.deepEqual(queueRequests(requests, { id: 'publisher-1', role: 'publisher' }, 'completed').map(({ id }) => id), ['review-2'])
})

test('UX-5 shows editorial actions only where the current server policy can permit them', () => {
  assert.deepEqual(reviewActions(request, { id: 'publisher-1', role: 'publisher' }), ['open_product', 'request_changes', 'approve_resolve', 'view_history'])
  assert.deepEqual(reviewActions(request, { id: 'owner-1', role: 'owner' }), ['open_product', 'request_changes', 'approve_resolve', 'view_history'])
  assert.deepEqual(reviewActions(request, { id: 'editor-1', role: 'editor' }), ['open_product'])
  assert.deepEqual(reviewActions(request, { id: 'readonly-1', role: 'readonly' }), ['open_product'])
  assert.deepEqual(reviewActions({ ...request, state: 'resolved' }, { id: 'publisher-1', role: 'publisher' }), ['open_product', 'view_history'])
})

test('UX-5 cards render Vietnamese operational context and an audit-derived change summary', () => {
  assert.equal(reviewStatusLabel('open'), 'Đang chờ xử lý')
  assert.deepEqual(changedFieldNames({ nameVi: 'Cũ', sku: 'A', updatedAt: 'old' }, { nameVi: 'Mới', sku: 'A', updatedAt: 'new' }), ['nameVi'])
  const markup = renderToStaticMarkup(createElement(ReviewRequestCard, {
    actions: ['open_product'],
    changedFields: ['nameVi', 'specifications'],
    request,
  }))
  assert.match(markup, /Máy khoan pin/)
  assert.match(markup, /Người gửi/)
  assert.match(markup, /Thay đổi gần nhất/)
  assert.match(markup, /Mở sản phẩm/)
})
