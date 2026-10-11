import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { isSafeRelativePath } from '../../../contracts/catalog-snapshot-validator.mjs'
import type {
  FullCatalogInput,
  ProductionCategoryInput,
  ProductionMediaInput,
  ProductionProductInput,
} from './types.js'

interface GeneratedCategory {
  internalId: string
  legacySourceId: number
  parentInternalId: string | null
  slug: string
  sourceName: string
  translation: { locale: 'vi'; name: string }
}

interface GeneratedProduct {
  attributes: Array<{ legacySourceId: number | null; name: string; values: string[] }>
  categoryRelations: Array<{ legacySourceId: number }>
  legacyDescription: string
  legacySlug: string
  legacySourceId: number
  media: Array<{ alt: string; kind: string; path: string; position: number }>
  packaging: { table: string[][] }
  productCode: string | null
  publishedAt: string | null
  sourceType: string
  technicalSpecs: { lines: string[] }
  translation: { canonicalSlug: string; locale: 'vi'; name: string; sourceName: string }
}

interface GeneratedCatalog {
  schemaVersion: number
  sourceChecksum: string
  canonicalSlugSha256: string
  categories: GeneratedCategory[]
  products: GeneratedProduct[]
}

interface TranslationInput { id: number; sku: string | null; name_en: string; name_vi: string; slug_vi: string }
interface SearchInput { id: number; name: string; sku: string | null; slug: string; categories: string[] }

export interface FullCatalogSources {
  catalog: GeneratedCatalog
  imageMetadata: Record<string, [number, number, string]>
  searchIndex: SearchInput[]
  translations: TranslationInput[]
  projectRoot: string
}

const sha256Pattern = /^[a-f\d]{64}$/
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function stableUuid(prefix: 'product' | 'category', legacySourceId: number): string {
  const namespace = prefix === 'product' ? '1' : '2'
  return `${namespace}0000000-0000-5000-8000-${String(legacySourceId).padStart(12, '0')}`
}

