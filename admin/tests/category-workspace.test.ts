import assert from 'node:assert/strict'
import test from 'node:test'

import { Categories } from '../src/collections/Categories.js'
import { buildCategoryTree, categoryDeleteWarning, categoryStatusLabel, categoryWorkspaceQuery, categoryWorkspaceState, filterCategoriesForWorkspace } from '../src/lib/mediaCategoryWorkspace.js'
import { adminComponents } from '../src/payload.config.js'

test('UX-6 derives a searchable category workspace and real product counts from supplied catalog records', () => {
  assert.deepEqual(categoryWorkspaceQuery('may khoan'), {
    where: { or: [{ nameVi: { contains: 'may khoan' } }, { slug: { contains: 'may khoan' } }] },
  })
  assert.equal(categoryStatusLabel('active'), 'Đang hoạt động')
  assert.deepEqual(buildCategoryTree([
    { id: 'root', nameVi: 'Dụng cụ điện', slug: 'dung-cu-dien', status: 'active', parent: null },
    { id: 'child', nameVi: 'Máy khoan', slug: 'may-khoan', status: 'draft', parent: 'root' },
  ], [
    { categories: ['root', 'child'] }, { categories: ['child'] },
  ]), [{
    id: 'root', nameVi: 'Dụng cụ điện', slug: 'dung-cu-dien', status: 'active', parent: null, productCount: 1,
    children: [{ id: 'child', nameVi: 'Máy khoan', slug: 'may-khoan', status: 'draft', parent: 'root', productCount: 2, children: [] }],
  }])
})

test('UX-6 warns before deleting referenced categories without changing the existing server delete policy', () => {
  assert.match(categoryDeleteWarning({ productCount: 2, childCount: 1 }) ?? '', /2 sản phẩm|1 danh mục con/)
  assert.equal(categoryDeleteWarning({ productCount: 0, childCount: 0 }), null)
  assert.ok(Categories.access?.delete)
  assert.deepEqual(adminComponents.views?.categoryWorkspace, {
    Component: '/components/CategoryTree#CategoryTree',
    path: '/category-workspace',
  })
})

test('UX-A filters categories by status and search while retaining each matching descendant’s ancestors', () => {
  const categories = [
    { id: 'root', nameVi: 'Dụng cụ điện', slug: 'dung-cu-dien', status: 'active', parent: null },
    { id: 'branch', nameVi: 'Máy khoan', slug: 'may-khoan', status: 'draft', parent: 'root' },
    { id: 'leaf', nameVi: 'Mũi khoan bê tông', slug: 'mui-khoan-be-tong', status: 'active', parent: 'branch' },
    { id: 'other', nameVi: 'Dụng cụ cầm tay', slug: 'dung-cu-cam-tay', status: 'archived', parent: null },
  ] as const

  assert.deepEqual(filterCategoriesForWorkspace(categories, { query: 'bê tông', status: 'active' }).map((category) => category.id), ['root', 'branch', 'leaf'])
  assert.deepEqual(filterCategoriesForWorkspace(categories, { status: 'archived' }).map((category) => category.id), ['other'])
})

test('UX-A reports deterministic visible results and gates the create command from authenticated capabilities', () => {
  assert.deepEqual(categoryWorkspaceState({ active: true, role: 'owner' }, 3), { canManage: true, visibleCount: 3, resultSummary: 'Hiển thị 3 danh mục' })
  assert.deepEqual(categoryWorkspaceState({ active: true, role: 'readonly' }, 0), { canManage: false, visibleCount: 0, resultSummary: 'Không có danh mục phù hợp' })
})
