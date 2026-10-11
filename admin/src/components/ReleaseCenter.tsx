import type { Payload } from 'payload'
import { hasCapability, type Role } from '../access/hasCapability'
import { WebsitePublishPanel } from './WebsitePublishPanel'

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

export async function ReleaseCenter({ payload: payloadProp, user: userProp, initPageResult }: ReleaseCenterProps) {
  const user = userProp ?? initPageResult?.req?.user ?? undefined
  const payload = payloadProp ?? initPageResult?.req?.payload
  if (!user?.active || !user.role) return <main className="wokin-release-center"><p className="wokin-state wokin-state--error" role="alert">Không thể tải trang xuất bản: phiên đăng nhập không hợp lệ.</p></main>
  if (!payload) return <main className="wokin-release-center"><p className="wokin-state wokin-state--error" role="alert">Không thể tải trang xuất bản. Hãy làm mới trang hoặc liên hệ quản trị hệ thống.</p></main>
  // One button publishes the admin's live data to the website (owner decision 2026-10-11); the old snapshot/approval
  // pipeline records (catalog-snapshots, releases) stay available in their collections.
  return <main className="wokin-release-center" aria-labelledby="release-center-title">
    <header><p className="wokin-nav__label">Phát hành</p><h1 id="release-center-title">Xuất bản website</h1><p>Sửa trong admin rồi bấm Xuất bản để website cập nhật.</p></header>
    <WebsitePublishPanel canPublish={hasCapability(user, 'release.create')} canRollback={hasCapability(user, 'release.rollback')} />
  </main>
}
