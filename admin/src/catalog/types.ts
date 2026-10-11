export interface PocCategoryInput {
  slug: string
  nameVi: string
}

export interface PocMediaInput {
  path: string
  alt: string
}

export interface PocSpecificationInput {
  label: string
  value: string
  unit?: string
}

export interface PocProductInput {
  id: string
  legacySourceId: number
  sku: string | null
  nameVi: string
  slugVi: string
  categories: PocCategoryInput[]
  media: PocMediaInput[]
  specifications: PocSpecificationInput[]
}

export interface ImportSummary {
  created: number
  updated: number
  unchanged: number
  dryRun: boolean
}

export type ProductStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'published' | 'archived'

export interface CatalogSeo {
  title: string
  description: string
  canonicalPath: string
  noIndex: boolean
}

export interface ProductionCategoryInput {
  id: string
  legacySourceId: number
  nameVi: string
  sourceName: string
  slug: string
  status: 'draft' | 'active' | 'archived'
  parentId: string | null
  sortOrder: number
  seo: CatalogSeo
}

export interface ProductionMediaInput {
  id: string
  path: string
  storageKey: string
  alt: string
  metadata: Record<string, unknown>
  width: number
  height: number
  contentSha256: string
  rightsStatus: 'pending' | 'cleared' | 'restricted' | 'expired'
  variants: Array<{
    name: string
    storageKey: string
    width: number
    height: number
    contentSha256: string
  }>
}

export interface ProductionProductInput {
  id: string
  legacySourceId: number
  sku: string | null
  status: ProductStatus
  nameVi: string
  slugVi: string
  descriptionVi: string | null
  specifications: Array<{ label: string; value: string; unit?: string; sourceLine: string }>
  packaging: Array<{ cells: Array<{ value: string }> }>
  attributes: Array<{ legacySourceId: number | null; name: string; values: Array<{ value: string }> }>
  categoryIds: string[]
  mediaIds: string[]
  publishedAt: string | null
  seo: CatalogSeo
  sourceMetadata: {
    sourceType: string
    legacySlug: string
    sourceName: string
    legacyDescription: string
    sourceChecksum: string
    canonicalSlugSha256: string
    searchIndex: Record<string, unknown>
    importedAt: string
    legacyPublishedAt: string | null
  }
}

export interface FullCatalogInput {
  categories: ProductionCategoryInput[]
  media: ProductionMediaInput[]
  products: ProductionProductInput[]
  report: {
    sourceChecksum: string
    canonicalSlugSha256: string
    products: number
    categories: number
    uniqueMedia: number
    imageReferences: number
    droppedProducts: number
    droppedCategories: number
    droppedImageReferences: number
  }
}

export interface RecordImportCounts {
  created: number
  updated: number
  unchanged: number
}

export interface FullImportReport {
  dryRun: boolean
  sourceChecksum: string
  input: { products: number; categories: number; uniqueMedia: number; imageReferences: number }
  records: {
    categories: RecordImportCounts
    media: RecordImportCounts
    products: RecordImportCounts
  }
  dropped: { products: number; categories: number; imageReferences: number }
}
