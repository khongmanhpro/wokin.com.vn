import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { assertCatalogPublishSnapshot, snapshotChecksum, stableStringify } from '../../../contracts/catalog-snapshot-validator.mjs'
type ReleaseInput = {
  categories: Array<{ id: string; legacySourceId: number; nameVi: string; slug: string; status: string; parentId: string | null }>
  media: Array<{ id: string; path: string; alt: string; rightsStatus: string }>
  products: Array<{ id: string; legacySourceId: number; sku: string | null; status: string; nameVi: string; slugVi: string; descriptionVi: string | null; specifications: Array<{ label: string; value: string; unit?: string }>; packaging: Array<{ cells: Array<{ value: string }> }>; attributes: Array<{ legacySourceId: number | null; name: string; values: Array<{ value: string }> }>; categoryIds: string[]; mediaIds: string[]; publishedAt: string | null }>
  glossary: { ui: Record<string, string> }
}

const forbiddenPublicText = /\b(?:www\.)?wokintools\.com\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i

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
    if (item.rightsStatus !== 'cleared') errors.push(`media[${index}] (${item.id}) rightsStatus must be cleared`)
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
      else if (item.rightsStatus !== 'cleared') errors.push(`${path} mediaIds references uncleared media ${mediaId}`)
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
    products: products.map((product) => ({
      internalId: product.id, legacySourceId: product.legacySourceId, legacySlug: product.slugVi, sourceType: 'payload-release', productCode: product.sku, publishedAt: product.publishedAt!, legacyDescription: product.descriptionVi ?? '',
      translation: { locale: 'vi', name: product.nameVi, sourceName: product.nameVi, canonicalSlug: product.slugVi },
      categoryRelations: product.categoryIds.map((id) => { const category = categoryById.get(id)!; return { categoryInternalId: id, legacySourceId: category.legacySourceId, name: category.nameVi, slug: category.slug } }),
      media: product.mediaIds.map((id, position) => { const item = mediaById.get(id)!; return { kind: 'image', path: item.path, alt: item.alt, position } }),
      technicalSpecs: { lines: product.specifications.map((specification) => `> ${specification.label}: ${specification.value}${specification.unit ? ` ${specification.unit}` : ''}`) },
      packaging: { table: product.packaging.map((row) => row.cells.map((cell) => cell.value)) },
      attributes: product.attributes.map((attribute) => ({ legacySourceId: attribute.legacySourceId, name: attribute.name, values: attribute.values.map((value) => value.value) })),
    })),
  }
  const content = { schemaVersion: 2 as const, catalog, glossary: { ui: input.glossary.ui } }
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
