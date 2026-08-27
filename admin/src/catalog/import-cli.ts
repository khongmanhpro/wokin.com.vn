import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'

import config from '../payload.config.js'
import { valueAfter } from './cli-args.js'
import { importProducts } from './importer.js'
import { PayloadCatalogRepository } from './payload-repository.js'

async function main() {
  const args = process.argv.slice(2)
  const fixture = valueAfter(args, '--fixture', path.resolve('fixtures/poc-products.json'))
  const dryRun = args.includes('--dry-run')
  const input = JSON.parse(await readFile(fixture!, 'utf8'))
  const payload = await getPayload({ config })
  const result = await importProducts(new PayloadCatalogRepository(payload), input, { dryRun })
  payload.logger.info(`POC import ${dryRun ? 'dry-run' : 'applied'}: ${result.created} create, ${result.updated} update, ${result.unchanged} unchanged`)
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
