import { actorLabel, releaseCenterState, snapshotBlockers, snapshotCounts, type ReleaseCenterRelease, type ReleaseCenterSnapshot } from '../lib/releaseCenter'
import type { Role } from '../access/hasCapability'
import { WokinStatusBadge } from './WokinStatusBadge'

const stages = ['Thay đổi bản nháp', 'Validate snapshot', 'Rà soát blocker', 'Phê duyệt', 'Build artifact', 'Smoke checks', 'Phê duyệt xuất bản']

function date(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'Chưa có thời gian'
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleString('vi-VN')
}

export function ReleaseReadiness({ snapshot, release, role = 'readonly', previousRelease }: {
  snapshot?: ReleaseCenterSnapshot
  release?: ReleaseCenterRelease
  role?: Role
  previousRelease?: ReleaseCenterRelease
}) {
  const blockers = snapshotBlockers(snapshot)
  const counts = snapshotCounts(snapshot?.counts)
  const state = releaseCenterState(role, snapshot, previousRelease)
  const ready = blockers.length === 0
  return <section className="wokin-release-readiness" aria-labelledby="release-readiness-title">
    <header><p className="wokin-nav__label">Trạng thái phát hành</p><h2 id="release-readiness-title">{ready ? 'Sẵn sàng để xét duyệt' : 'Chưa sẵn sàng'}</h2></header>
    <ol className="wokin-release-pipeline" aria-label="Quy trình phát hành">{stages.map((stage, index) => <li key={stage} className={index < 3 && ready ? 'is-complete' : undefined}>{stage}</li>)}</ol>
    <dl className="wokin-release-readiness__facts">
      <div><dt>Snapshot ID</dt><dd>{snapshot?.snapshotId ?? 'Chưa có'}</dd></div>
      <div><dt>Checksum</dt><dd><code>{snapshot?.checksum ?? 'Chưa có'}</code></dd></div>
      <div><dt>Sản phẩm</dt><dd>{counts.products ?? 'Chưa có dữ liệu'}</dd></div>
      <div><dt>Danh mục</dt><dd>{counts.categories ?? 'Chưa có dữ liệu'}</dd></div>
      <div><dt>Hình ảnh</dt><dd>{counts.media ?? 'Chưa có dữ liệu'}</dd></div>
      <div><dt>Người thực hiện</dt><dd>{actorLabel(release?.createdBy ?? snapshot?.createdBy)}</dd></div>
      <div><dt>Thời gian tạo</dt><dd>{date(release?.createdAt ?? snapshot?.createdAt)}</dd></div>
      <div><dt>Trạng thái phát hành</dt><dd>{release?.status ? <WokinStatusBadge status={release.status} /> : 'Chưa tạo phiên phát hành'}</dd></div>
    </dl>
    {blockers.length > 0 ? <section className="wokin-release-readiness__blockers" aria-labelledby="release-blockers-title"><h3 id="release-blockers-title">Blocker xác thực</h3><ul>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></section> : <p className="wokin-state wokin-state--success">Không có blocker xác thực trong dữ liệu đã lưu.</p>}
    <p className="wokin-release-readiness__managed" role="status">BLOCKED: Tạo build artifact, smoke check và xuất bản được quản lý bởi pipeline release ngoài admin. Giao diện này không ghi vào thư mục public hoặc kích hoạt publish runtime.</p>
    {previousRelease ? <p>Release trước: <a href={`/admin/collections/releases/${previousRelease.id}`}>{previousRelease.name ?? previousRelease.id}</a>{state.canRollback ? ' · Có thể mở bản ghi để thực hiện rollback theo quyền máy chủ.' : ' · Rollback bị giới hạn theo quyền máy chủ.'}</p> : <p>Chưa có release trước để rollback.</p>}
  </section>
}
