import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'

import { assertCatalogPublishSnapshot, stableStringify } from '../../../contracts/catalog-snapshot-validator.mjs'
import config from '../payload.config.js'
import { valueAfter } from './cli-args.js'
import { exportCatalogSnapshot } from './exporter.js'
import { PayloadCatalogRepository } from './payload-repository.js'

async function main() {
  const args = process.argv.slice(2)
  const output = valueAfter(args, '--output', path.resolve('snapshots/catalog-poc.json'))!
  const fixture = valueAfter(args, '--fixture')
  let products
  let payload
  if (fixture) products = JSON.parse(await readFile(fixture, 'utf8'))
  else {
    payload = await getPayload({ config })
    products = await new PayloadCatalogRepository(payload).listProducts()
  }
  const snapshot = exportCatalogSnapshot(products)
  assertCatalogPublishSnapshot(snapshot)
  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, stableStringify(snapshot))
  console.log(`Wrote deterministic snapshot ${snapshot.snapshotId} (${snapshot.products.length} products) to ${output}`)
  if (payload) process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
