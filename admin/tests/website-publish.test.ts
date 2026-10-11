import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { publishConfig, websiteBuildEnv } from '../src/lib/websitePublish.js'

test('website publishing stays off until the server names the live website folder', () => {
  const config = publishConfig({} as unknown as NodeJS.ProcessEnv)
  assert.equal(config.enabled, false)
  assert.match((config as { reason: string }).reason, /WEBSITE_PUBLISH_DIR/)
})

test('website publishing finds the website checkout next to the admin and derives the contact URL', () => {
  const config = publishConfig({ WEBSITE_PUBLISH_DIR: '/srv/wokin-site', PAYLOAD_PUBLIC_SERVER_URL: 'https://admin.wokin.vn/' } as unknown as NodeJS.ProcessEnv)
  assert.equal(config.enabled, true)
  if (!config.enabled) return
  assert.equal(config.websiteDir, path.resolve('..'))
  assert.equal(config.targetDir, '/srv/wokin-site')
  assert.equal(config.contactApiUrl, 'https://admin.wokin.vn/api/contact-submissions/submit')
})

test('the website build never inherits admin secrets or next dev flags', () => {
  const config = publishConfig({ WEBSITE_PUBLISH_DIR: '/srv/wokin-site', PAYLOAD_PUBLIC_SERVER_URL: 'https://admin.wokin.vn' } as unknown as NodeJS.ProcessEnv)
  if (!config.enabled) throw new Error('expected enabled config')
  const env = websiteBuildEnv(config, { PATH: '/usr/bin', HOME: '/home/wokin', DATABASE_URL: 'postgres://secret', PAYLOAD_SECRET: 'secret', TURBOPACK: '1', __NEXT_PRIVATE_ORIGIN: 'x', NODE_ENV: 'development' } as unknown as NodeJS.ProcessEnv)
  assert.equal(env.PATH, '/usr/bin')
  assert.equal(env.NODE_ENV, 'production')
  assert.equal(env.NEXT_PUBLIC_CONTACT_API_URL, 'https://admin.wokin.vn/api/contact-submissions/submit')
  for (const key of ['DATABASE_URL', 'PAYLOAD_SECRET', 'TURBOPACK', '__NEXT_PRIVATE_ORIGIN']) assert.equal(env[key], undefined, key)
})
