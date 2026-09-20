import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { assertCatalogPublishSnapshot } from '../../../contracts/catalog-snapshot-validator.mjs'
import { valueAfter } from './cli-args.js'

async function main() {
  const args = process.argv.slice(2)
  const releaseOnly = args.includes('--release')
  const file = valueAfter(args, '--snapshot', releaseOnly ? undefined : path.resolve('snapshots/catalog-poc.json'))
  if (!file) throw new Error('--release requires --snapshot <release-artifact>')
  const snapshot = JSON.parse(await readFile(file, 'utf8'))
  assertCatalogPublishSnapshot(snapshot)
  if (releaseOnly && snapshot.schemaVersion !== 2) throw new Error('--release requires a schemaVersion 2 release artifact')
  console.log(`Valid catalog snapshot ${snapshot.snapshotId}: ${snapshot.schemaVersion === 2 ? snapshot.catalog.products.length : snapshot.products.length} products, ${snapshot.schemaVersion === 2 ? snapshot.catalog.categories.length : snapshot.categories.length} categories${snapshot.schemaVersion === 2 ? '' : `, ${snapshot.media.length} media`}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
