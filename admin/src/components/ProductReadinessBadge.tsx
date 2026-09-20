import type { DefaultServerCellComponentProps } from 'payload'

import { getProductReadiness, type ProductReadiness } from '../lib/productOperations'
import { WokinStatusBadge } from './WokinStatusBadge'

type ReadinessType = 'media' | 'seo'

const labels: Record<ReadinessType, Record<ProductReadiness, string>> = {
  media: { ready: 'Đã gắn hình ảnh', missing: 'Thiếu hình ảnh' },
  seo: { ready: 'SEO sẵn sàng', missing: 'Thiếu SEO' },
}

export function ProductReadinessBadge({ type, readiness }: { type: ReadinessType; readiness: ProductReadiness }) {
  return <WokinStatusBadge label={labels[type][readiness]} status={readiness} />
}

export function ProductMediaReadinessCell({ rowData }: DefaultServerCellComponentProps) {
  return <ProductReadinessBadge type="media" readiness={getProductReadiness(rowData).media} />
}

export function ProductSeoReadinessCell({ rowData }: DefaultServerCellComponentProps) {
  return <ProductReadinessBadge type="seo" readiness={getProductReadiness(rowData).seo} />
}
