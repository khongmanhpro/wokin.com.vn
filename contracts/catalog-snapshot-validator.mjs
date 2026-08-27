import { createHash } from 'node:crypto'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const sha256Pattern = /^[a-f\d]{64}$/

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

export function validateCatalogSnapshot(snapshot) {
  const errors = []
  if (!isRecord(snapshot)) return ['root must be an object']
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
