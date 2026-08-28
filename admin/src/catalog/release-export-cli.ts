import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'

import config from '../payload.config.js'
import { PayloadFullCatalogRepository } from './full-payload-repository.js'
import { exportReleaseSnapshot, selectReleaseCandidate, writeReleaseArtifact } from './release-exporter.js'

function requiredValue(args: string[], flag: string): string {
  const index = args.indexOf(flag)
  const value = index < 0 ? undefined : args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`)
  return path.resolve(value)
}

async function main() {
  const args = process.argv.slice(2)
  const outputDir = requiredValue(args, '--output-dir')
  const glossaryFile = requiredValue(args, '--glossary')
  const glossary = JSON.parse(await readFile(glossaryFile, 'utf8'))
  if (!glossary.ui || typeof glossary.ui !== 'object' || Array.isArray(glossary.ui)) throw new Error('Glossary must contain an object at ui')
  const payload = await getPayload({ config })
  const repository = new PayloadFullCatalogRepository(payload)
  const snapshot = exportReleaseSnapshot(selectReleaseCandidate({
    categories: await repository.listCategories(),
    media: await repository.listMedia(),
    products: await repository.listProducts(),
    glossary: { ui: glossary.ui },
  }))
  const artifact = await writeReleaseArtifact(outputDir, snapshot)
  console.log(`Release snapshot ${snapshot.snapshotId} (${snapshot.catalog.products.length} products) is available at ${artifact}`)
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
