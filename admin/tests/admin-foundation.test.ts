import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'

const adminRoot = path.resolve('.')

function runEnvCheck(overrides: NodeJS.ProcessEnv) {
  const env = { ...process.env, ...overrides }
  delete env.DATABASE_URL
  delete env.PAYLOAD_SECRET
  delete env.S3_ACCESS_KEY_ID
  delete env.S3_BUCKET
  delete env.S3_ENDPOINT
  delete env.S3_REGION
  delete env.S3_SECRET_ACCESS_KEY
  Object.assign(env, overrides)

  return spawnSync(process.execPath, ['--import', 'tsx', 'scripts/check-env.ts'], {
    cwd: adminRoot,
    encoding: 'utf8',
    env,
  })
}

test('environment validation fails fast without printing configured secrets', () => {
  const databaseURL = 'postgresql://wokin:do-not-print-database-secret@127.0.0.1:54329/wokin'
  const result = runEnvCheck({ DATABASE_URL: databaseURL, NODE_ENV: 'development', STORAGE_ADAPTER: 'local' })
  const output = `${result.stdout}${result.stderr}`

  assert.equal(result.status, 1)
  assert.match(output, /PAYLOAD_SECRET/)
  assert.doesNotMatch(output, /do-not-print-database-secret/)
})

test('S3 storage validation reports missing variable names only', () => {
  const result = runEnvCheck({
    DATABASE_URL: 'postgresql://wokin:hidden@127.0.0.1:54329/wokin',
    NODE_ENV: 'production',
    PAYLOAD_SECRET: 'another-hidden-secret',
    STORAGE_ADAPTER: 's3',
  })
  const output = `${result.stdout}${result.stderr}`

  assert.equal(result.status, 1)
  assert.match(output, /S3_BUCKET/)
  assert.match(output, /S3_SECRET_ACCESS_KEY/)
  assert.doesNotMatch(output, /another-hidden-secret|postgresql:\/\//)
})

test('valid local development environment passes without echoing values', () => {
  const result = runEnvCheck({
    DATABASE_URL: 'postgresql://wokin:hidden@127.0.0.1:54329/wokin',
    NODE_ENV: 'development',
    PAYLOAD_SECRET: 'local-hidden-secret-with-enough-entropy',
    STORAGE_ADAPTER: 'local',
  })
  const output = `${result.stdout}${result.stderr}`

  assert.equal(result.status, 0, output)
  assert.match(output, /Environment validation passed/)
  assert.doesNotMatch(output, /local-hidden-secret|postgresql:\/\//)
})

test('admin package exposes the complete R2 command surface', async () => {
  const packageJSON = JSON.parse(await readFile(path.join(adminRoot, 'package.json'), 'utf8'))
  const requiredScripts = [
    'dev',
    'build',
    'start',
    'typecheck',
    'test',
    'db:migrate',
    'db:status',
    'verify',
    'generate:types',
    'generate:importmap',
  ]

  for (const name of requiredScripts) assert.equal(typeof packageJSON.scripts[name], 'string', name)
  assert.match(packageJSON.scripts.verify, /typecheck.*test.*build/)
})

test('release validation command explicitly requires a caller-supplied snapshot path', async () => {
  const packageJSON = JSON.parse(await readFile(path.join(adminRoot, 'package.json'), 'utf8'))
  const command = packageJSON.scripts['validate:release']

  assert.match(command, /--release/)
  assert.match(command, /--snapshot/)
})

test('migration-managed Payload never auto-pushes schema and data commands use an explicit safe mode', async () => {
  const [packageJSON, payloadConfig, environmentExample] = await Promise.all([
    readFile(path.join(adminRoot, 'package.json'), 'utf8'),
    readFile(path.join(adminRoot, 'src/payload.config.ts'), 'utf8'),
    readFile(path.join(adminRoot, '.env.example'), 'utf8'),
  ])
  const scripts = JSON.parse(packageJSON).scripts as Record<string, string>

  assert.match(payloadConfig, /push:\s*false/)
  assert.doesNotMatch(payloadConfig, /push:\s*process\.env\.NODE_ENV/)
  assert.match(environmentExample, /^PAYLOAD_PUBLIC_SERVER_URL=https:\/\/admin\.local\.test$/m)
  for (const scriptName of ['import:poc', 'import:catalog', 'snapshot:poc']) {
    assert.match(scripts[scriptName], /NODE_ENV=production/, scriptName)
  }
})

test('admin CI validates database migrations and reruns when catalog contracts change', async () => {
  const workflow = await readFile(path.resolve(adminRoot, '../.github/workflows/admin-ci.yml'), 'utf8')

  assert.match(workflow, /services:\s*\n\s*postgres:/)
  assert.match(workflow, /image:\s*postgres:16\.6-alpine/)
  assert.match(workflow, /npm run db:migrate/)
  assert.match(workflow, /npm run db:status/)
  assert.match(workflow, /src\/data\/catalog\.generated\.json/)
  assert.match(workflow, /src\/data\/image-metadata\.generated\.json/)
  assert.match(workflow, /contracts\/\*\*/)
})

test('Docker, CI, and Payload branding configs enforce the R2 baseline', async () => {
  const [compose, dockerfile, workflow, nextConfig, payloadConfig, styles, tokens] = await Promise.all([
    readFile(path.join(adminRoot, 'docker-compose.yml'), 'utf8'),
    readFile(path.join(adminRoot, 'Dockerfile'), 'utf8'),
    readFile(path.resolve(adminRoot, '../.github/workflows/admin-ci.yml'), 'utf8'),
    readFile(path.join(adminRoot, 'next.config.mjs'), 'utf8'),
    readFile(path.join(adminRoot, 'src/payload.config.ts'), 'utf8'),
    readFile(path.join(adminRoot, 'src/app/(payload)/custom.scss'), 'utf8'),
    readFile(path.join(adminRoot, 'src/styles/admin-tokens.scss'), 'utf8'),
  ])

  assert.match(compose, /image:\s*postgres:16\.6-alpine/)
  assert.match(compose, /127\.0\.0\.1:54329:5432/)
  assert.match(compose, /POSTGRES_PASSWORD:\s*"\$\{POSTGRES_PASSWORD:\?/)
  assert.match(compose, /healthcheck:/)
  assert.match(compose, /wokin_payload_pgdata:/)
  assert.doesNotMatch(compose, /POSTGRES_PASSWORD:\s*(wokin|password|postgres)\s*$/m)

  assert.match(dockerfile, /npm ci/)
  assert.match(dockerfile, /npm run build/)
  assert.match(dockerfile, /USER nextjs/)

  assert.match(workflow, /npm ci/)
  assert.match(workflow, /npm run typecheck/)
  assert.match(workflow, /npm test/)
  assert.match(workflow, /npm run build/)
  assert.doesNotMatch(workflow, /deploy/i)

  assert.match(nextConfig, /turbopack:\s*\{\s*root:/)
  assert.match(nextConfig, /allowedDevOrigins:\s*\[\s*'localhost',\s*'127\.0\.0\.1'\s*\]/)
  assert.match(payloadConfig, /graphics:/)
  assert.match(payloadConfig, /Nav:\s*'\/components\/WokinNav#WokinNav'/)
  assert.doesNotMatch(payloadConfig, /afterNavLinks:/)
  assert.match(tokens, /#fe7700/i)
  assert.match(styles, /:focus-visible/)
  assert.match(styles, /prefers-reduced-motion/)
})
