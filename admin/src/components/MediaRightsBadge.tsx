import type { MediaRightsStatus } from '../lib/mediaCategoryWorkspace'
import { WokinStatusBadge } from './WokinStatusBadge'

const labels: Record<MediaRightsStatus, string> = { pending: 'Chờ xác nhận quyền', cleared: 'Đã xác nhận quyền', restricted: 'Hạn chế sử dụng', expired: 'Quyền đã hết hạn' }

export function MediaRightsBadge({ status }: { status: MediaRightsStatus }) {
  return <WokinStatusBadge label={labels[status]} status={status} />
}
