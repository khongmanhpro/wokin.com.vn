# Payload environments

The Payload admin is a separate authenticated authoring application. The public site continues to consume deterministic static catalog snapshots and does not connect to PostgreSQL at runtime.

## Local development

1. Copy `admin/.env.example` to `admin/.env`.
2. Replace every active `[REDACTED]` value. Use a unique `PAYLOAD_SECRET` of at least 32 characters and a local-only PostgreSQL password.
3. Start PostgreSQL from the admin directory with `docker compose up -d postgres`.
4. Run `npm run db:status`, then `npm run dev`.

Compose publishes PostgreSQL only on `127.0.0.1:54329`, uses the named volume `wokin_payload_pgdata`, and refuses to start unless `POSTGRES_PASSWORD` is explicitly supplied. It does not install seed users or default passwords.

`STORAGE_ADAPTER=local` is the R2 development mode. Local generated media is ignored by Git and must never be treated as production storage.

## CI

CI installs `admin/package-lock.json` with `npm ci`, then runs typecheck, tests, and build. CI uses non-production build-only environment values and performs no release or infrastructure mutation.

## Production contract

Supply environment variables through the hosting platform's secret manager; never commit them or print them in logs. Every process entrypoint runs `npm run check:env` before Payload or Next.js starts.

Required in every environment:

- `DATABASE_URL`
- `PAYLOAD_SECRET` (at least 32 characters)
- `STORAGE_ADAPTER` (`local` or `s3`)

Production additionally requires `PAYLOAD_PUBLIC_SERVER_URL` with an `https://` origin. Payload uses that exact origin for `serverURL`, CORS, and CSRF configuration. Startup validation rejects an absent, malformed, or non-HTTPS production origin without printing its value.

When `STORAGE_ADAPTER=s3`, validation additionally requires `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`. Wiring the external storage adapter belongs to its later implementation phase; R2 only establishes and validates the environment contract.

Database migrations are explicit operations. Schema push is disabled in every environment; no Payload process may infer or mutate schema outside a committed migration:

- `npm run db:status` inspects pending migrations.
- `npm run db:migrate` applies committed migrations.
- `npm run import:poc`, `npm run import:catalog`, and `npm run snapshot:poc` set `NODE_ENV=production` themselves, so their environment must also provide a valid HTTPS `PAYLOAD_PUBLIC_SERVER_URL` (a local-only value such as `https://admin.local.test` is sufficient for isolated local maintenance).
- Use a separate disposable database for development schema experiments; never point `npm run dev` or import commands at a preview, staging, or production database unless its migrations have already been applied.

Do not run migrations implicitly from the application start command, and do not re-enable Payload `push` as a shortcut.

## R4 authentication and authorization policy

The only admin roles are `owner`, `admin`, `editor`, `seo_reviewer`, `media_manager`, `publisher`, and `readonly`. Server-side access functions map those roles to named capabilities; hiding a collection or field in the admin UI is not an authorization boundary. Anonymous and inactive identities fail all admin collection access.

REST uses the collection and field access functions automatically. GraphQL is disabled, so there is no GraphQL collection endpoint to expose. User-driven Local API calls must pass the authenticated request and `overrideAccess: false`; Payload Local API defaults to trusted server operation when `overrideAccess` is omitted. The R3 import/export repositories intentionally retain `overrideAccess: true` as trusted maintenance code and are not user-facing API paths.

`readonly` has no mutation capability. Editors cannot publish products. Publishers can change lifecycle fields but cannot change product content while separation of duties is enabled. Separation of duties defaults to enabled and can only be explicitly disabled with `PAYLOAD_SEPARATION_OF_DUTIES=false`; accepted values are `true` and `false`.

Payload auth uses server-side sessions, a two-hour token lifetime, `SameSite=Strict`, secure cookies in production, token removal from auth responses, five failed-login attempts, and a 15-minute lock. Setting an admin to inactive clears all stored sessions; Payload's session-backed JWT strategy then rejects old session IDs, and the login hook rejects a new login for that user. Role and active fields require `user.manage`; non-managers can only read/update their own non-security profile fields. Existing users receive the least-privilege `readonly` role when the R4 migration runs, so an owner must be provisioned through an approved operator process before rollout.

Audit events are append-only from authenticated internal hooks. REST/GraphQL/user Local API create, update, and delete are denied. Events record actor, entity, event type, UTC occurrence time, request ID/IP when available, and sanitized before/after values. Passwords, hashes, salts, sessions, cookies, authorization values, API keys, secrets, and tokens are redacted before persistence.

The R4 migration makes the audit actor relationship non-null. It intentionally fails instead of deleting or inventing identity if a pre-R4 database contains actor-less audit rows; inspect and remediate those rows through an approved data operation before applying the migration.

Production blockers remain explicit: owner/publisher MFA or approved SSO, an approved email provider for invite/reset, and edge/provider rate limiting for forgot-password requests. Payload's built-in login lockout is configured, but this phase does not invent MFA, SSO, cryptography, email delivery, or a reset-throttling provider. None of those controls may be represented as complete until a provider is selected and staging behavior is verified.

R4 authorization tests are unit/collection contract tests against the real access and hook functions. They cover the shared request boundary used by REST, GraphQL, and Local API, plus the explicit GraphQL-disable contract. They do not boot a PostgreSQL-backed HTTP server and therefore do not claim runtime cookie, CSRF, login/reset endpoint, or end-to-end session-revocation coverage. Those HTTP/browser checks remain a staging gate once an approved email/MFA/SSO and edge-rate-limit setup exists.
