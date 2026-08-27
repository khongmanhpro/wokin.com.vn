import { createHash } from 'node:crypto'

import { snapshotChecksum, stableStringify } from '../../../contracts/catalog-snapshot-validator.mjs'
import { validateImportInput } from './importer.js'
import type { PocProductInput } from './types.js'

function stableUuid(scope: string): string {
  const hex = createHash('sha256').update(`wokin-poc:${scope}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`
}

export function exportCatalogSnapshot(input: unknown) {
  const errors = validateImportInput(input)
  if (errors.length) throw new Error(`Snapshot export blocked by ${errors.length} validation error(s):\n${errors.join('\n')}`)
  const products = [...input as PocProductInput[]].sort((left, right) => left.legacySourceId - right.legacySourceId)
  const categoryBySlug = new Map<string, { id: string; nameVi: string; slug: string }>()
  const mediaByPath = new Map<string, { id: string; path: string; alt: string }>()

  for (const product of products) {
    for (const category of product.categories) categoryBySlug.set(category.slug, {
      id: stableUuid(`category:${category.slug}`),
      nameVi: category.nameVi,
      slug: category.slug,
    })
    for (const media of product.media) if (!mediaByPath.has(media.path)) mediaByPath.set(media.path, {
      id: stableUuid(`media:${media.path}`),
      path: media.path,
      alt: media.alt,
    })
  }

  const core = {
    schemaVersion: 1 as const,
    categories: [...categoryBySlug.values()].sort((left, right) => left.slug.localeCompare(right.slug)),
    media: [...mediaByPath.values()].sort((left, right) => left.path.localeCompare(right.path)),
    products: products.map((product) => ({
      id: product.id,
      legacySourceId: product.legacySourceId,
      sku: product.sku,
      nameVi: product.nameVi,
      slugVi: product.slugVi,
      categoryIds: product.categories.map((category) => stableUuid(`category:${category.slug}`)).sort(),
      mediaIds: product.media.map((media) => stableUuid(`media:${media.path}`)),
      specifications: product.specifications.map((specification) => ({ ...specification })),
    })),
  }
  const contentHash = createHash('sha256').update(stableStringify(core)).digest('hex')
  const withoutChecksum = { ...core, snapshotId: `poc-${contentHash.slice(0, 16)}` }
  return { ...withoutChecksum, checksum: snapshotChecksum(withoutChecksum) }
}
