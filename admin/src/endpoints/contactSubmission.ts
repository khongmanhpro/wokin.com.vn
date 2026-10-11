import type { Endpoint, PayloadRequest } from 'payload'

import { hasCapability, type Capability } from '../access/hasCapability'

const CONTACT_CAPABILITY: Capability = 'settings.manage'
const MAX_NAME_LENGTH = 120
const MAX_PHONE_LENGTH = 32
const MAX_EMAIL_LENGTH = 160
const MAX_MESSAGE_LENGTH = 4000
const MAX_SOURCE_URL_LENGTH = 500
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX = 5
type ContactSubject = 'product' | 'quote' | 'distribution' | 'other'
const SUBJECTS = new Set<ContactSubject>(['product', 'quote', 'distribution', 'other'])

type RateLimitEntry = { count: number; resetAt: number }

const rateLimits = new Map<string, RateLimitEntry>()

function json(data: Record<string, unknown>, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

function textValue(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function messageValue(value: unknown): string {
  return textValue(value, MAX_MESSAGE_LENGTH).replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n')
}

function allowedOrigins(): Set<string> {
  const configured = (process.env.CONTACT_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/u, ''))
    .filter(Boolean)
  if (process.env.NODE_ENV !== 'production') configured.push('http://localhost:4173', 'http://127.0.0.1:4173')
  return new Set(configured)
}

function sourceUrl(value: unknown, fallback: string | null): string | undefined {
  const raw = textValue(value, MAX_SOURCE_URL_LENGTH)
  if (!raw) return fallback || undefined
  try {
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) return fallback || undefined
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString().slice(0, MAX_SOURCE_URL_LENGTH)
  } catch {
    return fallback || undefined
  }
}

function clientKey(req: PayloadRequest): string {
  const rawIp = (req as PayloadRequest & { ip?: unknown }).ip
  if (typeof rawIp === 'string' && rawIp.trim()) return rawIp.trim().split(',')[0].slice(0, 96)
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('origin') || 'anonymous'
}

function consumeRateLimit(key: string): boolean {
  const now = Date.now()
  const current = rateLimits.get(key)
  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (current.count >= RATE_LIMIT_MAX) return false
  current.count += 1
  return true
}

function isValidEmail(value: string): boolean {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)
}

function activeAdmin(req: PayloadRequest): boolean {
  return hasCapability(req.user, CONTACT_CAPABILITY)
}

export const contactSubmissionEndpoint: Endpoint = {
  path: '/submit',
  method: 'post',
  handler: async (req) => {
    const privileged = activeAdmin(req)
    const origin = req.headers.get('origin')?.replace(/\/$/u, '') || null
    if (!privileged && (!origin || !allowedOrigins().has(origin))) {
      return json({ error: 'Nguồn gửi không được phép.' }, 403)
    }

    const data = (req.data ?? {}) as Record<string, unknown>
    if (textValue(data.website, 200)) return json({ error: 'Dữ liệu không hợp lệ.' }, 400)
    if (!privileged && !consumeRateLimit(clientKey(req))) return json({ error: 'Vui lòng thử lại sau.' }, 429)

    const fullName = textValue(data.fullName, MAX_NAME_LENGTH)
    const phone = textValue(data.phone, MAX_PHONE_LENGTH)
    const email = textValue(data.email, MAX_EMAIL_LENGTH)
    const subject = textValue(data.subject, 32) as ContactSubject
    const message = messageValue(data.message)
    const consent = data.consent === true

    const errors: string[] = []
    if (fullName.length < 2) errors.push('Họ và tên không hợp lệ.')
    if (!/^(?:\+84|0)[0-9 .-]{8,12}$/u.test(phone)) errors.push('Số điện thoại không hợp lệ.')
    if (!isValidEmail(email)) errors.push('Email không hợp lệ.')
    if (!SUBJECTS.has(subject)) errors.push('Nhu cầu hỗ trợ không hợp lệ.')
    if (message.length < 10) errors.push('Nội dung cần hỗ trợ quá ngắn.')
    if (!consent) errors.push('Chưa có đồng ý xử lý thông tin.')
    if (errors.length > 0) return json({ error: errors[0], fields: errors }, 400)

    await req.payload.create({
      collection: 'contact-submissions',
      data: {
        fullName,
        phone,
        email: email || null,
        subject,
        message,
        consent: true,
        status: 'new',
        sourceUrl: sourceUrl(data.sourceUrl, origin) ?? '',
        submittedAt: new Date().toISOString(),
      },
      depth: 0,
      overrideAccess: !privileged,
      req,
    })

    return json({ ok: true })
  },
}
