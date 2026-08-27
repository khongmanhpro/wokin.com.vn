# Payload/static catalog compatibility evidence

This document records the Phase R1 proof-of-concept boundary. It is compatibility evidence for the 20-record fixture and its checked-in snapshot, not a claim that the full production catalog has migrated.

## Contract under test

- Schema: `contracts/catalog-snapshot.schema.json`, `schemaVersion: 1`
- Validator/canonical serializer: `contracts/catalog-snapshot-validator.mjs`
- Fixture: `admin/fixtures/poc-products.json` (exactly 20 products)
- Snapshot: `admin/snapshots/catalog-poc.json`
- Snapshot ID: `poc-d2ea5162bce16ca3`
- Snapshot checksum: `228c17ddd1abeebfe89ba8711766bfdce5915c4d61756f1fb6ba5d2cc567628e`
- Snapshot cardinality: 20 products, 12 categories, 22 media

## Field and behavior compatibility

| Concern | Payload/import representation | Publish contract/public result | Evidence |
|---|---|---|---|
| Stable identity | UUID `id` plus unique integer `legacySourceId` | Both fields are retained | Import rejects UUID changes for an existing legacy ID |
| Product URL | Unique ASCII `slugVi` | `slugVi` is retained for Vietnamese routes | Validator rejects invalid or duplicate slugs |
| SKU edge cases | Nullable, indexed, not unique | String or `null`; never used as identity | Fixture has one `null` SKU and two products with SKU `789501` |
| Vietnamese name | Required `nameVi` | Required `nameVi` | Fixture and snapshot validation pass |
| Categories | Payload relationships | Deterministic category UUIDs in `categoryIds` | Snapshot contains 12 deduplicated categories; missing references fail validation |
| Media | Payload relationships to safe relative paths | Deterministic media UUIDs in `mediaIds` | Snapshot contains 22 media records; unsafe/missing paths fail validation |
| Specifications | Required array of label/value and optional unit | Same public fields | Empty or malformed arrays block import/publish |
| Admin-only data | Payload timestamps/auth/internal fields may exist in PostgreSQL | Excluded from snapshot | Test rejects leakage patterns such as email, password, hash, salt, `createdAt`, and `updatedAt` |
| Determinism | Database drivers may return object keys in another order | Recursive key sorting; array order preserved | Regression test reorders nested category/media keys and reports the record unchanged |
| Integrity | Export sorts products/categories/media deterministically | Content-derived snapshot ID and SHA-256 checksum | Reversing input products produces an identical validated snapshot |
| Public integration | No runtime CMS dependency | Existing generated filenames remain available | Builder emits `catalog.generated.json`, `categories.json`, `products_vi.json`, `search-index.json`, `vi-glossary.json`, `README.md`, and checksum manifest deterministically |

## Executed evidence (2026-08-27)

Targeted and PostgreSQL checks:

```text
admin import regression: 9 tests, 9 pass after the deterministic comparison fix
admin typecheck: PASS
admin build: PASS (Payload admin and API routes compiled)
checked-in snapshot validator: PASS (20 products / 12 categories / 22 media)
public typecheck: PASS; compiler file set contains no admin/ paths
public tests: PASS
public validate:data: PASS (1,357 products / 30 categories / 1,720 local image references)
public check:data: PASS with generated checksum `2a21315a35e8ef72185eedf8ce97a02e3f66b8d01e66b4823aac2a1671ef1e29`
PostgreSQL 16.6 migration: PASS; migration status Ran=Yes
first database import: 20 create / 0 update / 0 unchanged
second database import: 0 create / 0 update / 20 unchanged
database snapshot validator: PASS (20 products / 12 categories / 22 media)
database export vs checked-in snapshot: byte-for-byte MATCH
```

The PostgreSQL check used an ephemeral Docker container without a volume. `PAYLOAD_SECRET`, the database password, and `DATABASE_URL` were temporary process environment values and were not written to the repository.

## Compatibility limits

- R1 proves a 20-product POC, including duplicate/missing SKU and multiple-media cases. The production 1,357-product migration remains a later, separately reviewed operation.
- Schema version 1 supports the fields in the checked-in contract only. Breaking additions or semantic changes require a new schema version and consumer compatibility plan.
- R1 stores media references, not Payload-managed media binaries.
- The public site remains static and unchanged; this POC does not alter Phase 10 release/deployment behavior.
