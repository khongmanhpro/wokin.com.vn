import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'

type RedirectDocument = {
  active?: unknown
  fromPath?: unknown
  id?: number | string
  toPath?: unknown
}

type FindResult = {
  docs: RedirectDocument[]
  hasNextPage: boolean
  nextPage?: number | null
}

const invalidPathCharacter = /[\s\u0000-\u001F\u007F\\?#]/u

export function isCanonicalInternalPath(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.includes('//')) return false
  if (invalidPathCharacter.test(value) || value.includes('%')) return false
  return !value.split('/').some((segment) => segment === '.' || segment === '..')
}

function requireCanonicalPath(field: 'fromPath' | 'toPath', value: unknown): asserts value is string {
  if (!isCanonicalInternalPath(value)) throw new Error(`${field} must be a canonical internal origin-relative path`)
}

async function activeRedirects(req: PayloadRequest, currentId: RedirectDocument['id']): Promise<RedirectDocument[]> {
  const find = req.payload.find.bind(req.payload) as unknown as (options: Record<string, unknown>) => Promise<FindResult>
  const redirects: RedirectDocument[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await find({
      collection: 'redirects',
      depth: 0,
      limit: 100,
      overrideAccess: false,
      page,
      req,
      where: { active: { equals: true } },
    })
    redirects.push(...result.docs.filter((redirect) => currentId === undefined || String(redirect.id) !== String(currentId)))
    hasNextPage = result.hasNextPage
    page = typeof result.nextPage === 'number' ? result.nextPage : page + 1
  }

  return redirects
}

function introducesCycle(fromPath: string, toPath: string, redirects: RedirectDocument[]): boolean {
  const destinations = new Map<string, string>()
  for (const redirect of redirects) {
    if (redirect.active === true && isCanonicalInternalPath(redirect.fromPath) && isCanonicalInternalPath(redirect.toPath)) {
      destinations.set(redirect.fromPath, redirect.toPath)
    }
  }
  destinations.set(fromPath, toPath)

  const visited = new Set<string>()
  let current = toPath
  while (!visited.has(current)) {
    if (current === fromPath) return true
    visited.add(current)
    const next = destinations.get(current)
    if (!next) return false
    current = next
  }
  return false
}

export const enforceRedirectPolicy: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const candidate = { ...(originalDoc as RedirectDocument | undefined), ...(data as RedirectDocument) }
  requireCanonicalPath('fromPath', candidate.fromPath)
  requireCanonicalPath('toPath', candidate.toPath)

  if (candidate.active === false) return data
  if (candidate.fromPath === candidate.toPath) throw new Error('Active redirects cannot redirect to themselves')

  if (introducesCycle(candidate.fromPath, candidate.toPath, await activeRedirects(req, originalDoc?.id))) {
    throw new Error('Active redirects cannot form a redirect cycle')
  }

  return data
}
