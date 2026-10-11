import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import 'dotenv/config'
import { getPayload } from 'payload'

import { stableStringify } from '../../../../contracts/catalog-snapshot-validator.mjs'
import config from '../../../src/payload.config.js'
import { importFullCatalog } from '../../../src/catalog/full-importer.js'
import { loadFullCatalogSources, normalizeFullCatalog, verifyMediaChecksum } from '../../../src/catalog/full-normalizer.js'
import { PayloadFullCatalogRepository } from '../../../src/catalog/full-payload-repository.js'
import type { FullCatalogInput } from '../../../src/catalog/types.js'

export interface GeneratedCatalogSelection {
  products: Array<{
    legacySourceId: number
    translation: { canonicalSlug: string }
  }>
}

export const P05_TEST_ONLY_OPERATION = {
  testOnly: true,
  approvalStatus: 'NOT_APPROVED',
  mediaRightsDecision: 'UNVERIFIED',
  purpose: 'workflow-mechanics-only',
} as const

export interface P05PilotSubset {
  catalog: FullCatalogInput
  operation: typeof P05_TEST_ONLY_OPERATION
}

function bytewise(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function assertSubsetInvariants(catalog: FullCatalogInput): void {
  const productIds = new Set(catalog.products.map((product) => product.id))
  const legacyIds = new Set(catalog.products.map((product) => product.legacySourceId))
  const slugs = new Set(catalog.products.map((product) => product.slugVi))
  const categoryIds = new Set(catalog.categories.map((category) => category.id))
  const mediaIds = new Set(catalog.media.map((media) => media.id))
  if (catalog.products.length !== 20 || legacyIds.size !== 20 || slugs.size !== 20) {
    throw new Error('P0-5 test-only subset requires exactly 20 unique product legacy IDs and slugs')
  }
  if (productIds.size !== 20) throw new Error('P0-5 test-only subset has duplicate product stable IDs')
  for (const product of catalog.products) {
    if (product.status !== 'draft' || product.publishedAt !== null || !product.seo.noIndex) {
      throw new Error(`P0-5 test-only product invariant failed for legacySourceId ${product.legacySourceId}`)
    }
    if (!product.categoryIds.every((id) => categoryIds.has(id)) || !product.mediaIds.every((id) => mediaIds.has(id))) {
      throw new Error(`P0-5 test-only relation closure failed for legacySourceId ${product.legacySourceId}`)
    }
  }
  for (const category of catalog.categories) {
    if (category.parentId !== null && !categoryIds.has(category.parentId)) {
      throw new Error(`P0-5 test-only category parent closure failed for legacySourceId ${category.legacySourceId}`)
    }
  }
  if (!catalog.media.every((media) => media.rightsStatus === 'pending')) {
    throw new Error('P0-5 test-only media rights invariant failed')
  }
  if (catalog.report.droppedProducts || catalog.report.droppedCategories || catalog.report.droppedImageReferences) {
    throw new Error('P0-5 test-only subset must report intentional selection without dropped records')
  }
}

export function buildP05PilotSubset(catalog: FullCatalogInput, source: GeneratedCatalogSelection): P05PilotSubset {
  const selectedLegacyIds: number[] = []
  const seenLegacyIds = new Set<number>()
  const seenCanonicalSlugs = new Set<string>()
  for (const candidate of [...source.products].sort((left, right) =>
    bytewise(left.translation.canonicalSlug, right.translation.canonicalSlug) || left.legacySourceId - right.legacySourceId,
  )) {
    if (seenLegacyIds.has(candidate.legacySourceId) || seenCanonicalSlugs.has(candidate.translation.canonicalSlug)) continue
    seenLegacyIds.add(candidate.legacySourceId)
    seenCanonicalSlugs.add(candidate.translation.canonicalSlug)
    selectedLegacyIds.push(candidate.legacySourceId)
    if (selectedLegacyIds.length === 20) break
  }
  if (selectedLegacyIds.length !== 20) throw new Error('P0-5 test-only selection has fewer than 20 unique source candidates')

  const productByLegacyId = new Map(catalog.products.map((product) => [product.legacySourceId, product]))
  const products = selectedLegacyIds.map((legacySourceId) => {
    const product = productByLegacyId.get(legacySourceId)
    if (!product) throw new Error(`P0-5 test-only selection cannot resolve normalized product ${legacySourceId}`)
    return structuredClone(product)
  })
  const selectedCategoryIds = new Set(products.flatMap((product) => product.categoryIds))
  const categoryById = new Map(catalog.categories.map((category) => [category.id, category]))
  for (const categoryId of [...selectedCategoryIds]) {
    let category = categoryById.get(categoryId)
    while (category?.parentId) {
      selectedCategoryIds.add(category.parentId)
      category = categoryById.get(category.parentId)
    }
  }
  const categories = catalog.categories.filter((category) => selectedCategoryIds.has(category.id)).map((category) => structuredClone(category))
  const selectedMediaIds = new Set(products.flatMap((product) => product.mediaIds))
  const media = catalog.media.filter((item) => selectedMediaIds.has(item.id)).map((item) => structuredClone(item))
  const subset: FullCatalogInput = {
    categories,
    media,
    products,
    report: {
      sourceChecksum: catalog.report.sourceChecksum,
      canonicalSlugSha256: catalog.report.canonicalSlugSha256,
      products: products.length,
      categories: categories.length,
      uniqueMedia: media.length,
      imageReferences: products.reduce((total, product) => total + product.mediaIds.length, 0),
      droppedProducts: 0,
      droppedCategories: 0,
      droppedImageReferences: 0,
    },
  }
  assertSubsetInvariants(subset)
  return { catalog: subset, operation: P05_TEST_ONLY_OPERATION }
}

type Environment = Readonly<Record<string, string | undefined>>

export function assertP05DisposableTarget(env: Environment): void {
  if (env.P0_5_DISPOSABLE !== 'true') throw new Error('P0_5_DISPOSABLE must be exactly "true"')
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is missing')
  if (!env.PAYLOAD_SECRET) throw new Error('PAYLOAD_SECRET is missing')
  let databaseUrl: URL
  try {
    databaseUrl = new URL(env.DATABASE_URL)
  } catch {
    throw new Error('DATABASE_URL is invalid')
  }
  if (databaseUrl.protocol !== 'postgres:' && databaseUrl.protocol !== 'postgresql:') throw new Error('DATABASE_URL protocol is invalid')
  if (databaseUrl.hostname !== '127.0.0.1') throw new Error('DATABASE_URL hostname is invalid')
  if (databaseUrl.port !== '54353') throw new Error('DATABASE_URL port is invalid')
  if (databaseUrl.pathname !== '/wokin_p05') throw new Error('DATABASE_URL database pathname is invalid')
}

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag)
  if (index < 0) return undefined
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a path`)
  return value
}

function reportPathWithinProject(reportPath: string, projectRoot: string): string {
  const resolved = path.resolve(reportPath)
  const relative = path.relative(path.resolve(projectRoot), resolved)
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('--report path must be within the project')
  }
  return resolved
}

async function main(): Promise<void> {
  assertP05DisposableTarget(process.env)
  const args = process.argv.slice(2)
  const projectRoot = path.resolve('..')
  const reportPath = valueAfter(args, '--report')
  const reportTarget = reportPath ? reportPathWithinProject(reportPath, projectRoot) : undefined
  const dryRun = args.includes('--dry-run')
  const sources = await loadFullCatalogSources({ projectRoot })
  const subset = buildP05PilotSubset(normalizeFullCatalog(sources), sources.catalog)
  for (const media of subset.catalog.media) await verifyMediaChecksum(media, projectRoot)
  const payload = await getPayload({ config })
  const imported = await importFullCatalog(new PayloadFullCatalogRepository(payload), subset.catalog, { dryRun })
  const report = { ...imported, operation: subset.operation }
  const serialized = stableStringify(report)
  if (reportTarget) {
    await mkdir(path.dirname(reportTarget), { recursive: true })
    await writeFile(reportTarget, serialized)
  }
  console.log(serialized.trimEnd())
}

interface CliRuntime {
  exit(code?: number): void
  exitCode?: string | number | null
}

export async function runP05PilotSubsetCli(
  runMain: () => Promise<void>,
  runtime: CliRuntime = process,
  reportError: (message: unknown) => void = console.error,
): Promise<void> {
  try {
    await runMain()
    runtime.exit(0)
  } catch (error) {
    reportError(error instanceof Error ? error.message : error)
    runtime.exitCode = 1
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void runP05PilotSubsetCli(main)
}
