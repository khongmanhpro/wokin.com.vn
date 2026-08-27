export const CATALOG_SCHEMA_VERSION = 1 as const;

export interface CatalogTranslation {
  locale: "vi";
  name: string;
  sourceName: string;
  canonicalSlug: string;
}

export interface CatalogCategoryRelation {
  categoryInternalId: string;
  legacySourceId: number;
  name: string;
  slug: string;
}

export interface CatalogMedia {
  kind: "image";
  path: string;
  alt: string;
  position: number;
}

export interface CatalogAttribute {
  legacySourceId: number | null;
  name: string;
  values: string[];
}

export interface CatalogProductRecord {
  internalId: string;
  legacySourceId: number;
  legacySlug: string;
  sourceType: string;
  productCode: string | null;
  publishedAt: string;
  legacyDescription: string;
  translation: CatalogTranslation;
  categoryRelations: CatalogCategoryRelation[];
  media: CatalogMedia[];
  technicalSpecs: { lines: string[] };
  packaging: { table: string[][] };
  attributes: CatalogAttribute[];
}

export interface CatalogCategoryRecord {
  internalId: string;
  legacySourceId: number;
  sourceName: string;
  slug: string;
  count: number;
  parentInternalId: string | null;
  translation: { locale: "vi"; name: string };
}

