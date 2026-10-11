import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../payload.config.js'
import { valueAfter } from './cli-args.js'
import { globalsToPublicSettings, publicSettingsToGlobals, validatePublicSettings, type PublicSiteSettings } from './site-settings-sync.js'

// Usage:
//   npm run site-settings:export            admin globals -> ../src/data/site-settings.json
//   npm run site-settings:import [--force]  ../src/data/site-settings.json -> admin globals (first-time seeding)
async function main() {
  const [command, ...args] = process.argv.slice(2)
  const file = valueAfter(args, '--file', path.resolve('..', 'src', 'data', 'site-settings.json'))!
  const payload = await getPayload({ config })

  if (command === 'export') {
    const [settings, navigation] = await Promise.all([
      payload.findGlobal({ slug: 'site-settings', depth: 0 }),
      payload.findGlobal({ slug: 'navigation', depth: 0 }),
    ])
    const output = globalsToPublicSettings(settings as never, navigation as never)
    const problems = validatePublicSettings(output)
    if (problems.length) throw new Error(`Chưa xuất được, cần sửa trong admin:\n- ${problems.join('\n- ')}`)
    await writeFile(file, `${JSON.stringify(output, null, 2)}\n`)
    console.log(`Đã ghi ${file}. Chạy gate và build website public để áp dụng.`)
  } else if (command === 'import') {
    const input = JSON.parse(await readFile(file, 'utf8')) as PublicSiteSettings
    const problems = validatePublicSettings(input)
    if (problems.length) throw new Error(`Tệp nguồn chưa hợp lệ:\n- ${problems.join('\n- ')}`)
    const current = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    if (current.hotline && !args.includes('--force')) throw new Error('Admin đã có dữ liệu "Thông tin website"; thêm --force nếu muốn ghi đè.')
    const { siteSettings, navigation } = publicSettingsToGlobals(input)
    await payload.updateGlobal({ slug: 'site-settings', data: siteSettings as never })
    await payload.updateGlobal({ slug: 'navigation', data: navigation as never })
    console.log('Đã nạp Thông tin website và Menu vào admin.')
  } else {
    throw new Error('Lệnh hợp lệ: export | import [--force]')
  }
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
