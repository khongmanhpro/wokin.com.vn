import { spawn } from 'node:child_process'
import { existsSync, lstatSync, readdirSync, readlinkSync } from 'node:fs'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Payload } from 'payload'

import { PayloadFullCatalogRepository } from '../catalog/full-payload-repository'
import { exportReleaseSnapshot, selectReleaseCandidate, writeReleaseArtifact } from '../catalog/release-exporter'
import { globalsToPublicSettings, validatePublicSettings } from '../catalog/site-settings-sync'
import { mediaUploadDirectory } from './mediaUpload'

// "Xuất bản website": export what is published in the admin, then run the website's scripts/publish-website.mjs,
// which builds the static site into WEBSITE_PUBLISH_DIR/releases/<id> and switches the `current` symlink.

export type PublishConfig =
  | { enabled: false; reason: string }
  | { enabled: true; websiteDir: string; targetDir: string; stateDir: string; uploadsDir: string; siteUrl: string; contactApiUrl?: string }

export type PublishRun = {
  id: string
  status: 'running' | 'success' | 'failed'
  startedAt: string
  finishedAt?: string
  actor: string
  releaseId?: string
  error?: string
  summary?: { products: number; categories: number }
}

const RELEASE_ID = /^\d{8}-\d{6}(?:-\d+)?$/
const MAX_LOG_LINES = 400
const MAX_HISTORY = 20

export function publishConfig(env: NodeJS.ProcessEnv = process.env): PublishConfig {
  const targetDir = env.WEBSITE_PUBLISH_DIR?.trim()
  if (!targetDir) return { enabled: false, reason: 'Máy chủ chưa cấu hình WEBSITE_PUBLISH_DIR (thư mục website đang chạy).' }
  const websiteDir = path.resolve(env.WEBSITE_DIR?.trim() || path.resolve(process.cwd(), '..'))
  if (!existsSync(path.join(websiteDir, 'scripts', 'publish-website.mjs'))) {
    return { enabled: false, reason: `Không tìm thấy mã nguồn website tại ${websiteDir} (biến WEBSITE_DIR).` }
  }
  const serverUrl = env.PAYLOAD_PUBLIC_SERVER_URL?.replace(/\/$/u, '')
  return {
    enabled: true,
    websiteDir,
    targetDir: path.resolve(targetDir),
    stateDir: path.resolve(env.WEBSITE_PUBLISH_STATE_DIR?.trim() || path.join(targetDir, '.admin-publish')),
    uploadsDir: mediaUploadDirectory,
    siteUrl: env.WEBSITE_PUBLIC_URL?.trim() || 'https://wokin.vn',
    contactApiUrl: serverUrl ? `${serverUrl}/api/contact-submissions/submit` : undefined,
  }
}

// One publish at a time per admin process (the build is CPU heavy and owns the checkout's src/data).
let active: { run: PublishRun; log: string[] } | null = null

function timestampId(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
}

async function readHistory(stateDir: string): Promise<PublishRun[]> {
  try {
    return JSON.parse(await readFile(path.join(stateDir, 'history.json'), 'utf8')) as PublishRun[]
  } catch {
    return []
  }
}

async function recordHistory(stateDir: string, run: PublishRun): Promise<void> {
  const history = [run, ...(await readHistory(stateDir)).filter((item) => item.id !== run.id)].slice(0, MAX_HISTORY)
  await writeFile(path.join(stateDir, 'history.json'), `${JSON.stringify(history, null, 2)}\n`)
}

export function listLiveReleases(targetDir: string): { releases: string[]; current: string | null } {
  const releasesDir = path.join(targetDir, 'releases')
  const releases = existsSync(releasesDir) ? readdirSync(releasesDir).filter((name) => RELEASE_ID.test(name)).sort().reverse() : []
  const link = path.join(targetDir, 'current')
  const current = existsSync(link) && lstatSync(link).isSymbolicLink() ? path.basename(readlinkSync(link)) : null
  return { releases, current }
}

export async function publishStatus(config: PublishConfig) {
  if (!config.enabled) return { enabled: false as const, reason: config.reason }
  const history = await readHistory(config.stateDir)
  return {
    enabled: true as const,
    running: active ? { ...active.run, log: active.log.slice(-60) } : null,
    history,
    live: listLiveReleases(config.targetDir),
    siteUrl: config.siteUrl,
  }
}

export async function publishLog(config: PublishConfig, runId: string): Promise<string | null> {
  if (!config.enabled || !/^[\w-]+$/.test(runId)) return null
  if (active?.run.id === runId) return active.log.join('\n')
  try {
    return await readFile(path.join(config.stateDir, 'logs', `${runId}.log`), 'utf8')
  } catch {
    return null
  }
}

