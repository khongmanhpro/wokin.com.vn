import type { Payload } from 'payload'
import { hasCapability, type Role } from '../access/hasCapability'
import { ReleaseReadiness } from './ReleaseReadiness'
import { type ReleaseCenterRelease, type ReleaseCenterSnapshot } from '../lib/releaseCenter'

type User = { active?: boolean; role?: Role }

type ReleaseCenterProps = {
  payload?: Payload
  user?: User
  initPageResult?: {
    req?: {
      payload?: Payload
      user?: User
    }
  }
}

async function latestReleases(payload: Payload, user: User): Promise<ReleaseCenterRelease[]> {
  const result = await payload.find({ collection: 'releases', limit: 10, depth: 0, sort: '-createdAt', overrideAccess: false, user })
  return result.docs.map(({ id, name, status, catalogSnapshot, createdAt }) => ({ id, name, status, catalogSnapshot, createdAt }))
}

async function latestSnapshots(payload: Payload, user: User): Promise<ReleaseCenterSnapshot[]> {
  const result = await payload.find({ collection: 'catalog-snapshots', limit: 10, depth: 0, sort: '-createdAt', overrideAccess: false, user })
  return result.docs
}

function snapshotId(release: ReleaseCenterRelease): string | undefined {
  return typeof release.catalogSnapshot === 'string' ? release.catalogSnapshot : release.catalogSnapshot?.id
}

export async function ReleaseCenter({ payload: payloadProp, user: userProp, initPageResult }: ReleaseCenterProps) {
  const user = userProp ?? initPageResult?.req?.user ?? undefined
  const payload = payloadProp ?? initPageResult?.req?.payload
  if (!user?.active || !user.role) return <main className="wokin-release-center"><p className="wokin-state wokin-state--error" role="alert">Không thể tải Release center: phiên đăng nhập không hợp lệ.</p></main>
  if (!payload) return <main className="wokin-release-center"><p className="wokin-state wokin-state--error" role="alert">Không thể tải dữ liệu release. Hãy làm mới trang hoặc liên hệ quản trị hệ thống.</p></main>
  try {
    const [releases, snapshots] = await Promise.all([
      latestReleases(payload, user),
      latestSnapshots(payload, user),
    ])
    const release = releases[0]
    const snapshot = snapshots.find((item) => item.id === snapshotId(release ?? {})) ?? snapshots[0]
    const previousRelease = releases.find((item, index) => index > 0 && item.status === 'released')
    const canCreate = hasCapability(user, 'release.create')
    return <main className="wokin-release-center" aria-labelledby="release-center-title">
      <header><p className="wokin-nav__label">Phát hành</p><h1 id="release-center-title">Trung tâm phát hành</h1><p>Theo dõi dữ liệu phát hành đã lưu; mọi quyết định và pipeline vẫn được kiểm tra ở máy chủ.</p></header>
      {canCreate ? <p><a className="wokin-release-center__action" href="/admin/collections/catalog-snapshots/create">Tạo snapshot qua quy trình được cấp quyền</a></p> : <p className="wokin-state">Bạn chỉ có quyền xem trạng thái phát hành.</p>}
      {!snapshot && <p className="wokin-state">Chưa có snapshot nào. Hãy tạo hoặc import snapshot qua pipeline được cấp quyền.</p>}
      <ReleaseReadiness snapshot={snapshot} release={release} previousRelease={previousRelease} role={user.role} />
      {release && hasCapability(user, 'release.approve') ? <p><a className="wokin-release-center__action" href={`/admin/collections/releases/${release.id}`}>Mở bản ghi release để xét duyệt theo quyền máy chủ</a></p> : null}
    </main>
  } catch {
    return <main className="wokin-release-center"><p className="wokin-state wokin-state--error" role="alert">Không thể tải dữ liệu release. Hãy làm mới trang hoặc liên hệ quản trị hệ thống.</p></main>
  }
}
