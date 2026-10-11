import type { Payload } from 'payload'

import type { FullCatalogRepository } from './full-importer.js'
import type { ProductionCategoryInput, ProductionMediaInput, ProductionProductInput } from './types.js'

type Related = string | { id: string }
type PayloadDocument = Record<string, unknown> & { id: string }

function relationshipId(value: Related): string {
  return typeof value === 'string' ? value : String(value.id)
}

function isoDate(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Payload date value is missing')
  return new Date(value).toISOString()
}

function group(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export class PayloadFullCatalogRepository implements FullCatalogRepository {
  constructor(private readonly payload: Payload) {}

  private async list(collection: 'categories' | 'media' | 'products'): Promise<PayloadDocument[]> {
    const documents: PayloadDocument[] = []
    let page = 1
    while (true) {
      const result = await this.payload.find({ collection, depth: 1, limit: 500, page, overrideAccess: true })
      documents.push(...result.docs as unknown as PayloadDocument[])
      if (!result.hasNextPage) break
      page = result.nextPage ?? page + 1
    }
    return documents
  }

  async listCategories(): Promise<ProductionCategoryInput[]> {
    return (await this.list('categories')).map((document) => {
      const seo = group(document.seo)
      return {
        id: String(document.id),
        legacySourceId: Number(document.legacySourceId),
        nameVi: String(document.nameVi),
        sourceName: String(document.sourceName),
        slug: String(document.slug),
        status: document.status as ProductionCategoryInput['status'],
        parentId: document.parent ? relationshipId(document.parent as Related) : null,
        sortOrder: Number(document.sortOrder),
        seo: {
          title: String(seo.title), description: String(seo.description), canonicalPath: String(seo.canonicalPath),
          noIndex: Boolean(seo.noIndex),
        },
      }
    })
  }

  async listMedia(): Promise<ProductionMediaInput[]> {
    return (await this.list('media')).map((document) => ({
      id: String(document.id),
      path: String(document.path),
      storageKey: String(document.storageKey),
      alt: String(document.alt),
      metadata: group(document.metadata),
      width: Number(document.width),
      height: Number(document.height),
      contentSha256: String(document.contentSha256),
      rightsStatus: document.rightsStatus as ProductionMediaInput['rightsStatus'],
      variants: Array.isArray(document.variants) ? document.variants.map((candidate) => {
        const variant = group(candidate)
        return {
          name: String(variant.name), storageKey: String(variant.storageKey), width: Number(variant.width),
          height: Number(variant.height), contentSha256: String(variant.contentSha256),
        }
      }) : [],
    }))
  }

  async listProducts(): Promise<ProductionProductInput[]> {
    return (await this.list('products')).map((document) => {
      const seo = group(document.seo)
      const sourceMetadata = group(document.sourceMetadata)
      return {
        id: String(document.id),
        legacySourceId: Number(document.legacySourceId),
        sku: typeof document.sku === 'string' && document.sku.trim() ? document.sku.trim() : null,
        status: document.status as ProductionProductInput['status'],
        nameVi: String(document.nameVi),
        slugVi: String(document.slugVi),
        descriptionVi: typeof document.descriptionVi === 'string' && document.descriptionVi ? document.descriptionVi : null,
        specifications: Array.isArray(document.specifications) ? document.specifications.map((candidate) => {
          const item = group(candidate)
          return {
            label: String(item.label), value: String(item.value),
            ...(typeof item.unit === 'string' && item.unit ? { unit: item.unit } : {}),
            sourceLine: String(item.sourceLine),
          }
        }) : [],
        packaging: Array.isArray(document.packaging) ? document.packaging.map((candidate) => {
          const row = group(candidate)
          return {
            cells: Array.isArray(row.cells) ? row.cells.map((cell) => ({ value: String(group(cell).value) })) : [],
          }
        }) : [],
        attributes: Array.isArray(document.attributes) ? document.attributes.map((candidate) => {
          const attribute = group(candidate)
          return {
            legacySourceId: Number.isInteger(attribute.legacySourceId) ? Number(attribute.legacySourceId) : null,
            name: String(attribute.name),
            values: Array.isArray(attribute.values) ? attribute.values.map((value) => ({ value: String(group(value).value) })) : [],
          }
        }) : [],
        categoryIds: Array.isArray(document.categories) ? document.categories.map((value) => relationshipId(value as Related)) : [],
        mediaIds: Array.isArray(document.media) ? document.media.map((value) => relationshipId(value as Related)) : [],
        publishedAt: typeof document.publishedAt === 'string' ? isoDate(document.publishedAt) : null,
        seo: {
          title: String(seo.title), description: String(seo.description), canonicalPath: String(seo.canonicalPath),
          noIndex: Boolean(seo.noIndex),
        },
        sourceMetadata: {
          sourceType: String(sourceMetadata.sourceType),
          legacySlug: String(sourceMetadata.legacySlug),
          sourceName: String(sourceMetadata.sourceName),
          legacyDescription: typeof sourceMetadata.legacyDescription === 'string' ? sourceMetadata.legacyDescription : '',
          sourceChecksum: String(sourceMetadata.sourceChecksum),
          canonicalSlugSha256: String(sourceMetadata.canonicalSlugSha256),
          searchIndex: group(sourceMetadata.searchIndex),
          importedAt: isoDate(sourceMetadata.importedAt),
          legacyPublishedAt: typeof sourceMetadata.legacyPublishedAt === 'string' ? sourceMetadata.legacyPublishedAt : null,
        },
      }
    })
  }

  private categoryData(record: ProductionCategoryInput) {
    return {
      legacySourceId: record.legacySourceId, nameVi: record.nameVi, sourceName: record.sourceName, slug: record.slug,
      status: record.status, ...(record.parentId ? { parent: record.parentId } : {}), sortOrder: record.sortOrder, seo: record.seo,
    }
  }

  private mediaData(record: ProductionMediaInput) {
    return {
      path: record.path, storageKey: record.storageKey, alt: record.alt, metadata: record.metadata,
      width: record.width, height: record.height, contentSha256: record.contentSha256,
      rightsStatus: record.rightsStatus, variants: record.variants,
    }
  }

  private productData(record: ProductionProductInput) {
    return {
      legacySourceId: record.legacySourceId, sku: record.sku, status: record.status, nameVi: record.nameVi,
      slugVi: record.slugVi, descriptionVi: record.descriptionVi, specifications: record.specifications,
      packaging: record.packaging, attributes: record.attributes, categories: record.categoryIds, media: record.mediaIds,
      ...(record.publishedAt ? { publishedAt: record.publishedAt } : {}), seo: record.seo, sourceMetadata: record.sourceMetadata,
    }
  }

  async createCategory(record: ProductionCategoryInput) {
    await this.payload.create({ collection: 'categories', data: { id: record.id, ...this.categoryData(record) }, overrideAccess: true })
  }
  async updateCategory(record: ProductionCategoryInput) {
    await this.payload.update({ collection: 'categories', id: record.id, data: this.categoryData(record), overrideAccess: true })
  }
  async createMedia(record: ProductionMediaInput) {
    await this.payload.create({ collection: 'media', data: { id: record.id, ...this.mediaData(record) }, overrideAccess: true })
  }
  async updateMedia(record: ProductionMediaInput) {
    await this.payload.update({ collection: 'media', id: record.id, data: this.mediaData(record), overrideAccess: true })
  }
  async createProduct(record: ProductionProductInput) {
    await this.payload.create({ collection: 'products', data: { id: record.id, ...this.productData(record) }, overrideAccess: true })
  }
  async updateProduct(record: ProductionProductInput) {
    await this.payload.update({ collection: 'products', id: record.id, data: this.productData(record), overrideAccess: true })
  }
}
