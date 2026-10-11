import type { DefaultServerCellComponentProps } from 'payload'

import { productStatusLabel } from '../lib/productOperations'
import { WokinStatusBadge } from './WokinStatusBadge'

export function ProductStatusBadge({ status }: { status: unknown }) {
  const value = typeof status === 'string' ? status : 'unknown'
  return <WokinStatusBadge label={productStatusLabel(status)} status={value} />
}

export function ProductStatusCell({ cellData }: DefaultServerCellComponentProps) {
  return <ProductStatusBadge status={cellData} />
}
