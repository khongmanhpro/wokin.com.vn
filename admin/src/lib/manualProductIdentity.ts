import { createHash } from 'node:crypto'
import type { CollectionBeforeValidateHook, Validate } from 'payload'

/** Products created by hand get ids in their own range so they never collide with wokintools.com source ids. */
export const MANUAL_LEGACY_SOURCE_ID_START = 900_000

type ProductData = { legacySourceId?: number | null; nameVi?: string | null; slugVi?: string | null; sourceMetadata?: Record<string, unknown> | null }

/**
 * Importers always send legacySourceId and sourceMetadata, so this only fills gaps for admin-created
 * products: the next id in the manual range and a "manual" provenance record.
 */
export const assignManualProductIdentity: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || !data) return data
  const product = data as ProductData
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
