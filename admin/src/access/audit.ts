import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import { isActiveAdmin } from './hasCapability'

const sensitiveKeyPattern = /(password|passphrase|secret|token|authorization|cookie|api[-_]?key|hash|salt|session)/i

const MAX_AUDIT_DEPTH = 8
const MAX_AUDIT_ARRAY_ITEMS = 100
const MAX_AUDIT_OBJECT_KEYS = 100
const MAX_AUDIT_STRING_LENGTH = 2048

function truncateAuditString(value: string): string {
  if (value.length <= MAX_AUDIT_STRING_LENGTH) return value
  return `${value.slice(0, MAX_AUDIT_STRING_LENGTH)}[TRUNCATED: ${value.length} chars]`
}

export function sanitizeAuditValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_AUDIT_DEPTH) return '[MAX_DEPTH]'
  if (typeof value === 'string') return truncateAuditString(value)
  if (!value || typeof value !== 'object') return value
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) {
    const sanitized = value.slice(0, MAX_AUDIT_ARRAY_ITEMS).map((item) => sanitizeAuditValue(item, depth + 1))
    if (value.length > MAX_AUDIT_ARRAY_ITEMS) sanitized.push(`[TRUNCATED: ${value.length - MAX_AUDIT_ARRAY_ITEMS} items]`)
    return sanitized
  }

  const entries = Object.entries(value)
  const sanitized: Record<string, unknown> = {}
  for (const [key, nestedValue] of entries.slice(0, MAX_AUDIT_OBJECT_KEYS)) {
    sanitized[key] = sensitiveKeyPattern.test(key) ? '[REDACTED]' : sanitizeAuditValue(nestedValue, depth + 1)
  }
  if (entries.length > MAX_AUDIT_OBJECT_KEYS) sanitized.__truncatedKeys = `[TRUNCATED: ${entries.length - MAX_AUDIT_OBJECT_KEYS} keys]`
  return sanitized
}

function requestMetadata(req: PayloadRequest) {
  const requestId = req.headers?.get('x-request-id') || undefined
  const rawIp = (req as PayloadRequest & { ip?: unknown }).ip
  const ip = typeof rawIp === 'string' && rawIp.trim() ? rawIp.trim() : undefined
  return { ip, requestId: requestId ? truncateAuditString(requestId) : undefined }
}

type AuditEventArgs = {
  after?: unknown
  before?: unknown
  entityId: number | string
  entityType: string
  eventType: string
  metadata?: Record<string, unknown>
  req: PayloadRequest
}

export function buildAuditEvent(args: AuditEventArgs) {
  const { ip, requestId } = requestMetadata(args.req)
  return {
    actor: args.req.user!.id,
    after: sanitizeAuditValue(args.after),
    before: sanitizeAuditValue(args.before),
    entityId: String(args.entityId),
    entityType: args.entityType,
    eventType: args.eventType,
    ip,
    metadata: sanitizeAuditValue(args.metadata ?? {}),
    occurredAt: new Date().toISOString(),
    requestId,
  }
}

async function persistAuditEvent(args: AuditEventArgs): Promise<void> {
  if (!isActiveAdmin(args.req.user)) return
  const create = args.req.payload.create.bind(args.req.payload) as (options: Record<string, unknown>) => Promise<unknown>
  await create({
    collection: 'audit-events',
    context: { ...args.req.context, internalAudit: true },
    data: buildAuditEvent(args),
    depth: 0,
    overrideAccess: false,
    req: args.req,
  })
}

export function auditHooks(entityType: string): {
  afterChange: CollectionAfterChangeHook[]
  afterDelete: CollectionAfterDeleteHook[]
} {
  return {
    afterChange: [async ({ doc, operation, previousDoc, req }) => {
      await persistAuditEvent({
        after: doc,
        before: operation === 'update' ? previousDoc : undefined,
        entityId: doc.id,
        entityType,
        eventType: `${entityType}.${operation}`,
        req,
      })
      return doc
    }],
    afterDelete: [async ({ doc, id, req }) => {
      await persistAuditEvent({
        before: doc,
        entityId: id,
        entityType,
        eventType: `${entityType}.delete`,
        req,
      })
      return doc
    }],
  }
}
