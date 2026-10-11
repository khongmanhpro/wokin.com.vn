import { createHash } from 'node:crypto'
import type { CollectionBeforeValidateHook, Validate } from 'payload'

/** Products created by hand get ids in their own range so they never collide with wokintools.com source ids. */
export const MANUAL_LEGACY_SOURCE_ID_START = 900_000

type ProductData = { legacySourceId?: number | null; nameVi?: string | null; slugVi?: string | null; sourceMetadata?: Record<string, unknown> | null }

/**
 * Importers always send legacySourceId and sourceMetadata, so this only fills gaps for admin-created
 * products: the next id in the manual range and a "manual" provenance record.
 */
/** "Cờ lè vạn năng 9-32mm" → "co-le-van-nang-9-32mm" (Vietnamese diacritics and đ folded, like WordPress permalinks). */
export function vietnameseSlug(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120).replace(/-+$/g, '')
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Empty is fine (the hook below fills it from the name); anything typed must already be a clean slug. */
export const validateProductSlug: Validate = (value) =>
  value === undefined || value === null || value === '' || (typeof value === 'string' && SLUG_PATTERN.test(value))
    ? true
    : 'Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang, ví dụ co-le-van-nang.'

async function uniqueSlug(base: string, req: Parameters<CollectionBeforeValidateHook>[0]['req'], ownId?: unknown): Promise<string> {
  for (let attempt = 1; attempt < 50; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`
    const taken = await req.payload.find({ collection: 'products', where: { slugVi: { equals: candidate } }, limit: 1, depth: 0, trash: true, overrideAccess: true, req })
    if (!taken.docs.length || taken.docs[0].id === ownId) return candidate
  }
  return `${base}-${Date.now()}`
}

export const assignManualProductIdentity: CollectionBeforeValidateHook = async ({ data, operation, originalDoc, req }) => {
  if (!data) return data
  const product = data as ProductData
  // Like WordPress: leave the URL empty and it is made from the product name.
  if ((operation === 'create' || product.slugVi !== undefined) && !product.slugVi?.trim() && product.nameVi?.trim()) {
    product.slugVi = await uniqueSlug(vietnameseSlug(product.nameVi) || 'san-pham', req, originalDoc?.id)
  }
  if (operation !== 'create') return data
  if (product.legacySourceId == null) {
    const latest = await req.payload.find({
      collection: 'products',
      where: { legacySourceId: { greater_than_equal: MANUAL_LEGACY_SOURCE_ID_START } },
      sort: '-legacySourceId',
      limit: 1,
      depth: 0,
      trash: true,
      overrideAccess: true,
      req,
    })
    const previous = latest.docs[0]?.legacySourceId
    product.legacySourceId = typeof previous === 'number' ? previous + 1 : MANUAL_LEGACY_SOURCE_ID_START
  }
  if (!product.sourceMetadata?.sourceType) {
    const slug = product.slugVi?.trim() || `san-pham-${product.legacySourceId}`
    product.sourceMetadata = {
      sourceType: 'manual',
      legacySlug: slug,
      sourceName: product.nameVi?.trim() || slug,
      legacyDescription: '',
      sourceChecksum: 'manual',
      canonicalSlugSha256: createHash('sha256').update(slug).digest('hex'),
      importedAt: new Date().toISOString(),
    }
  }
  return product
}

/** Required in the database, but filled by assignManualProductIdentity when an admin creates a product. */
export const requiredAfterCreate: Validate = (value, { operation }) =>
  operation === 'create' || (value !== undefined && value !== null && value !== '') ? true : 'Trường này là bắt buộc.'
