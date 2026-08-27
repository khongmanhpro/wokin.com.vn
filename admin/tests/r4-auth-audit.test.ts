import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import config from '../src/payload.config.js'
import { buildAuditEvent, sanitizeAuditValue } from '../src/access/audit.js'
import { revokeSessionsWhenDeactivated, rejectInactiveLogin } from '../src/access/auth.js'
import { Admins } from '../src/collections/Admins.js'
import { AuditEvents } from '../src/collections/AuditEvents.js'
import { validateEnvironment } from '../src/config/environment.js'

test('Payload auth uses secure production cookies, sessions, response token removal and lockout limits', () => {
  const auth = Admins.auth
  assert.ok(auth && typeof auth === 'object')
  assert.equal(auth.cookies?.sameSite, 'Strict')
  assert.equal(auth.cookies?.secure, process.env.NODE_ENV === 'production')
  assert.equal(auth.useSessions, true)
  assert.equal(auth.removeTokenFromResponses, true)
  assert.equal(auth.maxLoginAttempts, 5)
  assert.equal(auth.lockTime, 15 * 60 * 1000)
  assert.ok((auth.tokenExpiration ?? Infinity) <= 2 * 60 * 60)
})

test('inactive users cannot log in and deactivation revokes every stored session', () => {
  assert.throws(() => rejectInactiveLogin({ user: { active: false } } as any), /inactive/i)
  const result = revokeSessionsWhenDeactivated({
    data: { active: false },
    originalDoc: { active: true, sessions: [{ id: 'old-session' }] },
  } as any)
  assert.deepEqual(result.sessions, [])
})

test('AuditEvents are API-immutable and accept create only from authenticated internal audit context', async () => {
  assert.equal(await AuditEvents.access?.update?.({ req: { user: { active: true, role: 'owner' } } } as any), false)
  assert.equal(await AuditEvents.access?.delete?.({ req: { user: { active: true, role: 'owner' } } } as any), false)
  assert.equal(await AuditEvents.access?.create?.({ req: { context: {}, user: { active: true, role: 'owner' } } } as any), false)
  assert.equal(await AuditEvents.access?.create?.({
    req: { context: { internalAudit: true }, user: { active: true, role: 'editor' } },
  } as any), true)
})

test('audit metadata ignores client-controlled forwarded IP and preserves framework-derived IP', () => {
  const common = {
    after: { title: 'After' },
    entityId: 'entity-1',
    entityType: 'products',
    eventType: 'products.update',
  }
  const spoofed = buildAuditEvent({
    ...common,
    req: {
      headers: new Headers({ 'x-forwarded-for': '203.0.113.7', 'x-request-id': 'req-42' }),
      user: { active: true, id: 'actor-1', role: 'admin' },
    } as any,
  })
  const trusted = buildAuditEvent({
    ...common,
    req: {
      headers: new Headers({ 'x-forwarded-for': '198.51.100.9', 'x-request-id': 'req-43' }),
      ip: '203.0.113.8',
      user: { active: true, id: 'actor-1', role: 'admin' },
    } as any,
  })

  assert.equal(spoofed.actor, 'actor-1')
  assert.equal(spoofed.entityType, 'products')
  assert.equal(spoofed.entityId, 'entity-1')
  assert.equal(spoofed.eventType, 'products.update')
  assert.ok(!Number.isNaN(Date.parse(spoofed.occurredAt)))
  assert.equal(spoofed.ip, undefined)
  assert.equal(spoofed.requestId, 'req-42')
  assert.equal(trusted.ip, '203.0.113.8')
  assert.equal(trusted.requestId, 'req-43')

  const actorField = AuditEvents.fields.find((field) => 'name' in field && field.name === 'actor')
  assert.equal(actorField && 'required' in actorField ? actorField.required : undefined, true)
})

test('audit request ID is bounded correlation metadata', () => {
  const event = buildAuditEvent({
    entityId: 'entity-1',
    entityType: 'products',
    eventType: 'products.update',
    req: {
      headers: new Headers({ 'x-request-id': 'request-id-'.repeat(300) }),
      user: { active: true, id: 'actor-1', role: 'admin' },
    } as any,
  })

  assert.equal(event.ip, undefined)
  assert.match(event.requestId ?? '', /\[TRUNCATED: 3300 chars\]$/)
})

test('audit payload redacts secrets before bounding strings, arrays, and object keys', () => {
  const oversizedObject = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`field-${index}`, index]))
  const event = buildAuditEvent({
    after: {
      nested: { token: 'do-not-leak-token' },
      rows: Array.from({ length: 101 }, (_, index) => index),
      title: 'x'.repeat(2049),
      ...oversizedObject,
    },
    before: { password: 'do-not-leak-password', title: 'Before' },
    entityId: 'entity-1',
    entityType: 'products',
    eventType: 'products.update',
    req: {
      headers: new Headers(),
      ip: '203.0.113.8',
      user: { active: true, id: 'actor-1', role: 'admin' },
    } as any,
  })

  assert.doesNotMatch(JSON.stringify(event), /do-not-leak-token|do-not-leak-password/)
  assert.deepEqual(sanitizeAuditValue({ password: 'x', safe: 'ok' }), { password: '[REDACTED]', safe: 'ok' })
  assert.match(String((event.after as any).title), /\[TRUNCATED: 2049 chars\]$/)
  assert.equal((event.after as any).nested.token, '[REDACTED]')
  assert.equal((event.after as any).rows.at(-1), '[TRUNCATED: 1 items]')
  assert.equal((event.after as any).__truncatedKeys, '[TRUNCATED: 4 keys]')
})

test('GraphQL remains disabled and every registered admin collection has explicit access control', async () => {
  const payloadConfig = await config
  assert.equal(payloadConfig.graphQL?.disable, true)
  for (const collection of payloadConfig.collections ?? []) {
    assert.ok(collection.access?.create, `${collection.slug}.create`)
    assert.ok(collection.access?.read, `${collection.slug}.read`)
    assert.ok(collection.access?.update, `${collection.slug}.update`)
    assert.ok(collection.access?.delete, `${collection.slug}.delete`)
  }
})

test('production environment rejects non-HTTPS admin origin without echoing supplied values', async () => {
  const environmentSource = await readFile(path.resolve('src/config/environment.ts'), 'utf8')
  assert.match(environmentSource, /PAYLOAD_PUBLIC_SERVER_URL/)
  assert.match(environmentSource, /https:/)
  assert.doesNotMatch(environmentSource, /console\.(log|error).*DATABASE_URL/)

  const baseline: NodeJS.ProcessEnv = {
    DATABASE_URL: 'postgresql://wokin:hidden@127.0.0.1:54329/wokin',
    NODE_ENV: 'production',
    PAYLOAD_SECRET: 'production-secret-with-at-least-32-characters',
    STORAGE_ADAPTER: 'local',
  }
  assert.ok(validateEnvironment({ ...baseline, PAYLOAD_PUBLIC_SERVER_URL: 'http://admin.example.test' }).some((error) => /HTTPS/i.test(error)))
  assert.ok(validateEnvironment({ ...baseline }).some((error) => /PAYLOAD_PUBLIC_SERVER_URL/.test(error)))
  assert.deepEqual(validateEnvironment({ ...baseline, PAYLOAD_PUBLIC_SERVER_URL: 'https://admin.example.test' }), [])
})
