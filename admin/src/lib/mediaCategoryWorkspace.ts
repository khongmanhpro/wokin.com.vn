import { hasCapability, type AdminIdentity } from '../access/hasCapability'
import { appendQueryObject, workspacePage } from './workspacePagination'

export type MediaRightsStatus = 'pending' | 'cleared' | 'restricted' | 'expired'

export type MediaLibraryFilters = {
  duplicate?: boolean
  missingAlt?: boolean
  orphan?: boolean
  query?: string
  rights?: MediaRightsStatus
}

export function getMediaLibraryQuery(filters: MediaLibraryFilters) {
  const conditions: Array<Record<string, unknown>> = []
  const query = filters.query?.trim()
  if (query) conditions.push({ or: [{ path: { contains: query } }, { storageKey: { contains: query } }, { contentSha256: { contains: query } }] })
  if (filters.rights) conditions.push({ rightsStatus: { equals: filters.rights } })
  if (filters.missingAlt) conditions.push({ or: [{ alt: { equals: '' } }, { alt: { exists: false } }] })
  return { where: { and: conditions } }
}

export function mediaLibraryQueryString(filters: MediaLibraryFilters, page: number, sort = '-createdAt'): string {
  const allowedSort = sort === 'createdAt' ? 'createdAt' : '-createdAt'
  const params = new URLSearchParams({ limit: '25', depth: '0', page: String(workspacePage(page)), sort: `${allowedSort},id` })
  appendQueryObject(params, 'where', getMediaLibraryQuery(filters).where)
  return params.toString()
}

export function mediaLibraryState(user: AdminIdentity | undefined) {
  return { canUpdateRights: hasCapability(user, 'media.update'), importManaged: true }
}

export function mediaPreviewURL(path: string) {
  return path.startsWith('/') ? path : `/${path}`
}

export function mediaRightsUpdateRequest(id: string, rightsStatus: MediaRightsStatus) {
  return {
    url: `/api/media/${id}`,
    init: { method: 'PATCH', credentials: 'same-origin' as const, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rightsStatus }) },
  }
}

export type CategoryRecord = { id: string; nameVi: string; slug: string; status: string; parent?: null | string | { id: string } }
export type CategoryTreeNode = CategoryRecord & { children: CategoryTreeNode[]; productCount: number }
export type CategoryWorkspaceFilters = { query?: string; status?: 'all' | 'draft' | 'active' | 'archived' }

export function categoryWorkspaceQuery(query: string) {
  const value = query.trim()
  return { where: { or: [{ nameVi: { contains: value } }, { slug: { contains: value } }] } }
}

export function categoryStatusLabel(status: string) {
  return ({ active: 'Đang hoạt động', draft: 'Bản nháp', archived: 'Đã lưu trữ' } as Record<string, string>)[status] ?? status
}

function categoryParentID(category: CategoryRecord) {
  return typeof category.parent === 'object' ? category.parent?.id : category.parent
}

export function filterCategoriesForWorkspace(categories: readonly CategoryRecord[], filters: CategoryWorkspaceFilters): CategoryRecord[] {
  const query = filters.query?.trim().toLocaleLowerCase('vi') ?? ''
  const status = filters.status ?? 'all'
  const byID = new Map(categories.map((category) => [category.id, category]))
  const visible = new Set(categories.filter((category) => {
    const matchesQuery = !query || `${category.nameVi} ${category.slug}`.toLocaleLowerCase('vi').includes(query)
    return matchesQuery && (status === 'all' || category.status === status)
  }).map((category) => category.id))
  for (const category of categories) {
    if (!visible.has(category.id)) continue
    let parentID = categoryParentID(category)
    while (parentID) {
      visible.add(parentID)
      parentID = byID.get(parentID) ? categoryParentID(byID.get(parentID)!) : undefined
    }
  }
  return categories.filter((category) => visible.has(category.id))
}

export function categoryWorkspaceState(user: AdminIdentity | undefined, visibleCount: number) {
  return { canManage: hasCapability(user, 'category.manage'), visibleCount, resultSummary: visibleCount === 0 ? 'Không có danh mục phù hợp' : `Hiển thị ${visibleCount} danh mục` }
}

export function buildCategoryTree(categories: CategoryRecord[], products: Array<{ categories?: Array<string | { id: string }> }>): CategoryTreeNode[] {
  const counts = new Map<string, number>()
  for (const product of products) for (const category of product.categories ?? []) {
    const id = typeof category === 'string' ? category : category.id
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const nodes = new Map<string, CategoryTreeNode>(categories.map((category) => [category.id, { ...category, children: [], productCount: counts.get(category.id) ?? 0 }]))
  const roots: CategoryTreeNode[] = []
  for (const category of categories) {
    const node = nodes.get(category.id)!
    const parentID = categoryParentID(category)
    const parent = parentID ? nodes.get(parentID) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

export function categoryDeleteWarning({ productCount, childCount }: { productCount: number; childCount: number }) {
  const impacts = [productCount ? `${productCount} sản phẩm` : '', childCount ? `${childCount} danh mục con` : ''].filter(Boolean)
  return impacts.length ? `Không xóa khi còn liên kết: ${impacts.join(' và ')}.` : null
}