function mediaUuid(storageKey: string): string {
  const hex = createHash('sha256').update(`wokin-media:${storageKey}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function specification(line: string): ProductionProductInput['specifications'][number] {
  const sourceLine = line.trim()
  const normalized = sourceLine.replace(/^>\s*/, '').trim()
  const separator = normalized.indexOf(':')
  if (separator > 0 && separator < normalized.length - 1) {
    return {
      label: normalized.slice(0, separator).trim(),
      value: normalized.slice(separator + 1).trim(),
      sourceLine,
    }
  }
  return { label: 'Tính năng', value: normalized, sourceLine }
}

export async function loadFullCatalogSources(options: { projectRoot: string }): Promise<FullCatalogSources> {
  const projectRoot = path.resolve(options.projectRoot)
  const [catalog, imageMetadata, searchIndex, translations] = await Promise.all([
    readFile(path.join(projectRoot, 'src/data/catalog.generated.json'), 'utf8').then(JSON.parse) as Promise<GeneratedCatalog>,
    readFile(path.join(projectRoot, 'src/data/image-metadata.generated.json'), 'utf8').then(JSON.parse) as Promise<Record<string, [number, number, string]>>,
    readFile(path.join(projectRoot, 'src/data/search-index.json'), 'utf8').then(JSON.parse) as Promise<SearchInput[]>,
    readFile(path.join(projectRoot, 'data/products_vi.json'), 'utf8').then(JSON.parse) as Promise<TranslationInput[]>,
  ])
  return { catalog, imageMetadata, searchIndex, translations, projectRoot }
}

export function normalizeFullCatalog(sources: FullCatalogSources): FullCatalogInput {
  const errors: string[] = []
  const { catalog } = sources
  if (catalog.schemaVersion !== 1) errors.push(`catalog schemaVersion ${catalog.schemaVersion} is unsupported`)
  if (catalog.products.length !== 1_357) errors.push(`expected 1357 products, received ${catalog.products.length}`)
  if (catalog.categories.length !== 30) errors.push(`expected 30 categories, received ${catalog.categories.length}`)
  if (sources.translations.length !== catalog.products.length) errors.push('products_vi count does not match catalog products')
  if (sources.searchIndex.length !== catalog.products.length) errors.push('search-index count does not match catalog products')

  const translationById = new Map(sources.translations.map((item) => [item.id, item]))
  const searchById = new Map(sources.searchIndex.map((item) => [item.id, item]))
  const categoryByInternalId = new Map(catalog.categories.map((item) => [item.internalId, item]))
  const productSlugs = new Map<string, number>()
  const legacyIds = new Set<number>()
  const categorySlugs = new Map<string, number>()

  const categories: ProductionCategoryInput[] = catalog.categories.map((category, sortOrder) => {
    if (!Number.isInteger(category.legacySourceId)) errors.push(`category ${sortOrder} has invalid legacySourceId`)
    const slugOwner = categorySlugs.get(category.slug)
    if (slugOwner !== undefined) errors.push(`category slug collision '${category.slug}' between legacySourceId ${slugOwner} and legacySourceId ${category.legacySourceId}`)
    else categorySlugs.set(category.slug, category.legacySourceId)
    const parent = category.parentInternalId ? categoryByInternalId.get(category.parentInternalId) : undefined
    if (category.parentInternalId && !parent) errors.push(`category legacySourceId ${category.legacySourceId} references missing parent ${category.parentInternalId}`)
    return {
      id: stableUuid('category', category.legacySourceId),
      legacySourceId: category.legacySourceId,
      nameVi: category.translation.name,
      sourceName: category.sourceName,
      slug: category.slug,
      status: 'draft',
      parentId: parent ? stableUuid('category', parent.legacySourceId) : null,
      sortOrder,
      seo: {
        title: category.translation.name,
        description: `Danh mục ${category.translation.name} chính hãng WOKIN.`,
        canonicalPath: `/danh-muc/${category.slug}`,
        noIndex: true,
      },
    }
  })

  const mediaOccurrences = new Map<string, Array<{ alt: string; kind: string; legacySourceId: number; position: number }>>()
  for (const product of catalog.products) for (const item of product.media) {
    const storageKey = item.path.replace(/^\//, '')
    const occurrences = mediaOccurrences.get(storageKey) ?? []
    occurrences.push({ alt: item.alt, kind: item.kind, legacySourceId: product.legacySourceId, position: item.position })
    mediaOccurrences.set(storageKey, occurrences)
  }

  const media: ProductionMediaInput[] = [...mediaOccurrences.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([storageKey, occurrences]) => {
    if (!isSafeRelativePath(storageKey)) errors.push(`unsafe media storageKey '${storageKey}'`)
    const metadata = sources.imageMetadata[`/${storageKey}`]
    if (!metadata) errors.push(`media metadata missing for '${storageKey}'`)
    const [width = 0, height = 0, contentSha256 = ''] = metadata ?? []
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) errors.push(`media dimensions invalid for '${storageKey}'`)
    if (!sha256Pattern.test(contentSha256)) errors.push(`media checksum invalid for '${storageKey}'`)
    return {
      id: mediaUuid(storageKey),
      path: storageKey,
      storageKey,
      alt: occurrences[0]?.alt ?? '',
      metadata: {
        kind: occurrences[0]?.kind ?? 'image',
        references: occurrences.map(({ legacySourceId, position }) => ({ legacySourceId, position })),
        alternateAlts: [...new Set(occurrences.map(({ alt }) => alt))],
      },
      width,
      height,
      contentSha256,
      rightsStatus: 'pending',
      variants: [],
    }
  })
  const mediaIdByPath = new Map(media.map((item) => [item.storageKey, item.id]))
  const categoryIdByLegacyId = new Map(categories.map((item) => [item.legacySourceId, item.id]))
  const latestSourceDate = catalog.products.map((product) => product.publishedAt).filter(nonEmpty).sort().at(-1) ?? '1970-01-01T00:00:00'
  const importedAt = new Date(latestSourceDate.endsWith('Z') ? latestSourceDate : `${latestSourceDate}Z`).toISOString()

  const products: ProductionProductInput[] = catalog.products.map((product, index) => {
    if (legacyIds.has(product.legacySourceId)) errors.push(`duplicate product legacySourceId ${product.legacySourceId}`)
    legacyIds.add(product.legacySourceId)
    const translation = translationById.get(product.legacySourceId)
    const search = searchById.get(product.legacySourceId)
    if (!translation) errors.push(`products_vi missing legacySourceId ${product.legacySourceId}`)
    if (!search) errors.push(`search-index missing legacySourceId ${product.legacySourceId}`)
    const slugVi = translation?.slug_vi ?? product.translation.canonicalSlug
    const slugOwner = productSlugs.get(slugVi)
    if (slugOwner !== undefined) errors.push(`slugVi collision '${slugVi}' between legacySourceId ${slugOwner} and legacySourceId ${product.legacySourceId}`)
    else productSlugs.set(slugVi, product.legacySourceId)
    if (!slugPattern.test(slugVi)) errors.push(`invalid slugVi '${slugVi}' for legacySourceId ${product.legacySourceId}`)
    if (translation && (translation.name_vi !== product.translation.name || translation.name_en !== product.translation.sourceName)) {
      errors.push(`translation drift for legacySourceId ${product.legacySourceId}`)
    }
    if (search && (search.slug !== slugVi || search.name !== product.translation.name || (search.sku || null) !== product.productCode)) {
      errors.push(`search-index drift for legacySourceId ${product.legacySourceId}`)
    }
    const categoryIds = product.categoryRelations.map((relation) => {
      const id = categoryIdByLegacyId.get(relation.legacySourceId)
      if (!id) errors.push(`product legacySourceId ${product.legacySourceId} references missing category ${relation.legacySourceId}`)
      return id ?? ''
    })
    const mediaIds = product.media.map((item) => {
      const id = mediaIdByPath.get(item.path.replace(/^\//, ''))
      if (!id) errors.push(`product legacySourceId ${product.legacySourceId} references missing media '${item.path}'`)
      return id ?? ''
    })
    if (!product.packaging.table.length) errors.push(`product legacySourceId ${product.legacySourceId} has empty packaging`)
    const sku = product.productCode?.trim() || null
    return {
      id: stableUuid('product', product.legacySourceId),
      legacySourceId: product.legacySourceId,
      sku,
      status: 'draft',
      nameVi: translation?.name_vi ?? product.translation.name,
      slugVi,
      descriptionVi: null,
      specifications: product.technicalSpecs.lines.filter(nonEmpty).map(specification),
      packaging: product.packaging.table.map((row) => ({ cells: row.map((value) => ({ value })) })),
      attributes: product.attributes.map((attribute) => ({
        legacySourceId: attribute.legacySourceId,
        name: attribute.name,
        values: attribute.values.map((value) => ({ value })),
      })),
      categoryIds,
      mediaIds,
      publishedAt: null,
      seo: {
        title: translation?.name_vi ?? product.translation.name,
        description: `${translation?.name_vi ?? product.translation.name}${sku ? `, mã ${sku}` : ''} chính hãng WOKIN.`,
        canonicalPath: `/san-pham/${slugVi}`,
        noIndex: true,
      },
      sourceMetadata: {
        sourceType: product.sourceType,
        legacySlug: product.legacySlug,
        sourceName: product.translation.sourceName,
        legacyDescription: product.legacyDescription,
        sourceChecksum: catalog.sourceChecksum,
        canonicalSlugSha256: catalog.canonicalSlugSha256,
        searchIndex: search ? { ...search } : {},
        importedAt,
        legacyPublishedAt: product.publishedAt,
      },
    }
  })

  const imageReferences = products.reduce((total, product) => total + product.mediaIds.length, 0)
  const unusedMetadata = Object.keys(sources.imageMetadata).filter((key) => !mediaOccurrences.has(key.replace(/^\//, '')))
  if (unusedMetadata.length) errors.push(`${unusedMetadata.length} image metadata record(s) are not referenced by catalog products`)
  if (imageReferences !== 1_720) errors.push(`expected 1720 image references, received ${imageReferences}`)
  if (media.length !== Object.keys(sources.imageMetadata).length) errors.push(`media cardinality mismatch: ${media.length} references vs ${Object.keys(sources.imageMetadata).length} metadata records`)
  if (errors.length) throw new Error(`Full catalog normalization blocked by ${errors.length} error(s):\n${errors.map((error) => `- ${error}`).join('\n')}`)

  return {
    categories,
    media,
    products,
    report: {
      sourceChecksum: catalog.sourceChecksum,
      canonicalSlugSha256: catalog.canonicalSlugSha256,
      products: products.length,
      categories: categories.length,
      uniqueMedia: media.length,
      imageReferences,
      droppedProducts: catalog.products.length - products.length,
      droppedCategories: catalog.categories.length - categories.length,
      droppedImageReferences: catalog.products.reduce((total, product) => total + product.media.length, 0) - imageReferences,
    },
  }
}

export async function verifyMediaChecksum(media: ProductionMediaInput, projectRoot: string): Promise<void> {
  if (!isSafeRelativePath(media.storageKey)) throw new Error(`unsafe media storageKey '${media.storageKey}'`)
  const binary = await readFile(path.join(path.resolve(projectRoot), 'public', media.storageKey))
  const actual = createHash('sha256').update(binary).digest('hex')
  if (actual !== media.contentSha256) throw new Error(`media checksum mismatch for '${media.storageKey}': ${actual} != ${media.contentSha256}`)
}

export async function verifyAllMediaChecksums(catalog: FullCatalogInput, projectRoot: string): Promise<void> {
  const errors: string[] = []
  for (const media of catalog.media) {
    try { await verifyMediaChecksum(media, projectRoot) } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }
  if (errors.length) throw new Error(`Media checksum verification blocked by ${errors.length} error(s):\n${errors.map((error) => `- ${error}`).join('\n')}`)
}