/** Exports the admin's published catalog and settings to files the website build reads. */
async function exportForWebsite(payload: Payload, config: Extract<PublishConfig, { enabled: true }>, workDir: string) {
  const glossary = JSON.parse(await readFile(path.join(config.websiteDir, 'src', 'data', 'vi-glossary.json'), 'utf8'))
  const repository = new PayloadFullCatalogRepository(payload)
  const snapshot = exportReleaseSnapshot(selectReleaseCandidate({
    categories: await repository.listCategories(),
    media: await repository.listMedia(),
    products: await repository.listProducts(),
    glossary: { categories: glossary.categories, marketing: glossary.marketing, spec_labels: glossary.spec_labels, terms: glossary.terms, ui: glossary.ui },
  }))
  const releaseFile = await writeReleaseArtifact(path.join(workDir, 'catalog'), snapshot)

  const [settings, navigation] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true }),
    payload.findGlobal({ slug: 'navigation', depth: 0, overrideAccess: true }),
  ])
  const publicSettings = globalsToPublicSettings(settings as never, navigation as never)
  const problems = validatePublicSettings(publicSettings)
  if (problems.length) throw new Error(`Thông tin website/Menu chưa hợp lệ:\n- ${problems.join('\n- ')}`)
  const siteSettingsFile = path.join(workDir, 'site-settings.json')
  await writeFile(siteSettingsFile, `${JSON.stringify(publicSettings, null, 2)}\n`)
  const catalog = (snapshot as { catalog: { products: unknown[]; categories: unknown[] } }).catalog
  return { releaseFile, siteSettingsFile, summary: { products: catalog.products.length, categories: catalog.categories.length } }
}

// The website build gets a clean environment: the admin's own variables (DATABASE_URL, PAYLOAD_SECRET, and the
// TURBOPACK/__NEXT_* flags of `next dev`) must not leak into it; the dev flags even broke prerendering.
const INHERITED_ENV = ['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'TZ', 'TMPDIR', 'TMP', 'TEMP', 'npm_config_cache', 'NVM_DIR', 'NVM_BIN']

export function websiteBuildEnv(config: Extract<PublishConfig, { enabled: true }>, source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SITE_URL: config.siteUrl }
  for (const key of INHERITED_ENV) if (source[key] !== undefined) env[key] = source[key]
  if (config.contactApiUrl) env.NEXT_PUBLIC_CONTACT_API_URL = config.contactApiUrl
  return env
}

function runScript(config: Extract<PublishConfig, { enabled: true }>, args: string[], onLine: (line: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join('scripts', 'publish-website.mjs'), ...args], {
      cwd: config.websiteDir,
      env: websiteBuildEnv(config),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const forward = (chunk: Buffer) => { for (const line of chunk.toString().split('\n')) if (line.trim()) onLine(line) }
    child.stdout.on('data', forward)
    child.stderr.on('data', forward)
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Xuất bản thất bại (mã ${code}). Xem nhật ký bên dưới.`))))
  })
}

/** Starts a publish in the background and returns immediately; poll publishStatus() for progress. */
export async function startPublish(payload: Payload, actor: { id: string | number; email?: string | null }, config: PublishConfig): Promise<PublishRun> {
  if (!config.enabled) throw new Error(config.reason)
  if (active) throw new Error('Đang có một lượt xuất bản chạy; hãy đợi nó xong.')
  const startedAt = new Date()
  const run: PublishRun = { id: timestampId(startedAt), status: 'running', startedAt: startedAt.toISOString(), actor: actor.email ?? String(actor.id) }
  const log: string[] = []
  active = { run, log }
  const push = (line: string) => { log.push(line); if (log.length > MAX_LOG_LINES) log.splice(0, log.length - MAX_LOG_LINES) }

  const workDir = path.join(config.stateDir, 'work', run.id)
  const logFile = path.join(config.stateDir, 'logs', `${run.id}.log`)
  void (async () => {
    try {
      await mkdir(path.dirname(logFile), { recursive: true })
      push('Xuất dữ liệu đã xuất bản từ admin')
      const exported = await exportForWebsite(payload, config, workDir)
      run.summary = exported.summary
      push(`→ ${exported.summary.products} sản phẩm, ${exported.summary.categories} danh mục`)
      run.releaseId = run.id
      await runScript(config, [
        '--release', exported.releaseFile,
        '--site-settings', exported.siteSettingsFile,
        '--uploads', config.uploadsDir,
        '--target', config.targetDir,
        '--release-id', run.id,
      ], push)
      run.status = 'success'
    } catch (error) {
      run.status = 'failed'
      run.error = error instanceof Error ? error.message : String(error)
      push(`LỖI: ${run.error}`)
    } finally {
      run.finishedAt = new Date().toISOString()
      await appendFile(logFile, `${log.join('\n')}\n`).catch(() => undefined)
      await recordHistory(config.stateDir, run).catch(() => undefined)
      await payload.create({
        collection: 'audit-events',
        data: {
          actor: actor.id, entityType: 'website', entityId: run.id, eventType: run.status === 'success' ? 'website.publish' : 'website.publish_failed',
          occurredAt: run.finishedAt, before: {}, after: { releaseId: run.releaseId, summary: run.summary, error: run.error }, metadata: {},
        } as never,
        context: { internalAudit: true },
        overrideAccess: true,
      }).catch(() => undefined)
      active = null
    }
  })()
  return run
}

export async function rollbackWebsite(config: PublishConfig, releaseId: string): Promise<void> {
  if (!config.enabled) throw new Error(config.reason)
  if (active) throw new Error('Đang xuất bản; hãy đợi xong rồi mới quay lại bản cũ.')
  if (!RELEASE_ID.test(releaseId) || !listLiveReleases(config.targetDir).releases.includes(releaseId)) throw new Error('Không có bản website này.')
  const lines: string[] = []
  await runScript(config, ['--rollback', releaseId, '--target', config.targetDir], (line) => lines.push(line))
}

/** Test hook: lets unit tests reset the single-run lock. */
export function __resetPublishStateForTests(): void {
  active = null
}
