# Dependency risk register

**Last verified:** 2026-08-28 via `npm audit --omit=dev` against the committed lockfiles. This register is a remediation decision record, not a claim that the admin environment is vulnerability-free.

## Current audit state

| Surface | Result |
| --- | --- |
| Public static Next.js project | `0 vulnerabilities` |
| Payload admin project | `6 moderate`, `1 low`, `0 high`, `0 critical` |

No `npm audit fix --force` has been run.

## Admin findings and disposition

| Finding group | Severity | Current disposition | Accountable owner | Review deadline |
| --- | --- | --- | --- | --- |
| `dompurify` through admin dependency graph | Moderate | An update is available. Evaluate the smallest compatible update with Payload/admin build, test, and UI smoke coverage before changing the lockfile. | `[ASSIGN ADMIN PLATFORM OWNER]` | Before R6 publish-pipeline completion and before any production admin deployment |
| `monaco-editor` low finding via `dompurify` | Low | Re-evaluate after the compatible `dompurify` update; do not treat it as independently remediated until audit is rerun. | `[ASSIGN ADMIN PLATFORM OWNER]` | Same review as `dompurify` |
| `esbuild`, `@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader` | Moderate | No fix is currently available through the locked dependency graph. Limit exposure to build/development tooling, monitor upstream/Payload compatibility releases, and reassess before production readiness. | `[ASSIGN ADMIN PLATFORM OWNER]` | At every phase checkpoint; blocking review before R8 staging/cutover |
| `drizzle-kit` through `@payloadcms/db-postgres` | Moderate | No fix is currently available through the locked dependency graph. Do not override or force-upgrade around Payload compatibility; reassess with supported Payload/PostgreSQL dependency updates. | `[ASSIGN ADMIN PLATFORM OWNER]` | At every phase checkpoint; blocking review before R8 staging/cutover |

## Remediation rules

1. Run the applicable admin tests, typecheck, production build, and fresh PostgreSQL migration/import gates before accepting a dependency update.
2. Re-run `npm audit --omit=dev` after every lockfile change and update this register with the observed result.
3. Never use `npm audit fix --force` for this project.
4. A dependency finding with no direct fix is not silently accepted: it remains in this register until a supported remediation or explicitly approved risk acceptance exists.
