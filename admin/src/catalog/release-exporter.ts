import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { assertCatalogPublishSnapshot, snapshotChecksum, stableStringify } from '../../../contracts/catalog-snapshot-validator.mjs'
type ReleaseInput = {
  categories: Array<{ id: string; legacySourceId: number; nameVi: string; slug: string; status: string; parentId: string | null }>
  media: Array<{ id: string; path: string; alt: string; rightsStatus: string }>
  products: Array<{ id: string; legacySourceId: number; sku: string | null; status: string; nameVi: string; slugVi: string; descriptionVi: string | null; specifications: Array<{ label: string; value: string; unit?: string; sourceLine?: string }>; packaging: Array<{ cells: Array<{ value: string }> }>; attributes: Array<{ legacySourceId: number | null; name: string; values: Array<{ value: string }> }>; categoryIds: string[]; mediaIds: string[]; publishedAt: string | null; sourceMetadata?: Record<string, unknown> }>
  glossary: { categories?: Record<string, string>; marketing?: Record<string, string>; spec_labels?: Record<string, string>; terms?: Array<[string, string]>; ui: Record<string, string> }
}

// Matches BLOCKED_MEDIA_RIGHTS in access/publishReadiness.ts: pending catalog images may go live.
const BLOCKED_RIGHTS = new Set(['restricted', 'expired'])

const forbiddenPublicText = /\b(?:www\.)?wokintools\.com\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

/**
 * Admin uploads live in media/uploads/ (MEDIA_UPLOAD_DIR); the publish step copies them to
 * public/images/products/uploads/ where the website's responsive-image build picks them up.
 */
export function publicMediaPath(storedPath: string): string {
  return storedPath.startsWith('media/uploads/') ? `images/products/uploads/${storedPath.slice('media/uploads/'.length)}` : storedPath
}

/** Same split as the importer's specification(): "> Label: value" or a bare "> value" feature line. */
function parsedSourceLine(sourceLine: string): { label: string; value: string } {
  const normalized = sourceLine.trim().replace(/^>\s*/, '').trim()
  const separator = normalized.indexOf(':')
  if (separator > 0 && separator < normalized.length - 1) return { label: normalized.slice(0, separator).trim(), value: normalized.slice(separator + 1).trim() }
  return { label: 'Tính năng', value: normalized }
}

/**
 * Unedited rows round-trip to their original website line (the importer labels bare feature lines "Tính năng",
 * which must not leak into the site as "Tính năng: …"); edited or new rows render as "> Label: value unit".
 */
export function specificationLine(specification: { label: string; value: string; unit?: string; sourceLine?: string }): string {
  if (specification.sourceLine && !specification.unit) {
    const original = parsedSourceLine(specification.sourceLine)
    if (original.label === specification.label && original.value === specification.value) return specification.sourceLine.trim()
  }
  return `> ${specification.label}: ${specification.value}${specification.unit ? ` ${specification.unit}` : ''}`
}

function hash(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex')
}

