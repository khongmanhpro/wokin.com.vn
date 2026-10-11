import type { Payload } from 'payload'

import { hasCapability, type Capability } from '../access/hasCapability'
import { type DashboardMetricCollection, type DashboardUser, visibleDashboardMetrics } from '../lib/dashboardMetrics'
import { WokinErrorState } from './WokinErrorState'

type Count = { totalDocs: number }
type DashboardIdentity = NonNullable<DashboardUser> & { id?: string; email?: string }

const ROLE_LABELS: Record<string, string> = { owner: 'Chủ sở hữu', admin: 'Quản trị viên', editor: 'Biên tập viên', seo_reviewer: 'Kiểm duyệt SEO', media_manager: 'Quản lý hình ảnh', publisher: 'Xuất bản', readonly: 'Chỉ xem' }

const ENTITY_LABELS: Record<string, string> = {
  products: 'sản phẩm', categories: 'danh mục', media: 'tệp', pages: 'trang', redirects: 'chuyển hướng',
  'review-requests': 'yêu cầu duyệt', releases: 'phiên phát hành', admins: 'tài khoản', 'contact-submissions': 'yêu cầu liên hệ',
}
const OPERATION_LABELS: Record<string, string> = { create: 'tạo', update: 'cập nhật', delete: 'xoá' }

// WordPress-style "quick actions": only shown when the role can actually complete them.
const QUICK_ACTIONS: Array<{ label: string; description: string; href: string; capability?: Capability }> = [
  { label: 'Viết trang mới', description: 'Giới thiệu, chính sách, tin tức', href: '/admin/collections/pages/create', capability: 'page.update' },
  { label: 'Tải ảnh lên', description: 'Thêm vào thư viện, xếp vào thư mục', href: '/admin/collections/media/create', capability: 'media.upload' },
  { label: 'Hàng chờ duyệt', description: 'Sản phẩm đang chờ bạn xử lý', href: '/admin/collections/review-requests/queue', capability: 'product.review' },
  { label: 'Yêu cầu liên hệ', description: 'Khách để lại thông tin từ website', href: '/admin/collections/contact-submissions?where[status][equals]=new', capability: 'settings.manage' },
  { label: 'Thông tin website', description: 'Hotline, địa chỉ, mạng xã hội', href: '/admin/globals/site-settings', capability: 'settings.manage' },
  { label: 'Menu', description: 'Menu đầu trang và chân trang', href: '/admin/globals/navigation', capability: 'settings.manage' },
]

const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' })

async function count(payload: Payload, user: DashboardUser, collection: DashboardMetricCollection, where?: Record<string, { equals: string }>): Promise<Count> {
  return payload.count({ collection, overrideAccess: false, user, where: where as never })
}

function actorLabel(actor: unknown): string {
  return actor && typeof actor === 'object' && 'email' in actor ? String((actor as { email: unknown }).email) : 'Hệ thống'
}

function activityLabel(eventType: string, entityType: string): string {
  const operation = eventType.split('.').pop() ?? ''
  return `${OPERATION_LABELS[operation] ?? operation} ${ENTITY_LABELS[entityType] ?? entityType}`
}

export async function WokinDashboardIntro({ payload, user }: { payload: Payload; user?: DashboardIdentity }) {
  if (!user?.active) return <WokinErrorState title="Không thể tải tổng quan" description="Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại để tiếp tục." />
  try {
    const asUser = { overrideAccess: false, user } as const
    const metrics = visibleDashboardMetrics(user)
    const canReadContacts = hasCapability(user, 'settings.manage')
    const canReadAudit = hasCapability(user, 'audit.read')
    const [counts, contacts, activity] = await Promise.all([
      Promise.all(metrics.map((metric) => count(payload, user, metric.collection, metric.where))),
      canReadContacts
        ? payload.find({ collection: 'contact-submissions', where: { status: { in: ['new', 'in_progress'] } }, sort: '-submittedAt', limit: 5, depth: 0, ...asUser })
        : Promise.resolve(null),
      canReadAudit
        ? payload.find({ collection: 'audit-events', sort: '-occurredAt', limit: 8, depth: 1, ...asUser })
        : Promise.resolve(null),
    ])
    const actions = QUICK_ACTIONS.filter((action) => !action.capability || hasCapability(user, action.capability))

    return <section className="wokin-dashboard" aria-labelledby="wokin-admin-heading">
      <header className="wokin-dashboard__header">
        <p className="wokin-dashboard__eyebrow">WOKIN Admin · {ROLE_LABELS[user.role ?? ''] ?? user.role}</p>
        <h1 id="wokin-admin-heading">Xin chào{user.email ? `, ${user.email}` : ''}</h1>
        <p>Tổng quan nội dung và các việc cần làm hôm nay.</p>
      </header>

      <div className="wokin-dashboard__metrics" aria-label="Chỉ số vận hành">
        {metrics.map((metric, index) => <a className="wokin-metric" href={metric.href} key={metric.key}><strong>{counts[index].totalDocs.toLocaleString('vi-VN')}</strong><span>{metric.label}</span></a>)}
      </div>

      {actions.length > 0 && <section className="wokin-dashboard__panel" aria-labelledby="wokin-quick-actions">
        <h2 id="wokin-quick-actions">Thao tác nhanh</h2>
        <ul className="wokin-quick-actions">
          {actions.map((action) => <li key={action.href}><a href={action.href}><strong>{action.label}</strong><span>{action.description}</span></a></li>)}
        </ul>
      </section>}

      <div className="wokin-dashboard__columns">
        {contacts && <section className="wokin-dashboard__panel" aria-labelledby="wokin-recent-contacts">
          <h2 id="wokin-recent-contacts">Liên hệ cần xử lý <span className="wokin-dashboard__count">{contacts.totalDocs}</span></h2>
          {contacts.docs.length === 0 ? <p className="wokin-dashboard__empty">Chưa có yêu cầu nào cần xử lý.</p> : <ul className="wokin-dashboard__list">
            {contacts.docs.map((contact) => <li key={contact.id}>
              <a href={`/admin/collections/contact-submissions/${contact.id}`}>{contact.fullName}</a>
              <span>{contact.phone} · {dateTime.format(new Date(contact.submittedAt))}</span>
            </li>)}
          </ul>}
          <a className="wokin-dashboard__more" href="/admin/collections/contact-submissions">Xem tất cả liên hệ</a>
        </section>}

        {activity && <section className="wokin-dashboard__panel" aria-labelledby="wokin-recent-activity">
          <h2 id="wokin-recent-activity">Hoạt động gần đây</h2>
          {activity.docs.length === 0 ? <p className="wokin-dashboard__empty">Chưa có hoạt động nào.</p> : <ul className="wokin-dashboard__list">
            {activity.docs.map((event) => <li key={event.id}>
              <span><strong>{actorLabel(event.actor)}</strong> {activityLabel(event.eventType, event.entityType)}</span>
              <span>{dateTime.format(new Date(event.occurredAt))}</span>
            </li>)}
          </ul>}
          <a className="wokin-dashboard__more" href="/admin/collections/audit-events">Xem nhật ký</a>
        </section>}
      </div>
    </section>
  } catch {
    return <WokinErrorState title="Không thể tải số liệu" description="Hãy làm mới trang hoặc liên hệ quản trị hệ thống." />
  }
}
