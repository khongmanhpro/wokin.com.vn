import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { assertCatalogPublishSnapshot } from '../../../contracts/catalog-snapshot-validator.mjs'
import { valueAfter } from './cli-args.js'

async function main() {
  const file = valueAfter(process.argv.slice(2), '--snapshot', path.resolve('snapshots/catalog-poc.json'))!
  const snapshot = JSON.parse(await readFile(file, 'utf8'))
  assertCatalogPublishSnapshot(snapshot)
  console.log(`Valid catalog snapshot ${snapshot.snapshotId}: ${snapshot.products.length} products, ${snapshot.categories.length} categories, ${snapshot.media.length} media`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
