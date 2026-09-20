import { reviewStatusLabel } from '../lib/reviewQueue'
import { WokinStatusBadge } from './WokinStatusBadge'

export function ReviewStatusBadge({ state }: { state: unknown }) {
  const value = state === 'resolved' ? 'resolved' : 'open'
  return <WokinStatusBadge label={reviewStatusLabel(state)} status={value} />
}
