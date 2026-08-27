import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'

import { stableStringify } from '../../../contracts/catalog-snapshot-validator.mjs'
import config from '../payload.config.js'
import { valueAfter } from './cli-args.js'
import { importFullCatalog } from './full-importer.js'
import { loadFullCatalogSources, normalizeFullCatalog, verifyAllMediaChecksums } from './full-normalizer.js'
import { PayloadFullCatalogRepository } from './full-payload-repository.js'

async function main() {
  const args = process.argv.slice(2)
  const projectRoot = valueAfter(args, '--project-root', path.resolve('..'))!
  const reportPath = valueAfter(args, '--report')
  const dryRun = args.includes('--dry-run')
  const sources = await loadFullCatalogSources({ projectRoot })
  const catalog = normalizeFullCatalog(sources)
  await verifyAllMediaChecksums(catalog, projectRoot)

  const payload = await getPayload({ config })
  const report = await importFullCatalog(new PayloadFullCatalogRepository(payload), catalog, { dryRun })
  const serialized = stableStringify(report)
  if (reportPath) {
    await mkdir(path.dirname(reportPath), { recursive: true })
    await writeFile(reportPath, serialized)
  }
  console.log(serialized.trimEnd())
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
