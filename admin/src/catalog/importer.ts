import type { ImportSummary, PocProductInput } from './types.js'
import { isSafeRelativePath, stableStringify } from '../../../contracts/catalog-snapshot-validator.mjs'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function validateImportInput(input: unknown): string[] {
  const errors: string[] = []
  if (!Array.isArray(input)) return ['root must be an array']
  const legacyIds = new Map<number, number>()
  const slugs = new Map<string, { index: number; legacySourceId: number }>()
  input.forEach((candidate, index) => {
    const path = `[${index}]`
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      errors.push(`${path} must be an object`)
      return
    }
    const product = candidate as Partial<PocProductInput>
    const legacySourceId = product.legacySourceId
    if (!nonEmpty(product.id) || !uuidPattern.test(product.id)) errors.push(`${path}.id must be a UUID`)
    if (typeof legacySourceId !== 'number' || !Number.isInteger(legacySourceId)) errors.push(`${path}.legacySourceId must be an integer`)
    else if (legacyIds.has(legacySourceId)) errors.push(`${path}.legacySourceId duplicates [${legacyIds.get(legacySourceId)}]`)
    else legacyIds.set(legacySourceId, index)
    if (product.sku !== null && typeof product.sku !== 'string') errors.push(`${path}.sku must be a string or null`)
    if (!nonEmpty(product.nameVi)) errors.push(`${path}.nameVi is required`)
    if (!nonEmpty(product.slugVi) || !slugPattern.test(product.slugVi)) errors.push(`${path}.slugVi must be a Vietnamese canonical ASCII slug`)
    else if (typeof legacySourceId === 'number' && Number.isInteger(legacySourceId)) {
      const previous = slugs.get(product.slugVi)
      if (previous) errors.push(`slugVi collision '${product.slugVi}' between legacySourceId ${previous.legacySourceId} and ${legacySourceId}`)
      else slugs.set(product.slugVi, { index, legacySourceId })
    }
    if (!Array.isArray(product.categories) || product.categories.length === 0) errors.push(`${path}.categories must be a non-empty array`)
    else product.categories.forEach((category, categoryIndex) => {
      if (!nonEmpty(category?.slug) || !slugPattern.test(category.slug) || !nonEmpty(category?.nameVi)) errors.push(`${path}.categories[${categoryIndex}] is invalid`)
    })
    if (!Array.isArray(product.media) || product.media.length === 0) errors.push(`${path}.media must be a non-empty array`)
    else product.media.forEach((media, mediaIndex) => {
      if (!isSafeRelativePath(media?.path) || !nonEmpty(media?.alt)) errors.push(`${path}.media[${mediaIndex}] is invalid`)
    })
    if (!Array.isArray(product.specifications) || product.specifications.length === 0) errors.push(`${path}.specifications must be a non-empty array`)
    else product.specifications.forEach((specification, specificationIndex) => {
      if (!nonEmpty(specification?.label) || !nonEmpty(specification?.value) || (specification.unit !== undefined && !nonEmpty(specification.unit))) errors.push(`${path}.specifications[${specificationIndex}] is invalid`)
    })
  })
  return errors
}

export interface CatalogRepository {
  listProducts(): Promise<PocProductInput[]>
  createProduct(product: PocProductInput): Promise<void>
  updateProduct(product: PocProductInput): Promise<void>
}

function canonicalProduct(product: PocProductInput): string {
  return stableStringify(product)
}

export class InMemoryCatalogRepository implements CatalogRepository {
  products: PocProductInput[] = []

  async listProducts() {
    return structuredClone(this.products)
  }

  async createProduct(product: PocProductInput) {
    this.products.push(structuredClone(product))
  }

  async updateProduct(product: PocProductInput) {
    const index = this.products.findIndex((candidate) => candidate.legacySourceId === product.legacySourceId)
    if (index < 0) throw new Error(`Cannot update missing legacySourceId ${product.legacySourceId}`)
    this.products[index] = structuredClone(product)
  }
}

export async function importProducts(
  repository: CatalogRepository,
  input: unknown,
  options: { dryRun: boolean },
): Promise<ImportSummary> {
  const errors = validateImportInput(input)
  if (errors.length) throw new Error(`Import blocked by ${errors.length} validation error(s):\n${errors.map((error) => `- ${error}`).join('\n')}`)
  const products = input as PocProductInput[]
  const existing = await repository.listProducts()
  const existingByLegacyId = new Map(existing.map((product) => [product.legacySourceId, product]))
  const existingBySlug = new Map(existing.map((product) => [product.slugVi, product]))
  let created = 0
  let updated = 0
  let unchanged = 0

  for (const product of products) {
    const slugOwner = existingBySlug.get(product.slugVi)
    if (slugOwner && slugOwner.legacySourceId !== product.legacySourceId) {
      throw new Error(`slugVi collision '${product.slugVi}' between legacySourceId ${slugOwner.legacySourceId} and ${product.legacySourceId}`)
    }
    const current = existingByLegacyId.get(product.legacySourceId)
    if (current && current.id !== product.id) {
      throw new Error(`Stable identity mismatch for legacySourceId ${product.legacySourceId}: ${current.id} != ${product.id}`)
    }
  }

  for (const product of products) {
    const current = existingByLegacyId.get(product.legacySourceId)
    if (!current) {
      created += 1
      if (!options.dryRun) await repository.createProduct(product)
    } else if (canonicalProduct(current) === canonicalProduct(product)) {
      unchanged += 1
    } else {
      updated += 1
      if (!options.dryRun) await repository.updateProduct(product)
    }
  }
  return { created, updated, unchanged, dryRun: options.dryRun }
}
