import type { CollectionBeforeChangeHook } from 'payload'

type DocumentWithId = { id?: string | number; rightsStatus?: unknown }
type FindResult = { docs: DocumentWithId[]; hasNextPage: boolean; nextPage?: number | null }

const MEDIA_PAGE_LIMIT = 100
const MAX_MEDIA_PAGES = 10

function nonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function relationIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ids = value.flatMap((item) => {
    const id = typeof item === 'object' && item !== null ? (item as DocumentWithId).id : item
    return typeof id === 'string' || typeof id === 'number' ? [String(id)] : []
  })
  return [...new Set(ids)]
}

function mergedCandidate(data: Record<string, unknown>, originalDoc: Record<string, unknown>): Record<string, unknown> {
  const originalSeo = typeof originalDoc.seo === 'object' && originalDoc.seo !== null ? originalDoc.seo : {}
  const updateSeo = typeof data.seo === 'object' && data.seo !== null ? data.seo : {}
  return { ...originalDoc, ...data, seo: { ...originalSeo, ...updateSeo } }
}

async function findMedia(req: { payload: { find: unknown } }, ids: string[]): Promise<DocumentWithId[]> {
  const find = req.payload.find as (options: Record<string, unknown>) => Promise<FindResult>
  const documents: DocumentWithId[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage && page <= MAX_MEDIA_PAGES) {
    const result = await find({
      collection: 'media',
      where: { id: { in: ids } },
      page,
      limit: MEDIA_PAGE_LIMIT,
      depth: 0,
      overrideAccess: false,
      req,
    })
    documents.push(...result.docs)
    hasNextPage = result.hasNextPage
    page = result.nextPage ?? page + 1
  }
  if (hasNextPage) throw new Error('Publish readiness could not verify all referenced media')
  return documents
}

export const enforcePublishReadiness: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (originalDoc?.status !== 'approved' || data.status !== 'published') return data

  const candidate = mergedCandidate(data as Record<string, unknown>, originalDoc as Record<string, unknown>)
  const seo = candidate.seo as Record<string, unknown>
  if (!nonBlank(candidate.nameVi) || !nonBlank(candidate.slugVi)) throw new Error('Publish readiness requires a Vietnamese name and slug')
  if (!nonBlank(seo.title) || !nonBlank(seo.description) || !nonBlank(seo.canonicalPath) || seo.noIndex !== false) {
    throw new Error('Publish readiness requires complete indexable SEO')
  }

  const categories = relationIds(candidate.categories)
  if (categories.length === 0) throw new Error('Publish readiness requires at least one Danh mục')
  const mediaIds = relationIds(candidate.media)
  if (mediaIds.length === 0) throw new Error('Publish readiness requires at least one Hình ảnh')

  const media = await findMedia(req as unknown as { payload: { find: unknown } }, mediaIds)
  const byId = new Map(media.map((document) => [document.id === undefined ? '' : String(document.id), document]))
  if (mediaIds.some((id) => byId.get(id)?.rightsStatus !== 'cleared')) {
    throw new Error('Publish readiness requires every media right to be cleared')
  }
  return data
}
