import { hasCapability, type Role } from '../access/hasCapability'

export type ReleaseCenterSnapshot = {
  id?: string
  snapshotId?: string
  checksum?: string
  status?: string
  counts?: unknown
  importReport?: unknown
  createdAt?: string
  createdBy?: unknown
}

export type ReleaseCenterRelease = {
  id?: string
  name?: string
  status?: string
  catalogSnapshot?: string | { id?: string }
  createdAt?: string
  releasedAt?: string
  createdBy?: unknown
}

type SnapshotCounts = { products: number | null; categories: number | null; media: number | null }

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function snapshotCounts(value: unknown): SnapshotCounts {
  const counts = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  return { products: count(counts.products), categories: count(counts.categories), media: count(counts.media) }
}

function messages(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (Array.isArray(value)) return value.flatMap(messages)
  if (!value || typeof value !== 'object') return []
  const report = value as Record<string, unknown>
  return ['errors', 'blockers', 'validationErrors'].flatMap((key) => messages(report[key]))
}

export function snapshotBlockers(snapshot?: ReleaseCenterSnapshot): string[] {
  if (!snapshot) return ['Chưa có snapshot được lưu để kiểm tra.']
  const blockers = messages(snapshot.importReport)
  if (snapshot.status !== 'validated') blockers.unshift('Snapshot chưa được xác thực.')
  return [...new Set(blockers)]
}

export function releaseCenterState(role: Role, snapshot?: ReleaseCenterSnapshot, previousRelease?: ReleaseCenterRelease) {
  const user = { active: true, role }
  const ready = snapshotBlockers(snapshot).length === 0
  return {
    canCreateSnapshot: hasCapability(user, 'release.create'),
    canApprove: ready && hasCapability(user, 'release.approve'),
    canRollback: Boolean(previousRelease) && hasCapability(user, 'release.rollback'),
    // Static artifacts are created by the controlled release pipeline, never from admin runtime.
    canPublish: false,
    buildArtifactState: 'blocked_import_managed' as const,
  }
}

export function actorLabel(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value
  if (value && typeof value === 'object') {
    const actor = value as Record<string, unknown>
    for (const key of ['email', 'name', 'id']) if (typeof actor[key] === 'string' && actor[key].trim()) return actor[key]
  }
  return 'Chưa có dữ liệu người thực hiện trong bản ghi phát hành.'
}
