'use client'

import { useAuth } from '@payloadcms/ui'
import { useEffect, useMemo, useState } from 'react'

import type { Role } from '../access/hasCapability'
import { buildCategoryTree, categoryDeleteWarning, categoryStatusLabel, categoryWorkspaceState, filterCategoriesForWorkspace, type CategoryRecord, type CategoryTreeNode } from '../lib/mediaCategoryWorkspace'
import { CategoryProductCount } from './CategoryProductCount'
import { WokinEmptyState } from './WokinEmptyState'
import { WokinErrorState } from './WokinErrorState'

type CategoryResponse = { docs?: CategoryRecord[] }
type ProductResponse = { docs?: Array<{ categories?: Array<string | { id: string }> }> }

function CategoryBranch({ node }: { node: CategoryTreeNode }) {
  const warning = categoryDeleteWarning({ productCount: node.productCount, childCount: node.children.length })
  return <li className="wokin-category-node">
    <article className="wokin-category-card">
      <div className="wokin-category-card__heading"><h2>{node.nameVi}</h2><span className={`wokin-category-status wokin-category-status--${node.status}`}>{categoryStatusLabel(node.status)}</span></div>
      <dl className="wokin-category-card__facts"><div><dt>Slug</dt><dd><code>/{node.slug}</code></dd></div><div><dt>Sản phẩm</dt><dd><CategoryProductCount count={node.productCount} /></dd></div><div><dt>Danh mục con</dt><dd>{node.children.length}</dd></div></dl>
      <div className="wokin-category-card__actions"><a href={`/admin/collections/categories/${node.id}`}>Chỉnh sửa</a></div>
      {warning ? <p className="wokin-category-node__warning">{warning} Kiểm tra chuyển hướng trước khi đổi slug.</p> : <p className="wokin-category-node__safe">Chưa có liên kết cần cảnh báo.</p>}
    </article>
    {node.children.length > 0 && <ul>{node.children.map((child) => <CategoryBranch key={child.id} node={child} />)}</ul>}
  </li>
}

export function CategoryTree() {
  const { user } = useAuth<{ active?: boolean; role?: Role }>()
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [products, setProducts] = useState<Array<{ categories?: Array<string | { id: string }> }>>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'draft' | 'active' | 'archived'>('all')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/categories?limit=0&depth=0', { credentials: 'same-origin' }),
      fetch('/api/products?limit=0&depth=0', { credentials: 'same-origin' }),
    ]).then(async ([categoryResponse, productResponse]) => {
      if (!categoryResponse.ok || !productResponse.ok) throw new Error('Không thể tải dữ liệu danh mục.')
      return Promise.all([categoryResponse.json() as Promise<CategoryResponse>, productResponse.json() as Promise<ProductResponse>])
    }).then(([categoryData, productData]) => {
      if (!active) return
      setCategories(categoryData.docs ?? [])
      setProducts(productData.docs ?? [])
    }).catch((reason: Error) => { if (active) setError(reason.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const visibleCategories = useMemo(() => filterCategoriesForWorkspace(categories, { query, status }), [categories, query, status])
  const tree = useMemo(() => buildCategoryTree(visibleCategories, products), [visibleCategories, products])
  const workspace = categoryWorkspaceState(user ?? undefined, visibleCategories.length)

  return <main className="wokin-workspace" aria-labelledby="category-workspace-title">
    <header><p className="wokin-nav__label">Catalog / Danh mục</p><h1 id="category-workspace-title">Không gian làm việc danh mục</h1><p>Xem cấu trúc cha–con, trạng thái và số sản phẩm đang liên kết.</p></header>
    <div className="wokin-workspace__commands" aria-label="Thao tác danh mục">
      {workspace.canManage && <a className="wokin-workspace__primary-action" href="/admin/collections/categories/create">Tạo danh mục</a>}
      <a className="wokin-workspace__secondary-action" href="/admin/collections/categories">Mở danh sách chuẩn</a>
    </div>
    <div className="wokin-workspace__filters">
      <label className="wokin-workspace__search">Tìm kiếm danh mục<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên tiếng Việt hoặc slug" /></label>
      <label>Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Tất cả trạng thái</option><option value="draft">Bản nháp</option><option value="active">Đang hoạt động</option><option value="archived">Đã lưu trữ</option></select></label>
      <p className="wokin-workspace__result" role="status" aria-live="polite">{workspace.resultSummary}</p>
    </div>
    {loading && <p className="wokin-state" role="status">Đang tải danh mục…</p>}
    {error && <WokinErrorState title="Không thể tải dữ liệu danh mục" description={error} />}
    {!loading && !error && !tree.length && <WokinEmptyState title="Không tìm thấy danh mục phù hợp" description="Thử tìm theo tên tiếng Việt, slug hoặc trạng thái khác." />}
    {!loading && !error && tree.length > 0 && <ul className="wokin-category-tree">{tree.map((node) => <CategoryBranch key={node.id} node={node} />)}</ul>}
  </main>
}
