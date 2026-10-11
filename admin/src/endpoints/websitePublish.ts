import { addDataAndFileToRequest, type Endpoint, type PayloadRequest } from 'payload'

import { hasCapability, isActiveAdmin } from '../access/hasCapability'
import { publishConfig, publishLog, publishStatus, rollbackWebsite, startPublish } from '../lib/websitePublish'

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

function canView(req: PayloadRequest): boolean {
  return hasCapability(req.user, 'release.create') || hasCapability(req.user, 'release.rollback')
}

export const websitePublishEndpoints: Endpoint[] = [
  {
    path: '/website-publish',
    method: 'get',
    handler: async (req) => {
      if (!canView(req)) return json({ error: 'Bạn không có quyền xem xuất bản website.' }, 403)
      return json(await publishStatus(publishConfig()))
    },
  },
  {
    path: '/website-publish',
    method: 'post',
    handler: async (req) => {
      if (!hasCapability(req.user, 'release.create') || !isActiveAdmin(req.user)) return json({ error: 'Bạn không có quyền xuất bản website.' }, 403)
      try {
        const user = req.user as unknown as { id: string | number; email?: string | null }
        const run = await startPublish(req.payload, { id: user.id, email: user.email }, publishConfig())
        return json({ run }, 202)
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : 'Không bắt đầu được.' }, 409)
      }
    },
  },
  {
    path: '/website-publish/log/:runId',
    method: 'get',
    handler: async (req) => {
      if (!canView(req)) return json({ error: 'Bạn không có quyền xem nhật ký xuất bản.' }, 403)
      const log = await publishLog(publishConfig(), String(req.routeParams?.runId ?? ''))
      return log === null ? json({ error: 'Không có nhật ký này.' }, 404) : json({ log })
    },
  },
  {
    path: '/website-publish/rollback',
    method: 'post',
    handler: async (req) => {
      if (!hasCapability(req.user, 'release.rollback')) return json({ error: 'Bạn không có quyền quay lại bản cũ.' }, 403)
      if (req.data === undefined) await addDataAndFileToRequest(req).catch(() => undefined)
      const releaseId = typeof req.data?.releaseId === 'string' ? req.data.releaseId : ''
      try {
        await rollbackWebsite(publishConfig(), releaseId)
        return json({ ok: true, current: releaseId })
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : 'Không quay lại được.' }, 409)
      }
    },
  },
]
