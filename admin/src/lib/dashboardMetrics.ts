import { hasCapability, type Capability, type Role } from '../access/hasCapability'

export type DashboardUser = { active?: boolean; role?: Role } | undefined
export type DashboardMetricKey = 'products' | 'drafts' | 'inReview' | 'changesRequested' | 'mediaPending' | 'reviewRequests'
export type DashboardMetricCollection = 'products' | 'media' | 'review-requests'

export type DashboardMetricDefinition = {
  key: DashboardMetricKey
  label: string
  href: string
  collection: DashboardMetricCollection
  where?: Record<string, { equals: string }>
  capability?: Capability
  restricted: boolean
}

const metricDefinitions: Omit<DashboardMetricDefinition, 'restricted'>[] = [
  { key: 'products', label: 'Tổng sản phẩm', href: '/admin/collections/products', collection: 'products', capability: 'product.read' },
  { key: 'drafts', label: 'Bản nháp', href: '/admin/collections/products?where[status][equals]=draft', collection: 'products', where: { status: { equals: 'draft' } }, capability: 'product.read' },
  { key: 'inReview', label: 'Đang duyệt', href: '/admin/collections/products?where[status][equals]=in_review', collection: 'products', where: { status: { equals: 'in_review' } }, capability: 'product.read' },
  { key: 'changesRequested', label: 'Cần sửa', href: '/admin/collections/products?where[status][equals]=changes_requested', collection: 'products', where: { status: { equals: 'changes_requested' } }, capability: 'product.read' },
  { key: 'mediaPending', label: 'Media chờ quyền', href: '/admin/collections/media?where[rightsStatus][equals]=pending', collection: 'media', where: { rightsStatus: { equals: 'pending' } }, capability: 'media.update' },
  { key: 'reviewRequests', label: 'Yêu cầu mở', href: '/admin/collections/review-requests?where[state][equals]=open', collection: 'review-requests', where: { state: { equals: 'open' } }, capability: 'product.review' },
]

export function dashboardMetricDefinitions(user: DashboardUser): DashboardMetricDefinition[] {
  return metricDefinitions.map((metric) => ({
    ...metric,
    restricted: !metric.capability || !hasCapability(user, metric.capability),
  }))
}

export function visibleDashboardMetrics(user: DashboardUser): DashboardMetricDefinition[] {
  return dashboardMetricDefinitions(user).filter((metric) => !metric.restricted)
}
