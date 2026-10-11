import type { DefaultServerCellComponentProps } from 'payload'

export async function ProductSkuCell({ cellData, payload }: DefaultServerCellComponentProps) {
  const sku = typeof cellData === 'string' ? cellData : ''

  if (!sku) {
    return <span>—</span>
  }

  const { totalDocs } = await payload.find({
    collection: 'products',
    limit: 0,
    where: { sku: { equals: sku } },
  })

  return (
    <span>
      {sku}{' '}
      {totalDocs > 1 && (
        <span aria-label="SKU trùng lặp" style={{ border: '1px solid currentColor', borderRadius: '999px', fontSize: '0.75em', padding: '0.125rem 0.375rem' }}>
          SKU trùng lặp
        </span>
      )}
    </span>
  )
}
