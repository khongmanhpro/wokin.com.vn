# ADR 0001: Payload + PostgreSQL authoring, static catalog publishing

- Status: Accepted for Phase R1 proof of concept
- Date: 2026-08-27
- Scope: catalog authoring and publish boundary only; Phase 10 and the public UI are unchanged

## Context

The public WOKIN site is a deterministic static export. It must not depend on a live CMS or database at request time, and its existing generated-data architecture must remain intact. Phase R1 evaluates Payload CMS backed by PostgreSQL as an authoring system without making Payload the public runtime source.

Catalog identity cannot use SKU: the production source contains duplicate SKUs and the POC also deliberately contains one duplicate pair and one product without a SKU. Vietnamese canonical slugs must remain unique, while legacy source IDs and UUIDs must remain stable across repeated imports.

## Decision

1. Run Payload as a separate application under `admin/`, backed by PostgreSQL. It owns authenticated authoring collections for administrators, products, categories, and media references.
2. Use `legacySourceId` as the idempotent import key and preserve the product UUID. SKU is nullable and non-unique. `slugVi` is unique and collisions block the entire import with both legacy IDs reported.
3. Publish through the versioned `contracts/catalog-snapshot.schema.json` contract. A snapshot contains only public catalog fields, has `schemaVersion: 1`, deterministic UUID relations, a content-derived `snapshotId`, and a SHA-256 checksum.
4. Canonical serialization sorts object keys recursively but preserves array order. Import idempotency and snapshot checksums therefore do not depend on database object-key order.
5. The public builder consumes the validated snapshot and emits the same generated filenames and public data shape used by the existing static application. The browser and public Next.js build never query Payload or PostgreSQL.
6. Database schema changes are represented by checked-in Payload migrations. Production-like migration runs set `PAYLOAD_SECRET` and `DATABASE_URL` only in the process environment; no real secret is stored in source, fixtures, snapshots, or documentation.

## Consequences

- Authoring availability and public serving availability are decoupled. A CMS/database outage cannot break an already published static site.
- Publishing is an explicit validation boundary. Invalid records, broken relations, slug collisions, or checksum mismatches fail the publish instead of being silently dropped.
- The snapshot contract must be versioned when a breaking public field change is required. Consumers may reject unsupported schema versions.
- Media in R1 is represented by safe relative public paths; binary asset ingestion into Payload is outside this POC.
- The 20-record fixture proves the boundary and edge cases, but does not authorize replacing the full 1,357-product production dataset.

## Alternatives considered

- Query Payload/PostgreSQL from public pages: rejected because it removes static-runtime isolation and changes the established public deployment model.
- Use SKU as identity: rejected because SKU can be missing or duplicated.
- Publish unversioned JSON directly from Payload: rejected because it provides no stable compatibility contract or deterministic integrity check.
- Let Payload push schema automatically in production: rejected in favor of reviewable migrations (`push` is disabled when `NODE_ENV=production`).

## Phase R1 evidence

On 2026-08-27, an ephemeral `postgres:16.6-alpine` container was used because the Docker daemon was available (the Compose plugin was not). No persistent volume was attached.

- `npm run db:migrate`: applied `20260827_094616_initial_poc` successfully.
- `npm run db:status`: reported the migration as batch 1, `Ran=Yes`.
- First `npm run import:poc`: `20 create, 0 update, 0 unchanged`.
- Second `npm run import:poc`: `0 create, 0 update, 20 unchanged`.
- Database export validation: `poc-d2ea5162bce16ca3`, 20 products, 12 categories, 22 media.
- Database export matched `admin/snapshots/catalog-poc.json` byte-for-byte.

The container and temporary export directory were removed after verification. Environment values used for the check were temporary and are intentionally not recorded.