export interface CatalogSnapshot {
  schemaVersion: typeof CATALOG_SCHEMA_VERSION;
  sourceChecksum: string;
  canonicalSlugSha256: string;
  categories: CatalogCategoryRecord[];
  products: CatalogProductRecord[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f\d]{64}$/.test(value);
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function assertCatalogSnapshot(value: unknown): asserts value is CatalogSnapshot {
  const errors: string[] = [];
  if (!isRecord(value)) throw new Error("Catalog snapshot schema validation failed:\n- root must be an object");
  if (value.schemaVersion !== CATALOG_SCHEMA_VERSION) errors.push("schemaVersion must be 1");
  if (!isSha256(value.sourceChecksum)) errors.push("sourceChecksum must be a SHA-256 hex digest");
  if (!isSha256(value.canonicalSlugSha256)) errors.push("canonicalSlugSha256 must be a SHA-256 hex digest");
  if (!Array.isArray(value.categories)) errors.push("categories must be an array");
  if (!Array.isArray(value.products)) errors.push("products must be an array");

  const categoryIds = new Set<string>();
  const categorySlugs = new Set<string>();
  if (Array.isArray(value.categories)) {
    value.categories.forEach((candidate, index) => {
      const path = `categories[${index}]`;
      if (!isRecord(candidate)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (!isNonEmptyString(candidate.internalId)) errors.push(`${path}.internalId is required`);
      else if (categoryIds.has(candidate.internalId)) errors.push(`${path}.internalId must be unique`);
      else categoryIds.add(candidate.internalId);
      if (!Number.isInteger(candidate.legacySourceId)) errors.push(`${path}.legacySourceId must be an integer`);
      if (!isNonEmptyString(candidate.sourceName)) errors.push(`${path}.sourceName is required`);
      if (!isNonEmptyString(candidate.slug)) errors.push(`${path}.slug is required`);
      else if (categorySlugs.has(candidate.slug)) errors.push(`${path}.slug must be unique`);
      else categorySlugs.add(candidate.slug);
      if (!Number.isInteger(candidate.count) || Number(candidate.count) < 0) errors.push(`${path}.count must be a non-negative integer`);
      if (candidate.parentInternalId !== null && !isNonEmptyString(candidate.parentInternalId)) errors.push(`${path}.parentInternalId must be null or a string`);
      if (!isRecord(candidate.translation) || candidate.translation.locale !== "vi" || !isNonEmptyString(candidate.translation.name)) errors.push(`${path}.translation must contain locale vi and name`);
    });
  }

  const productIds = new Set<string>();
  const legacyIds = new Set<number>();
  const canonicalSlugs = new Set<string>();
  if (Array.isArray(value.products)) {
    value.products.forEach((candidate, index) => {
      const path = `products[${index}]`;
      if (!isRecord(candidate)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (!isNonEmptyString(candidate.internalId)) errors.push(`${path}.internalId is required`);
      else if (productIds.has(candidate.internalId)) errors.push(`${path}.internalId must be unique`);
      else productIds.add(candidate.internalId);
      if (!Number.isInteger(candidate.legacySourceId)) errors.push(`${path}.legacySourceId must be an integer`);
      else if (legacyIds.has(candidate.legacySourceId as number)) errors.push(`${path}.legacySourceId must be unique`);
      else legacyIds.add(candidate.legacySourceId as number);
      if (!isNonEmptyString(candidate.legacySlug)) errors.push(`${path}.legacySlug is required`);
      if (!isNonEmptyString(candidate.sourceType)) errors.push(`${path}.sourceType is required`);
      if (candidate.productCode !== null && typeof candidate.productCode !== "string") errors.push(`${path}.productCode must be a string or null`);
      if (!isNonEmptyString(candidate.publishedAt)) errors.push(`${path}.publishedAt is required`);
      if (typeof candidate.legacyDescription !== "string") errors.push(`${path}.legacyDescription must be a string`);

      if (!isRecord(candidate.translation)) errors.push(`${path}.translation must be an object`);
      else {
        if (candidate.translation.locale !== "vi") errors.push(`${path}.translation.locale must be vi`);
        if (!isNonEmptyString(candidate.translation.name)) errors.push(`${path}.translation.name is required`);
        if (!isNonEmptyString(candidate.translation.sourceName)) errors.push(`${path}.translation.sourceName is required`);
        if (!isNonEmptyString(candidate.translation.canonicalSlug)) errors.push(`${path}.translation.canonicalSlug is required`);
        else if (canonicalSlugs.has(candidate.translation.canonicalSlug)) errors.push(`${path}.translation.canonicalSlug must be unique`);
        else canonicalSlugs.add(candidate.translation.canonicalSlug);
      }

      if (!Array.isArray(candidate.categoryRelations) || candidate.categoryRelations.length === 0) errors.push(`${path}.categoryRelations must be a non-empty array`);
      else candidate.categoryRelations.forEach((relation, relationIndex) => {
        const relationPath = `${path}.categoryRelations[${relationIndex}]`;
        if (!isRecord(relation) || !isNonEmptyString(relation.categoryInternalId) || !Number.isInteger(relation.legacySourceId) || !isNonEmptyString(relation.name) || !isNonEmptyString(relation.slug)) errors.push(`${relationPath} is malformed`);
        else if (!categoryIds.has(relation.categoryInternalId)) errors.push(`${relationPath}.categoryInternalId references a missing category`);
      });

      if (!Array.isArray(candidate.media) || candidate.media.length === 0) errors.push(`${path}.media must be a non-empty array`);
      else candidate.media.forEach((media, mediaIndex) => {
        const mediaPath = `${path}.media[${mediaIndex}]`;
        if (!isRecord(media) || media.kind !== "image" || !isNonEmptyString(media.path) || !isNonEmptyString(media.alt) || !Number.isInteger(media.position)) errors.push(`${mediaPath} is malformed`);
      });

      const specLines = isRecord(candidate.technicalSpecs) ? candidate.technicalSpecs.lines : undefined;
      const packagingTable = isRecord(candidate.packaging) ? candidate.packaging.table : undefined;
      const validSpecLines = stringArray(specLines);
      const validPackagingTable = Array.isArray(packagingTable) && packagingTable.every(stringArray);
      if (!validSpecLines) errors.push(`${path}.technicalSpecs.lines must be a string array`);
      if (!validPackagingTable) errors.push(`${path}.packaging.table must be a string matrix`);
      if (validSpecLines && validPackagingTable && specLines.length === 0 && packagingTable.length === 0) errors.push(`${path} must contain structured technicalSpecs.lines or packaging.table`);
      if (!Array.isArray(candidate.attributes)) errors.push(`${path}.attributes must be an array`);
    });
  }

  const serialized = JSON.stringify(value);
  if (/\b(?:www\.)?wokintools\.com\b/i.test(serialized)) errors.push("snapshot must not contain source-domain references");
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized)) errors.push("snapshot must not contain email addresses");
  if (errors.length) throw new Error(`Catalog snapshot schema validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
}
