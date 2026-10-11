import { stableStringify } from '../../../contracts/catalog-snapshot-validator.mjs'
import type {
  FullCatalogInput,
  FullImportReport,
  ProductionCategoryInput,
  ProductionMediaInput,
  ProductionProductInput,
  RecordImportCounts,
} from './types.js'

export interface FullCatalogRepository {
  listCategories(): Promise<ProductionCategoryInput[]>
  listMedia(): Promise<ProductionMediaInput[]>
  listProducts(): Promise<ProductionProductInput[]>
  createCategory(category: ProductionCategoryInput): Promise<void>
  updateCategory(category: ProductionCategoryInput): Promise<void>
  createMedia(media: ProductionMediaInput): Promise<void>
  updateMedia(media: ProductionMediaInput): Promise<void>
  createProduct(product: ProductionProductInput): Promise<void>
  updateProduct(product: ProductionProductInput): Promise<void>
}

type CatalogRecord = ProductionCategoryInput | ProductionMediaInput | ProductionProductInput

function sameRecord(left: CatalogRecord, right: CatalogRecord): boolean {
  return stableStringify(left) === stableStringify(right)
}

async function importRecords<T extends CatalogRecord>(options: {
  incoming: T[]
  existing: T[]
  dryRun: boolean
  identity: (record: T) => string | number
  create: (record: T) => Promise<void>
  update: (record: T) => Promise<void>
}): Promise<RecordImportCounts> {
  const existingByIdentity = new Map(options.existing.map((record) => [options.identity(record), record]))
  const counts = { created: 0, updated: 0, unchanged: 0 }
  for (const record of options.incoming) {
    const current = existingByIdentity.get(options.identity(record))
    if (!current) {
      counts.created += 1
      if (!options.dryRun) await options.create(record)
    } else if (sameRecord(current, record)) {
      counts.unchanged += 1
    } else {
      counts.updated += 1
      if (!options.dryRun) await options.update(record)
    }
  }
  return counts
}

function assertStableIdentity<T extends { id: string }>(kind: string, incoming: T[], existing: T[], identity: (record: T) => string | number) {
  const existingByIdentity = new Map(existing.map((record) => [identity(record), record]))
  const existingById = new Map(existing.map((record) => [record.id, record]))
  for (const record of incoming) {
    const current = existingByIdentity.get(identity(record))
    if (current && current.id !== record.id) throw new Error(`${kind} stable identity mismatch for ${identity(record)}: ${current.id} != ${record.id}`)
    const idOwner = existingById.get(record.id)
    if (idOwner && identity(idOwner) !== identity(record)) throw new Error(`${kind} UUID ${record.id} is already owned by ${identity(idOwner)}`)
  }
}

function assertUniqueOwner<T>(kind: string, field: string, incoming: T[], existing: T[], value: (record: T) => string, identity: (record: T) => string | number) {
  const owners = new Map(existing.map((record) => [value(record), identity(record)]))
  for (const record of incoming) {
    const owner = owners.get(value(record))
    if (owner !== undefined && owner !== identity(record)) throw new Error(`${kind} ${field} collision '${value(record)}' between ${owner} and ${identity(record)}`)
  }
}

export async function importFullCatalog(
  repository: FullCatalogRepository,
  catalog: FullCatalogInput,
  options: { dryRun: boolean },
): Promise<FullImportReport> {
  if (catalog.report.droppedProducts || catalog.report.droppedCategories || catalog.report.droppedImageReferences) {
    throw new Error('Full catalog import refuses a normalized input with dropped records')
  }

  const [existingCategories, existingMedia, existingProducts] = await Promise.all([
    repository.listCategories(), repository.listMedia(), repository.listProducts(),
  ])

  assertStableIdentity('category', catalog.categories, existingCategories, (record) => record.legacySourceId)
  assertStableIdentity('media', catalog.media, existingMedia, (record) => record.storageKey)
  assertStableIdentity('product', catalog.products, existingProducts, (record) => record.legacySourceId)
  assertUniqueOwner('category', 'slug', catalog.categories, existingCategories, (record) => record.slug, (record) => record.legacySourceId)
  assertUniqueOwner('media', 'path', catalog.media, existingMedia, (record) => record.path, (record) => record.storageKey)
  assertUniqueOwner('product', 'slugVi', catalog.products, existingProducts, (record) => record.slugVi, (record) => record.legacySourceId)

  const categoryCounts = await importRecords({
    incoming: catalog.categories, existing: existingCategories, dryRun: options.dryRun,
    identity: (record) => record.legacySourceId,
    create: (record) => repository.createCategory(record), update: (record) => repository.updateCategory(record),
  })
  const mediaCounts = await importRecords({
    incoming: catalog.media, existing: existingMedia, dryRun: options.dryRun,
    identity: (record) => record.storageKey,
    create: (record) => repository.createMedia(record), update: (record) => repository.updateMedia(record),
  })
  const productCounts = await importRecords({
    incoming: catalog.products, existing: existingProducts, dryRun: options.dryRun,
    identity: (record) => record.legacySourceId,
    create: (record) => repository.createProduct(record), update: (record) => repository.updateProduct(record),
  })

  return {
    dryRun: options.dryRun,
    sourceChecksum: catalog.report.sourceChecksum,
    input: {
      products: catalog.products.length,
      categories: catalog.categories.length,
      uniqueMedia: catalog.media.length,
      imageReferences: catalog.report.imageReferences,
    },
    records: { categories: categoryCounts, media: mediaCounts, products: productCounts },
    dropped: {
      products: catalog.report.droppedProducts,
      categories: catalog.report.droppedCategories,
      imageReferences: catalog.report.droppedImageReferences,
    },
  }
}

export class InMemoryFullCatalogRepository implements FullCatalogRepository {
  private categories: ProductionCategoryInput[] = []
  private media: ProductionMediaInput[] = []
  private products: ProductionProductInput[] = []

  count() { return this.categories.length + this.media.length + this.products.length }
  async listCategories() { return structuredClone(this.categories) }
  async listMedia() { return structuredClone(this.media) }
  async listProducts() { return structuredClone(this.products) }
  async createCategory(record: ProductionCategoryInput) { this.categories.push(structuredClone(record)) }
  async createMedia(record: ProductionMediaInput) { this.media.push(structuredClone(record)) }
  async createProduct(record: ProductionProductInput) { this.products.push(structuredClone(record)) }
  async updateCategory(record: ProductionCategoryInput) { this.replace(this.categories, record, (item) => item.legacySourceId) }
  async updateMedia(record: ProductionMediaInput) { this.replace(this.media, record, (item) => item.storageKey) }
  async updateProduct(record: ProductionProductInput) { this.replace(this.products, record, (item) => item.legacySourceId) }

  private replace<T>(records: T[], incoming: T, identity: (record: T) => string | number) {
    const index = records.findIndex((record) => identity(record) === identity(incoming))
    if (index < 0) throw new Error(`Cannot update missing record ${identity(incoming)}`)
    records[index] = structuredClone(incoming)
  }
}
