import type { Payload } from 'payload'
import { type DashboardMetricCollection, type DashboardUser, visibleDashboardMetrics } from '../lib/dashboardMetrics'
import { WokinErrorState } from './WokinErrorState'

type Count = { totalDocs: number }

async function count(payload: Payload, user: DashboardUser, collection: DashboardMetricCollection, where?: Record<string, { equals: string }>): Promise<Count> {
  return payload.count({ collection, overrideAccess: false, user, where: where as never })
}

export async function WokinDashboardIntro({ payload, user }: { payload: Payload; user?: DashboardUser }) {
  if (!user?.active) return <WokinErrorState title="Không thể tải tổng quan" description="Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại để tiếp tục." />
  try {
    const metrics = visibleDashboardMetrics(user)
    const counts = await Promise.all(metrics.map((metric) => count(payload, user, metric.collection, metric.where)))
    return <section className="wokin-dashboard" aria-labelledby="wokin-admin-heading"><p className="wokin-dashboard__eyebrow">WOKIN · {user.role}</p><h1 id="wokin-admin-heading">Tổng quan vận hành</h1><p>Dữ liệu mới nhất từ hệ thống quản trị.</p><div className="wokin-dashboard__metrics" aria-label="Chỉ số vận hành">{metrics.map((metric, index) => <a className="wokin-metric" href={metric.href} key={metric.key}><strong>{counts[index].totalDocs}</strong><span>{metric.label}</span></a>)}</div><p className="wokin-dashboard__actions"><a href="/admin/collections/products/create">Tạo sản phẩm</a> · <a href="/admin/collections/review-requests">Xem hàng chờ duyệt</a></p></section>
  } catch {
    return <WokinErrorState title="Không thể tải số liệu" description="Hãy làm mới trang hoặc liên hệ quản trị hệ thống." />
  }
}
