import assert from 'node:assert/strict'
import test from 'node:test'

import {
  InMemoryFullCatalogRepository,
  importFullCatalog,
} from '../src/catalog/full-importer.js'
import {
  loadFullCatalogSources,
  normalizeFullCatalog,
} from '../src/catalog/full-normalizer.js'
import {
  assertP05DisposableTarget,
  buildP05PilotSubset,
  runP05PilotSubsetCli,
} from '../.hermes/evidence/p0-5/pilot-subset.js'

const sourcesPromise = loadFullCatalogSources({ projectRoot: '..' })
const catalogPromise = sourcesPromise.then((sources) => normalizeFullCatalog(sources))

function bytewise(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function disposableEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    P0_5_DISPOSABLE: 'true',
    DATABASE_URL: 'postgresql://user:password@127.0.0.1:54353/wokin_p05',
    PAYLOAD_SECRET: 'test-secret',
    ...overrides,
  }
}

test('P0-5 selects the first 20 unique canonical-slug candidates and preserves relation closure without mutation', async () => {
  const [sources, catalog] = await Promise.all([sourcesPromise, catalogPromise])
  const sourceBefore = structuredClone(sources.catalog)
  const catalogBefore = structuredClone(catalog)
  const subset = buildP05PilotSubset(catalog, sources.catalog)
  const expectedIds: number[] = []
  const ids = new Set<number>()
  const slugs = new Set<string>()
  for (const product of [...sources.catalog.products].sort((left, right) =>
    bytewise(left.translation.canonicalSlug, right.translation.canonicalSlug) || left.legacySourceId - right.legacySourceId,
  )) {
    if (ids.has(product.legacySourceId) || slugs.has(product.translation.canonicalSlug)) continue
    ids.add(product.legacySourceId)
    slugs.add(product.translation.canonicalSlug)
    expectedIds.push(product.legacySourceId)
    if (expectedIds.length === 20) break
  }

  assert.deepEqual(subset.catalog.products.map((product) => product.legacySourceId), expectedIds)
  assert.equal(subset.catalog.products.length, 20)
  assert.equal(new Set(subset.catalog.products.map((product) => product.legacySourceId)).size, 20)
  assert.equal(new Set(subset.catalog.products.map((product) => product.slugVi)).size, 20)
  assert.deepEqual(sources.catalog, sourceBefore)
  assert.deepEqual(catalog, catalogBefore)

  const categoryIds = new Set(subset.catalog.categories.map((category) => category.id))
  const mediaIds = new Set(subset.catalog.media.map((media) => media.id))
  for (const product of subset.catalog.products) {
    assert.ok(product.categoryIds.every((id) => categoryIds.has(id)))
    assert.ok(product.mediaIds.every((id) => mediaIds.has(id)))
  }
  for (const category of subset.catalog.categories) {
    assert.ok(category.parentId === null || categoryIds.has(category.parentId))
  }
  assert.ok(subset.catalog.products.every((product) => product.status === 'draft' && product.publishedAt === null && product.seo.noIndex))
  assert.ok(subset.catalog.media.every((media) => media.rightsStatus === 'pending'))
  assert.deepEqual(subset.catalog.report.droppedProducts, 0)
  assert.deepEqual(subset.catalog.report.droppedCategories, 0)
  assert.deepEqual(subset.catalog.report.droppedImageReferences, 0)
  assert.deepEqual(subset.operation, {
    testOnly: true,
    approvalStatus: 'NOT_APPROVED',
    mediaRightsDecision: 'UNVERIFIED',
    purpose: 'workflow-mechanics-only',
  })
})

test('P0-5 target guard accepts only its explicitly disposable local PostgreSQL target without leaking input', () => {
  assert.doesNotThrow(() => assertP05DisposableTarget(disposableEnv()))
  for (const [name, env] of [
    ['flag', disposableEnv({ P0_5_DISPOSABLE: 'false' })],
    ['host', disposableEnv({ DATABASE_URL: 'postgresql://user:password@localhost:54353/wokin_p05' })],
    ['port', disposableEnv({ DATABASE_URL: 'postgresql://user:password@127.0.0.1:54354/wokin_p05' })],
    ['database', disposableEnv({ DATABASE_URL: 'postgresql://user:password@127.0.0.1:54353/other' })],
    ['secret', disposableEnv({ PAYLOAD_SECRET: undefined })],
  ] as const) {
    assert.throws(() => assertP05DisposableTarget(env), new RegExp(name === 'flag' ? 'P0_5_DISPOSABLE' : name === 'secret' ? 'PAYLOAD_SECRET' : name))
    try {
      assertP05DisposableTarget(env)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      assert.ok(!message.includes('password'))
      assert.ok(!message.includes('localhost'))
      assert.ok(!message.includes('54354'))
      assert.ok(!message.includes('/other'))
    }
  }
})

test('P0-5 direct CLI wrapper explicitly exits after success and preserves failure exit behavior', async () => {
  const exits: number[] = []
  const runtime = {
    exit(code?: number): void {
      exits.push(code ?? 0)
    },
    exitCode: undefined as number | undefined,
  }
  const errors: unknown[] = []

  await runP05PilotSubsetCli(async () => {}, runtime, (error) => errors.push(error))
  assert.deepEqual(exits, [0])
  assert.equal(runtime.exitCode, undefined)
  assert.deepEqual([...errors], [])

  exits.length = 0
  const failure = new Error('sanitized failure')
  await runP05PilotSubsetCli(async () => { throw failure }, runtime, (error) => errors.push(error))
  assert.deepEqual(exits, [])
  assert.equal(runtime.exitCode, 1)
  assert.deepEqual(errors, ['sanitized failure'])
})

test('P0-5 subset import is idempotent with the in-memory repository', async () => {
  const [sources, catalog] = await Promise.all([sourcesPromise, catalogPromise])
  const subset = buildP05PilotSubset(catalog, sources.catalog).catalog
  const repository = new InMemoryFullCatalogRepository()
  const first = await importFullCatalog(repository, subset, { dryRun: false })
  const second = await importFullCatalog(repository, subset, { dryRun: false })

  assert.deepEqual(first.records.products, { created: 20, updated: 0, unchanged: 0 })
  assert.deepEqual(first.records.categories, { created: subset.categories.length, updated: 0, unchanged: 0 })
  assert.deepEqual(first.records.media, { created: subset.media.length, updated: 0, unchanged: 0 })
  assert.deepEqual(second.records.products, { created: 0, updated: 0, unchanged: 20 })
  assert.deepEqual(second.records.categories, { created: 0, updated: 0, unchanged: subset.categories.length })
  assert.deepEqual(second.records.media, { created: 0, updated: 0, unchanged: subset.media.length })
})
