# Audit governance

## Scope and security boundary

`AuditEvents` is append-only at the Payload application boundary. Authenticated internal hooks create events; REST, GraphQL, and user-originated Local API calls cannot create, update, or delete them.

Application-level append-only access is **not** a defense against a PostgreSQL superuser, a compromised database backup, or a hosting operator with direct database access. Production approval requires separate application and migration/database-administrator credentials, least-privilege access review, and auditable operator access through the hosting platform.

## Trusted request metadata

Audit IP is recorded only when the runtime/framework supplies `req.ip`. The application intentionally ignores `X-Forwarded-For` and other forwarded headers because clients can supply them directly.

Before staging or production:

1. The ingress/reverse proxy owner must strip client-supplied forwarded identity headers.
2. The application hosting/runtime owner must configure trusted-proxy behavior so the framework-derived `req.ip` is the intended client address.
3. The release owner must verify an authenticated audit event through the real ingress path and confirm the recorded IP policy.

If this contract is not verified, missing IP is safer than a spoofable IP claim. `x-request-id` is correlation metadata only, never a network identity assertion.

## Audit payload limits

Audit snapshots sanitize known sensitive key names before persistence. Passwords, passphrases, secrets, tokens, authorization values, cookies, API keys, hashes, salts, and sessions are stored as `[REDACTED]`.

To bound row size and avoid logging unbounded untrusted input, each value is limited deterministically:

| Value | Limit | Omission marker |
| --- | ---: | --- |
| Object nesting | 8 levels | `[MAX_DEPTH]` |
| String | 2,048 characters | `[TRUNCATED: <original-length> chars]` |
| Array | 100 entries | `[TRUNCATED: <omitted-count> items]` |
| Object | 100 source keys | `__truncatedKeys: [TRUNCATED: <omitted-count> keys]` |

Markers retain counts only; omitted raw values are not hashed or copied elsewhere by this phase.

## Retention, backup, and incident responsibilities

No automatic `AuditEvents` deletion is permitted until retention, archive, and restore requirements are approved in writing. Define the following before a production rollout:

| Responsibility | Required accountable owner | Decision / evidence |
| --- | --- | --- |
| Routine audit review | `[ASSIGN SECURITY/OPERATIONS OWNER]` | Review cadence and escalation path |
| Retention duration and legal/privacy review | `[ASSIGN DATA GOVERNANCE OWNER]` | Approved retention and deletion policy |
| Archive/export storage | `[ASSIGN PLATFORM OWNER]` | Encryption, access control, restore location |
| Backup inclusion and restore drill | `[ASSIGN DATABASE OWNER]` | Successful audit-event restore evidence |
| Incident retrieval | `[ASSIGN INCIDENT COMMAND OWNER]` | Access procedure and evidence handling |

Any export or archive must preserve event ordering/correlation fields and be access-controlled. The rollout checklist must include audit data in backup/restore drills; an application backup that excludes `AuditEvents` is incomplete for this purpose.

## Production release gate

Before production, verify all of the following:

- trusted-proxy/IP contract through the real ingress;
- separate non-superuser app credentials and privileged migration/admin credentials;
- audit backup/restore includes `AuditEvents`;
- designated owners above are assigned;
- no unapproved retention deletion job exists;
- current dependency risk register has a documented owner and disposition for every finding.
