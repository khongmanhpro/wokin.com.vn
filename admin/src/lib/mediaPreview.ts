import { readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Endpoint } from 'payload'

import { isActiveAdmin } from '../access/hasCapability'

const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../public')

export const mediaPreviewEndpoint: Endpoint = {
  path: '/preview/:id',
  method: 'get',
  handler: async (req) => {
    if (!isActiveAdmin(req.user)) return new Response('Không có quyền xem ảnh.', { status: 403 })
    try {
      const doc = await req.payload.findByID({ collection: 'media', id: String(req.routeParams?.id || ''), overrideAccess: false, req })
      const relativePath = doc.path.replace(/^\//, '')
      if (!relativePath.startsWith('images/') || relativePath.includes('..') || relativePath.includes('\\')) return new Response(null, { status: 404 })
      const filePath = await realpath(path.resolve(publicRoot, relativePath))
      const root = await realpath(publicRoot)
      if (!filePath.startsWith(`${root}${path.sep}`)) return new Response(null, { status: 404 })
      const mime = ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' } as Record<string, string>)[path.extname(filePath).toLowerCase()]
      if (!mime) return new Response(null, { status: 404 })
      return new Response(new Uint8Array(await readFile(filePath)), { headers: { 'Content-Type': mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
    } catch { return new Response('Không thể tải ảnh.', { status: 404 }) }
  },
}
