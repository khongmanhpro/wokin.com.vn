# R5 — Admin UX and Editorial Workflow Execution Plan

**Executor:** Codex workers, one bounded subphase at a time. **Coordinator:** Hermes performs all review, integration gates, and local checkpoints.

**Goal:** Let the WOKIN team operate the imported catalog through Payload Admin while preserving R1–R4.2 security boundaries and the static-public architecture.

## Non-negotiable constraints

- Public `wokin.com.vn` remains Next.js static export and never queries Payload/PostgreSQL at runtime.
- No worker may commit, push, deploy, mutate production, add secrets, or use force dependency updates.
- Each writer starts from a reviewed checkpoint and touches one bounded scope only.
- Schema changes require a new generated Payload migration, fresh DB migration proof, full import/re-import, and updated types.
- Review/publish policy stays server-enforced; UI visibility is never an authorization boundary.
- Every new user-facing flow requires targeted tests before implementation and an independent coordinator gate.

## R5.2 — Product editor usability

**Goal:** Organize the existing Product editor so daily editors can safely find and edit imported fields.

- UI-only config/components: identity and provenance visibly read-only; Vietnamese content; technical specifications; packaging/attributes; categories/media; SEO; lifecycle/validation information.
- Preserve existing field paths, collection hooks, RBAC, and status semantics.
- Do not create migrations or new persistence fields in this subphase.
- Add focused configuration/behavior tests and run targeted test + typecheck.

## R5.3 — Workflow review and publish policy

**Goal:** Make `draft → in_review → changes_requested/approved → published → archived` explicit, with reviewer comments/revision evidence and audited transitions.

- Design the smallest durable model needed for review request/comment/transition evidence.
- This is a schema phase: migration generation, types, migration contract tests, fresh DB import/re-import proof are mandatory.
- Publisher may publish only approved/valid content; reviewer and publisher separation remains server-enforced.
- No public release/snapshot publish implementation (R6/R7).

## R5.4 — Operational collection UX

**Goal:** Make Category, Media, Pages, SEO, Redirects, Users, and Audit screens practical for operators.

- Native list configuration: useful default columns, searchable/indexed fields, pagination and role-appropriate filters.
- Redirect path validation/loop-prevention is server-side and test-covered.
- Media rights/alt/metadata and category/page SEO use clear admin grouping/labels.
- No binary object-storage provider integration and no public release center behavior.

## R5.5 — Draft preview and publish readiness

**Goal:** Give reviewers a safe preview decision boundary without exposing draft content to public search or static production pages.

- Preview stays authenticated/admin-bound and noindex; no direct public runtime DB query.
- Validation summary must block publish state transition on missing required operational/SEO/media data according to the approved server policy.
- Snapshot/release generation remains R6/R7.

## R5.6 — Browser, accessibility, and runtime acceptance

**Goal:** Verify real admin workflows, not merely source config.

- Role-specific product draft/edit/review/publish negative paths.
- Keyboard/focus/form error/responsive checks for R5 screens.
- HTTP/browser smoke on temporary PostgreSQL with approved test-only identities; never create or modify production identities.
- Re-run public regression because public architecture must remain independent.

## Required final R5 gates

```bash
cd admin
npm test
npm run typecheck
npm run build
# fresh temporary PostgreSQL: migrate, status, full import, re-import

cd ..
npm test
npm run typecheck
npm run validate:data
npm run check:data
npm run build
npm run validate:export

git diff --check
npm audit --omit=dev
(cd admin && npm audit --omit=dev)
```

**Final acceptance:** editor can create/update draft; reviewer can request changes and see revision evidence; publisher can only publish valid approved content; preview is authenticated/noindex/no internal field leak; transitions have audit actor/time/request metadata; category/media/page/SEO/redirect UX is usable; role boundaries, public static build, imports, and deployment separation are preserved.