function releaseId(content: unknown): string {
  return `release-${hash(content).slice(0, 16)}`
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function selectReleaseCandidate(input: ReleaseInput): ReleaseInput {
  const products = input.products.filter((product) => product.status === 'published')
  if (products.length === 0) throw new Error('Release candidate selection blocked: zero published products')

  const categoriesById = new Map(input.categories.map((category) => [category.id, category]))
  const mediaById = new Map(input.media.map((item) => [item.id, item]))
  const categoryIds = new Set<string>()
  const mediaIds = new Set<string>()
  for (const product of products) {
    for (const categoryId of product.categoryIds) {
      if (!categoriesById.has(categoryId)) throw new Error(`Release candidate selection blocked: published product ${product.id} references missing category ${categoryId}`)
      categoryIds.add(categoryId)
    }
    for (const mediaId of product.mediaIds) {
      if (!mediaById.has(mediaId)) throw new Error(`Release candidate selection blocked: published product ${product.id} references missing media ${mediaId}`)
      mediaIds.add(mediaId)
    }
  }

  for (const categoryId of [...categoryIds]) {
    let parentId = categoriesById.get(categoryId)?.parentId ?? null
    while (parentId && !categoryIds.has(parentId)) {
      const parent = categoriesById.get(parentId)
      if (!parent) throw new Error(`Release candidate selection blocked: category ${categoryId} references missing ancestor ${parentId}`)
      categoryIds.add(parent.id)
      parentId = parent.parentId
    }
  }

  return {
    ...input,
    categories: input.categories.filter((category) => categoryIds.has(category.id)),
    media: input.media.filter((item) => mediaIds.has(item.id)),
    products,
  }
}

function candidateErrors(input: ReleaseInput): string[] {
  const errors: string[] = []
  const categories = new Map(input.categories.map((category) => [category.id, category]))
  const media = new Map(input.media.map((item) => [item.id, item]))
  for (const [index, category] of input.categories.entries()) {
    if (category.status !== 'active') errors.push(`categories[${index}] (${category.id}) must be active`)
    if (category.parentId && !categories.has(category.parentId)) errors.push(`categories[${index}] (${category.id}) parentId references missing category ${category.parentId}`)
  }
  for (const [index, item] of input.media.entries()) {
    if (BLOCKED_RIGHTS.has(item.rightsStatus)) errors.push(`media[${index}] (${item.id}) rightsStatus ${item.rightsStatus} cannot be published`)
    if (!isNonEmpty(item.path) || !isNonEmpty(item.alt)) errors.push(`media[${index}] (${item.id}) must include public path and alt`)
  }
  for (const [index, product] of input.products.entries()) {
    const path = `products[${index}] (${product.id})`
    if (product.status !== 'published') errors.push(`${path} status must be published`)
    if (!isNonEmpty(product.publishedAt) || Number.isNaN(Date.parse(product.publishedAt))) errors.push(`${path} must have a valid publishedAt`)
    if (!isNonEmpty(product.nameVi) || !isNonEmpty(product.slugVi) || !Array.isArray(product.specifications) || !Array.isArray(product.packaging) || !Array.isArray(product.attributes)) errors.push(`${path} is missing public-ready product data`)
    if (!Array.isArray(product.categoryIds) || product.categoryIds.length === 0) errors.push(`${path} must reference at least one category`)
    for (const categoryId of product.categoryIds ?? []) {
      const category = categories.get(categoryId)
      if (!category) errors.push(`${path} categoryIds references missing category ${categoryId}`)
      else if (category.status !== 'active') errors.push(`${path} categoryIds references inactive category ${categoryId}`)
    }
    if (!Array.isArray(product.mediaIds) || product.mediaIds.length === 0) errors.push(`${path} must reference at least one media item`)
    for (const mediaId of product.mediaIds ?? []) {
      const item = media.get(mediaId)
      if (!item) errors.push(`${path} mediaIds references missing media ${mediaId}`)
      else if (BLOCKED_RIGHTS.has(item.rightsStatus)) errors.push(`${path} mediaIds references ${item.rightsStatus} media ${mediaId}`)
    }
  }
  if (forbiddenPublicText.test(JSON.stringify({ categories: input.categories, media: input.media, products: input.products, glossary: input.glossary }))) errors.push('release candidate contains source-domain or email leakage')
  return errors
}

export function exportReleaseSnapshot(input: ReleaseInput) {
  const errors = candidateErrors(input)
  if (errors.length) throw new Error(`Release snapshot export blocked by ${errors.length} validation error(s):\n${errors.map((error) => `- ${error}`).join('\n')}`)
  const categories = [...input.categories].sort((left, right) => left.slug.localeCompare(right.slug))
  const media = [...input.media].sort((left, right) => left.path.localeCompare(right.path))
  const products = [...input.products].sort((left, right) => left.legacySourceId - right.legacySourceId)
  const categoryCounts = new Map(categories.map((category) => [category.id, 0]))
  for (const product of products) for (const categoryId of product.categoryIds) categoryCounts.set(categoryId, (categoryCounts.get(categoryId) ?? 0) + 1)
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const mediaById = new Map(media.map((item) => [item.id, item]))
  const catalog = {
    schemaVersion: 1,
    sourceChecksum: hash({ categories, media, products }),
    canonicalSlugSha256: createHash('sha256').update(`${products.map((product) => `${product.legacySourceId}|${product.slugVi}`).join('\n')}\n`).digest('hex'),
    categories: categories.map((category) => ({ internalId: category.id, legacySourceId: category.legacySourceId, sourceName: category.nameVi, slug: category.slug, count: categoryCounts.get(category.id) ?? 0, parentInternalId: category.parentId, translation: { locale: 'vi', name: category.nameVi } })),
    // Website order (category pages list products in catalog order): newest first, then higher source id first.
    products: [...products].sort((left, right) => (right.publishedAt ?? '').localeCompare(left.publishedAt ?? '') || right.legacySourceId - left.legacySourceId).map((product) => ({
      internalId: product.id, legacySourceId: product.legacySourceId,
      // Imported products keep their website-era identity (old slug, source type and name used by search).
      // WordPress-era slugs may be percent-encoded (one is); the website only uses legacySlug as a lookup alias.
      legacySlug: [text(product.sourceMetadata?.legacySlug)].find((slug) => slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) ?? product.slugVi,
      sourceType: text(product.sourceMetadata?.sourceType) ?? 'payload-release',
      productCode: product.sku, publishedAt: product.publishedAt!,
      legacyDescription: product.descriptionVi ?? text(product.sourceMetadata?.legacyDescription) ?? '',
      translation: { locale: 'vi', name: product.nameVi, sourceName: text(product.sourceMetadata?.sourceName) ?? product.nameVi, canonicalSlug: product.slugVi },
      categoryRelations: product.categoryIds.map((id) => { const category = categoryById.get(id)!; return { categoryInternalId: id, legacySourceId: category.legacySourceId, name: category.nameVi, slug: category.slug } }),
      media: product.mediaIds.map((id, position) => { const item = mediaById.get(id)!; return { kind: 'image', path: publicMediaPath(item.path), alt: item.alt, position } }),
      technicalSpecs: { lines: product.specifications.map(specificationLine) },
      packaging: { table: product.packaging.map((row) => row.cells.map((cell) => cell.value)).filter((row) => row.some((cell) => cell.trim())) },
      attributes: product.attributes.map((attribute) => ({ legacySourceId: attribute.legacySourceId, name: attribute.name, values: attribute.values.map((value) => value.value) })),
    })),
  }
  // Category names are edited in the admin, so they override the glossary file (new or renamed categories included).
  const categoryNames = { ...(input.glossary.categories ?? {}), ...Object.fromEntries(categories.map((category) => [category.slug, category.nameVi])) }
  const content = { schemaVersion: 2 as const, catalog, glossary: { categories: categoryNames, marketing: input.glossary.marketing ?? {}, spec_labels: input.glossary.spec_labels ?? {}, terms: input.glossary.terms ?? [], ui: input.glossary.ui } }
  const snapshotId = releaseId(content)
  const withoutChecksum = { ...content, snapshotId }
  const snapshot = { ...withoutChecksum, checksum: snapshotChecksum(withoutChecksum) }
  assertCatalogPublishSnapshot(snapshot)
  return snapshot
}

export async function writeReleaseArtifact(outputDir: string, snapshot: unknown): Promise<string> {
  assertCatalogPublishSnapshot(snapshot)
  if (!snapshot || typeof snapshot !== 'object' || (snapshot as { schemaVersion?: unknown }).schemaVersion !== 2) throw new Error('Release artifact requires a v2 snapshot')
  const release = snapshot as { snapshotId: string }
  const directory = path.join(path.resolve(outputDir), release.snapshotId)
  const artifact = path.join(directory, 'catalog-release.json')
  const content = stableStringify(snapshot)
  await mkdir(directory, { recursive: true })
  try {
    const existing = await readFile(artifact, 'utf8')
    if (existing !== content) throw new Error(`Release artifact ${release.snapshotId} already exists with different content`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') await writeFile(artifact, content, { flag: 'wx' })
    else throw error
  }
  return artifact
}
