import assert from 'node:assert/strict'
import test from 'node:test'
import type { PayloadRequest } from 'payload'

import { ContactSubmissions } from '../src/collections/ContactSubmissions.js'
import { contactSubmissionEndpoint } from '../src/endpoints/contactSubmission.js'

function request(overrides: Record<string, unknown> = {}) {
  const created: Array<Record<string, unknown>> = []
  const req = {
    data: {
      fullName: 'Nguyễn Văn A',
      phone: '090 123 4567',
      email: 'a@example.com',
      subject: 'product',
      message: 'Tôi cần tư vấn sản phẩm phù hợp.',
      consent: true,
      website: '',
      sourceUrl: 'https://wokin.vn/lien-he/',
    },
    headers: new Headers({ origin: 'https://wokin.vn' }),
    ip: '203.0.113.10',
    payload: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data)
        return { id: 'contact-test' }
      },
    },
    user: null,
    ...overrides,
  } as unknown as PayloadRequest
  return { req, created }
}

async function responseBody(response: Response) {
  return (await response.json()) as Record<string, unknown>
}

test('contact collection is restricted to settings managers and exposes operational fields', () => {
  assert.equal(ContactSubmissions.slug, 'contact-submissions')
  assert.equal(ContactSubmissions.admin?.group, 'Liên hệ')
  assert.deepEqual(ContactSubmissions.admin?.defaultColumns, ['fullName', 'phone', 'subject', 'status', 'submittedAt'])
  assert.deepEqual(ContactSubmissions.admin?.listSearchableFields, ['fullName', 'phone', 'email'])
  assert.ok(ContactSubmissions.access?.read)
  assert.ok(ContactSubmissions.access?.update)
  assert.ok(ContactSubmissions.fields.some((field) => 'name' in field && field.name === 'status'))
})

test('public contact endpoint validates origin, honeypot and stores a submission', async () => {
  const previousOrigins = process.env.CONTACT_ALLOWED_ORIGINS
  const previousNodeEnv = process.env.NODE_ENV
  Object.assign(process.env, { CONTACT_ALLOWED_ORIGINS: 'https://wokin.vn', NODE_ENV: 'production' })

  try {
    const valid = request({ ip: '203.0.113.11' })
    const success = await contactSubmissionEndpoint.handler(valid.req)
    assert.equal(success.status, 200)
    assert.deepEqual(await responseBody(success), { ok: true })
    assert.equal(valid.created.length, 1)
    assert.equal(valid.created[0].status, 'new')
    assert.equal(valid.created[0].fullName, 'Nguyễn Văn A')

    const badOrigin = request({ ip: '203.0.113.12', headers: new Headers({ origin: 'https://evil.example' }) })
    const forbidden = await contactSubmissionEndpoint.handler(badOrigin.req)
    assert.equal(forbidden.status, 403)

    const honeypot = request({ ip: '203.0.113.13' })
    ;(honeypot.req.data as Record<string, unknown>).website = 'bot'
    const rejectedBot = await contactSubmissionEndpoint.handler(honeypot.req)
    assert.equal(rejectedBot.status, 400)
  } finally {
    if (previousOrigins === undefined) delete (process.env as Record<string, string | undefined>).CONTACT_ALLOWED_ORIGINS
    else Object.assign(process.env, { CONTACT_ALLOWED_ORIGINS: previousOrigins })
    if (previousNodeEnv === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV
    else Object.assign(process.env, { NODE_ENV: previousNodeEnv })
  }
})

test('privileged admin submissions bypass public origin restrictions', async () => {
  const previousNodeEnv = process.env.NODE_ENV
  Object.assign(process.env, { NODE_ENV: 'production' })
  try {
    const adminRequest = request({
      ip: '203.0.113.14',
      headers: new Headers({ origin: 'https://admin.example' }),
      user: { active: true, role: 'admin' },
    })
    const response = await contactSubmissionEndpoint.handler(adminRequest.req)
    assert.equal(response.status, 200)
  } finally {
    if (previousNodeEnv === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV
    else Object.assign(process.env, { NODE_ENV: previousNodeEnv })
  }
})
