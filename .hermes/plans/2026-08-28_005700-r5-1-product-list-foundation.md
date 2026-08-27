# R5.1 Product List Foundation

**Executor:** Codex worker. **Verification/checkpoint:** Hermes coordinator.

**Goal:** Make the existing Payload Products admin list usable for daily catalog triage without changing the catalog schema, data, RBAC, release flow, or public static site.

## Scope

Use Payload Admin’s native collection-list mechanisms where they satisfy the requirement; do not create a parallel application-level product API.

### Required behavior

1. Server-side pagination over `products`.
2. Native/searchable fields support `nameVi`, `sku`, and `legacySourceId`.
3. Filterable by `status` and `categories`.
4. URL preserves current page, search and filter state through Payload’s supported list-view behavior.
5. A duplicate-SKU visual badge/cell is present in the product list. It must not identify a product by SKU and must not alter stored data.
6. Existing product list still exposes name, SKU, lifecycle status, legacy ID, and slug.
7. Existing R4 access rules and audit hooks remain unchanged.

## Constraints

- Read root `AGENTS.md`, `admin/AGENTS.md`, and relevant installed Next.js 16/Payload documentation before changing code.
- Strict TDD: add a focused R5.1 test, demonstrate RED, then minimal GREEN implementation.
- No schema migration, collection field/model change, import change, or database mutation beyond test/preview data already available.
- No public Next.js source/data/routes; no `src/`, root `package*.json`, public assets or deploy configs.
- No dependency addition, package/lockfile change, or `npm audit fix`.
- No RBAC/access/audit mutation and no `overrideAccess` changes.
- No custom REST route/GraphQL enablement/direct SQL.
- No commit, push, PR, deploy, production DB, or secret creation.

## Preferred file scope

- `admin/src/collections/Products.ts`
- `admin/src/components/**` only for a focused Payload admin list cell/component
- `admin/src/app/(payload)/admin/importMap.js` only if Payload generates/requires an import-map update
- `admin/tests/r5-product-list.test.ts`
- `admin/tests/admin-foundation.test.ts` only if needed for a narrow config contract
- `docs/` only if a non-obvious operational note is necessary

## Acceptance tests

```bash
cd admin
node --import tsx --test tests/r5-product-list.test.ts
npm test
npm run typecheck
```

The worker may run targeted tests and typecheck. The coordinator will run fresh PostgreSQL/import/build/runtime gates independently after diff review.

## Required worker handoff

Return only:

```text
STATUS: DONE | BLOCKED | FAILED
Changed files
RED command/result
GREEN command/result
Targeted test result
Known limitations
```

Do not claim production readiness, do not create a commit, and stop immediately if the required Payload/Next extension point cannot be established from installed docs.