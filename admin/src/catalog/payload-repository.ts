import type { Payload } from 'payload'

import type { CatalogRepository } from './importer.js'
import type { PocCategoryInput, PocMediaInput, PocProductInput } from './types.js'

type RelatedDocument = { id: string; nameVi?: string; slug?: string; path?: string; alt?: string }
type ProductDocument = {
  id: string
  legacySourceId: number
  sku?: string | null
  nameVi: string
  slugVi: string
  categories?: Array<string | RelatedDocument>
  media?: Array<string | RelatedDocument>
  specifications?: Array<{ label?: string; value?: string; unit?: string | null }>
}

function relatedDocument(value: string | RelatedDocument, kind: 'category' | 'media'): RelatedDocument {
  if (typeof value === 'string') throw new Error(`Payload ${kind} relationship was not populated; export/import requires depth 1`)
  return value
}

export class PayloadCatalogRepository implements CatalogRepository {
  constructor(private readonly payload: Payload) {}

  async listProducts(): Promise<PocProductInput[]> {
    const documents: ProductDocument[] = []
    let page = 1
    while (true) {
      const result = await this.payload.find({ collection: 'products', depth: 1, limit: 1000, page, overrideAccess: true })
      documents.push(...result.docs as ProductDocument[])
      if (!result.hasNextPage) break
      page = result.nextPage ?? page + 1
    }
    return documents.map((product) => ({
      id: String(product.id),
      legacySourceId: product.legacySourceId,
      sku: product.sku?.trim() || null,
      nameVi: product.nameVi,
      slugVi: product.slugVi,
      categories: (product.categories ?? []).map((value) => {
        const category = relatedDocument(value, 'category')
        return { nameVi: String(category.nameVi), slug: String(category.slug) }
      }),
      media: (product.media ?? []).map((value) => {
        const media = relatedDocument(value, 'media')
        return { alt: String(media.alt), path: String(media.path) }
      }),
      specifications: (product.specifications ?? []).map((specification) => ({
        label: String(specification.label),
        value: String(specification.value),
        ...(specification.unit ? { unit: specification.unit } : {}),
      })),
    }))
  }

  private async ensureCategory(category: PocCategoryInput): Promise<string> {
    const existing = await this.payload.find({
      collection: 'categories',
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: category.slug } },
    })
    if (existing.docs[0]) {
      if (existing.docs[0].nameVi !== category.nameVi) await this.payload.update({
        collection: 'categories',
        id: existing.docs[0].id,
        data: { nameVi: category.nameVi },
        overrideAccess: true,
      })
      return String(existing.docs[0].id)
    }
    const created = await this.payload.create({
      collection: 'categories',
      data: category,
      draft: true,
      overrideAccess: true,
    })
    return String(created.id)
  }

  private async ensureMedia(media: PocMediaInput): Promise<string> {
    const existing = await this.payload.find({
      collection: 'media',
      limit: 1,
      overrideAccess: true,
      where: { path: { equals: media.path } },
    })
    if (existing.docs[0]) {
      if (existing.docs[0].alt !== media.alt) await this.payload.update({
        collection: 'media',
        id: existing.docs[0].id,
        data: { alt: media.alt },
        overrideAccess: true,
      })
      return String(existing.docs[0].id)
    }
    const created = await this.payload.create({
      collection: 'media',
      data: media,
      draft: true,
      overrideAccess: true,
    })
    return String(created.id)
  }

  private async relationIds(product: PocProductInput) {
    return {
      categories: await Promise.all(product.categories.map((category) => this.ensureCategory(category))),
      media: await Promise.all(product.media.map((media) => this.ensureMedia(media))),
    }
  }

  private productData(product: PocProductInput, relations: { categories: string[]; media: string[] }) {
    return {
      legacySourceId: product.legacySourceId,
      sku: product.sku,
      nameVi: product.nameVi,
      slugVi: product.slugVi,
      specifications: product.specifications,
      categories: relations.categories,
      media: relations.media,
    }
  }

  async createProduct(product: PocProductInput): Promise<void> {
    const relations = await this.relationIds(product)
    await this.payload.create({
      collection: 'products',
      data: { id: product.id, ...this.productData(product, relations) },
      draft: true,
      overrideAccess: true,
    })
  }

  async updateProduct(product: PocProductInput): Promise<void> {
    const relations = await this.relationIds(product)
    await this.payload.update({
      collection: 'products',
      id: product.id,
      data: this.productData(product, relations),
      overrideAccess: true,
    })
  }
}
