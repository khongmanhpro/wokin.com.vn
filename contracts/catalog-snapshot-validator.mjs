import { createHash } from 'node:crypto'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const sha256Pattern = /^[a-f\d]{64}$/
const forbiddenPublicText = /\b(?:www\.)?wokintools\.com\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function isSafeRelativePath(value) {
  if (!nonEmpty(value) || /^[\\/]/.test(value) || /^[a-z][a-z\d+.-]*:/i.test(value)) return false
  return !value.split(/[\\/]/).includes('..')
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!isRecord(value)) return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
}

export function stableStringify(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`
}

export function snapshotChecksum(snapshot) {
  const { checksum: _checksum, ...payload } = snapshot
  return createHash('sha256').update(stableStringify(payload)).digest('hex')
}

function releaseSnapshotId(snapshot) {
  const { checksum: _checksum, snapshotId: _snapshotId, ...content } = snapshot
  return `release-${createHash('sha256').update(stableStringify(content)).digest('hex').slice(0, 16)}`
}

function validateEmbeddedPublicCatalog(catalog) {
  const errors = []
  if (!isRecord(catalog)) return ['must be an object']
  if (catalog.schemaVersion !== 1) errors.push('schemaVersion must be 1')
  if (!sha256Pattern.test(catalog.sourceChecksum ?? '')) errors.push('sourceChecksum must be a SHA-256 hex digest')
  if (!sha256Pattern.test(catalog.canonicalSlugSha256 ?? '')) errors.push('canonicalSlugSha256 must be a SHA-256 hex digest')
  if (!Array.isArray(catalog.categories)) errors.push('categories must be an array')
  if (!Array.isArray(catalog.products)) errors.push('products must be an array')
  else if (catalog.products.length === 0) errors.push('products must be non-empty')

  const categoryIds = new Set()
  const categorySlugs = new Set()
  if (Array.isArray(catalog.categories)) catalog.categories.forEach((category, index) => {
    const path = `categories[${index}]`
    if (!isRecord(category)) return errors.push(`${path} must be an object`)
    if (!nonEmpty(category.internalId) || categoryIds.has(category.internalId)) errors.push(`${path}.internalId must be a unique non-empty string`)
    else categoryIds.add(category.internalId)
    if (!Number.isInteger(category.legacySourceId)) errors.push(`${path}.legacySourceId must be an integer`)
    if (!nonEmpty(category.sourceName)) errors.push(`${path}.sourceName is required`)
    if (!slugPattern.test(category.slug ?? '') || categorySlugs.has(category.slug)) errors.push(`${path}.slug must be a unique slug`)
    else categorySlugs.add(category.slug)
    if (!Number.isInteger(category.count) || category.count < 0) errors.push(`${path}.count must be a non-negative integer`)
    if (category.parentInternalId !== null && !nonEmpty(category.parentInternalId)) errors.push(`${path}.parentInternalId must be null or a non-empty string`)
    if (!isRecord(category.translation) || category.translation.locale !== 'vi' || !nonEmpty(category.translation.name)) errors.push(`${path}.translation must contain locale vi and name`)
  })
  if (Array.isArray(catalog.categories)) catalog.categories.forEach((category, index) => {
    if (isRecord(category) && category.parentInternalId !== null && nonEmpty(category.parentInternalId) && !categoryIds.has(category.parentInternalId)) {
      errors.push(`categories[${index}].parentInternalId references a missing category`)
    }
  })

  const productIds = new Set()
  const legacyIds = new Set()
  const canonicalSlugs = new Set()
  if (Array.isArray(catalog.products)) catalog.products.forEach((product, index) => {
    const path = `products[${index}]`
    if (!isRecord(product)) return errors.push(`${path} must be an object`)
    if (!nonEmpty(product.internalId) || productIds.has(product.internalId)) errors.push(`${path}.internalId must be a unique non-empty string`)
    else productIds.add(product.internalId)
    if (!Number.isInteger(product.legacySourceId) || legacyIds.has(product.legacySourceId)) errors.push(`${path}.legacySourceId must be a unique integer`)
    else legacyIds.add(product.legacySourceId)
    if (!slugPattern.test(product.legacySlug ?? '')) errors.push(`${path}.legacySlug must be a slug`)
    if (!nonEmpty(product.sourceType)) errors.push(`${path}.sourceType is required`)
    if (product.productCode !== null && typeof product.productCode !== 'string') errors.push(`${path}.productCode must be a string or null`)
    if (!nonEmpty(product.publishedAt) || Number.isNaN(Date.parse(product.publishedAt))) errors.push(`${path}.publishedAt must be a valid date`)
    if (typeof product.legacyDescription !== 'string') errors.push(`${path}.legacyDescription must be a string`)
    if (!isRecord(product.translation)) errors.push(`${path}.translation must be an object`)
    else {
      if (product.translation.locale !== 'vi') errors.push(`${path}.translation.locale must be vi`)
      if (!nonEmpty(product.translation.name)) errors.push(`${path}.translation.name is required`)
      if (!nonEmpty(product.translation.sourceName)) errors.push(`${path}.translation.sourceName is required`)
      if (!slugPattern.test(product.translation.canonicalSlug ?? '') || canonicalSlugs.has(product.translation.canonicalSlug)) errors.push(`${path}.translation.canonicalSlug must be a unique slug`)
      else canonicalSlugs.add(product.translation.canonicalSlug)
    }
    if (!Array.isArray(product.categoryRelations) || product.categoryRelations.length === 0) errors.push(`${path}.categoryRelations must be a non-empty array`)
    else product.categoryRelations.forEach((relation, relationIndex) => {
      const relationPath = `${path}.categoryRelations[${relationIndex}]`
      if (!isRecord(relation) || !nonEmpty(relation.categoryInternalId) || !Number.isInteger(relation.legacySourceId) || !nonEmpty(relation.name) || !slugPattern.test(relation.slug ?? '')) errors.push(`${relationPath} is malformed`)
      else if (!categoryIds.has(relation.categoryInternalId)) errors.push(`${relationPath}.categoryInternalId references a missing category`)
    })
    if (!Array.isArray(product.media) || product.media.length === 0) errors.push(`${path}.media must be a non-empty array`)
    else product.media.forEach((media, mediaIndex) => {
      const mediaPath = `${path}.media[${mediaIndex}]`
      if (!isRecord(media) || media.kind !== 'image' || !isSafeRelativePath(media.path) || !nonEmpty(media.alt) || !Number.isInteger(media.position)) errors.push(`${mediaPath} is malformed`)
    })
    const lines = isRecord(product.technicalSpecs) ? product.technicalSpecs.lines : undefined
    const table = isRecord(product.packaging) ? product.packaging.table : undefined
    if (!Array.isArray(lines) || !lines.every((line) => typeof line === 'string')) errors.push(`${path}.technicalSpecs.lines must be a string array`)
    if (!Array.isArray(table) || !table.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'))) errors.push(`${path}.packaging.table must be a string matrix`)
    if (!Array.isArray(product.attributes)) errors.push(`${path}.attributes must be an array`)
  })
  return errors
}

export function validateCatalogSnapshot(snapshot) {
  const errors = []
  if (!isRecord(snapshot)) return ['root must be an object']
  if (snapshot.schemaVersion === 2) {
    const allowedRootFields = new Set(['schemaVersion', 'snapshotId', 'catalog', 'glossary', 'checksum'])
    for (const key of Object.keys(snapshot)) if (!allowedRootFields.has(key)) errors.push(`root.${key} is not publishable`)
    if (typeof snapshot.snapshotId !== 'string' || !/^release-[a-f\d]{16}$/.test(snapshot.snapshotId)) errors.push('snapshotId must match release-<16 hex>')
    else if (snapshot.snapshotId !== releaseSnapshotId(snapshot)) errors.push('snapshotId does not match canonical release content')
    if (!sha256Pattern.test(snapshot.checksum ?? '')) errors.push('checksum must be a SHA-256 hex digest')
    else if (snapshotChecksum(snapshot) !== snapshot.checksum) errors.push('checksum does not match canonical snapshot content')
    errors.push(...validateEmbeddedPublicCatalog(snapshot.catalog).map((error) => `catalog.${error}`))
    if (!isRecord(snapshot.glossary) || !isRecord(snapshot.glossary.ui)) errors.push('glossary.ui must be an object')
    if (forbiddenPublicText.test(JSON.stringify(snapshot))) errors.push('snapshot must not contain source-domain references or email addresses')
    return errors
  }
  const allowedRootFields = new Set(['schemaVersion', 'snapshotId', 'products', 'categories', 'media', 'checksum'])
  for (const key of Object.keys(snapshot)) if (!allowedRootFields.has(key)) errors.push(`root.${key} is not publishable`)
  if (snapshot.schemaVersion !== 1) errors.push('schemaVersion must be 1')
  if (typeof snapshot.snapshotId !== 'string' || !/^poc-[a-f\d]{16}$/.test(snapshot.snapshotId)) errors.push('snapshotId must match poc-<16 hex>')
  if (!sha256Pattern.test(snapshot.checksum ?? '')) errors.push('checksum must be a SHA-256 hex digest')
  else if (snapshotChecksum(snapshot) !== snapshot.checksum) errors.push('checksum does not match canonical snapshot content')
  if (!Array.isArray(snapshot.categories)) errors.push('categories must be an array')
  if (!Array.isArray(snapshot.media)) errors.push('media must be an array')
  if (!Array.isArray(snapshot.products)) errors.push('products must be an array')

  const categoryIds = new Set()
  const categorySlugs = new Set()
  if (Array.isArray(snapshot.categories)) snapshot.categories.forEach((category, index) => {
    const path = `categories[${index}]`
    if (!isRecord(category)) return errors.push(`${path} must be an object`)
    if (!uuidPattern.test(category.id ?? '') || categoryIds.has(category.id)) errors.push(`${path}.id must be a unique UUID`)
    else categoryIds.add(category.id)
    if (!nonEmpty(category.nameVi)) errors.push(`${path}.nameVi is required`)
    if (!slugPattern.test(category.slug ?? '') || categorySlugs.has(category.slug)) errors.push(`${path}.slug must be a unique slug`)
    else categorySlugs.add(category.slug)
  })

  const mediaIds = new Set()
  if (Array.isArray(snapshot.media)) snapshot.media.forEach((media, index) => {
    const path = `media[${index}]`
    if (!isRecord(media)) return errors.push(`${path} must be an object`)
    if (!uuidPattern.test(media.id ?? '') || mediaIds.has(media.id)) errors.push(`${path}.id must be a unique UUID`)
    else mediaIds.add(media.id)
    if (!isSafeRelativePath(media.path)) errors.push(`${path}.path must be a safe relative path`)
    if (!nonEmpty(media.alt)) errors.push(`${path}.alt is required`)
  })

  const productIds = new Set()
  const legacyIds = new Set()
  const productSlugs = new Set()
  if (Array.isArray(snapshot.products)) snapshot.products.forEach((product, index) => {
    const path = `products[${index}]`
    if (!isRecord(product)) return errors.push(`${path} must be an object`)
    if (!uuidPattern.test(product.id ?? '') || productIds.has(product.id)) errors.push(`${path}.id must be a unique UUID`)
    else productIds.add(product.id)
    if (!Number.isInteger(product.legacySourceId) || legacyIds.has(product.legacySourceId)) errors.push(`${path}.legacySourceId must be a unique integer`)
    else legacyIds.add(product.legacySourceId)
    if (product.sku !== null && typeof product.sku !== 'string') errors.push(`${path}.sku must be a string or null`)
    if (!nonEmpty(product.nameVi)) errors.push(`${path}.nameVi is required`)
    if (!slugPattern.test(product.slugVi ?? '') || productSlugs.has(product.slugVi)) errors.push(`${path}.slugVi must be a unique slug`)
    else productSlugs.add(product.slugVi)
    if (!Array.isArray(product.categoryIds) || product.categoryIds.length === 0) errors.push(`${path}.categoryIds must be non-empty`)
    else product.categoryIds.forEach((id) => { if (!categoryIds.has(id)) errors.push(`${path}.categoryIds references missing category ${id}`) })
    if (!Array.isArray(product.mediaIds) || product.mediaIds.length === 0) errors.push(`${path}.mediaIds must be non-empty`)
    else product.mediaIds.forEach((id) => { if (!mediaIds.has(id)) errors.push(`${path}.mediaIds references missing media ${id}`) })
    if (!Array.isArray(product.specifications) || product.specifications.length === 0) errors.push(`${path}.specifications must be non-empty`)
    else product.specifications.forEach((specification, specificationIndex) => {
      if (!isRecord(specification) || !nonEmpty(specification.label) || !nonEmpty(specification.value) || (specification.unit !== undefined && !nonEmpty(specification.unit))) errors.push(`${path}.specifications[${specificationIndex}] is invalid`)
    })
  })

  return errors
}

export function assertCatalogPublishSnapshot(snapshot) {
  const errors = validateCatalogSnapshot(snapshot)
  if (errors.length) throw new Error(`Catalog publish snapshot validation failed with ${errors.length} error(s):\n${errors.map((error) => `- ${error}`).join('\n')}`)
}
