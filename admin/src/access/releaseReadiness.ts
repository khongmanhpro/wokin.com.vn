import type { CollectionBeforeChangeHook } from 'payload'

import { hasCapability } from './hasCapability'
import { snapshotBlockers, type ReleaseCenterSnapshot } from '../lib/releaseCenter'

function relationId(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && ('id' in value)) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return String(id)
  }
  return undefined
}

export const enforceReleaseReadiness: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const status = data.status ?? originalDoc?.status ?? 'draft'
  if (status === 'draft') return data
  if (!hasCapability(req.user, 'release.approve')) throw new Error('Chỉ người có quyền phê duyệt release mới có thể thay đổi trạng thái này.')

  const catalogSnapshot = relationId(data.catalogSnapshot ?? originalDoc?.catalogSnapshot)
  if (!catalogSnapshot) throw new Error('Release cần một snapshot đã được xác thực.')
  const result = await req.payload.find({
    collection: 'catalog-snapshots',
    where: { id: { equals: catalogSnapshot } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: req.user,
  }) as { docs?: ReleaseCenterSnapshot[] }
  const blockers = snapshotBlockers(result.docs?.[0])
  if (blockers.length) throw new Error(`Release bị chặn: ${blockers.join(' ')}`)
  return data
}
