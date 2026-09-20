'use client'

import { useState } from 'react'

import type { ReviewAction, ReviewQueueRequest } from '../lib/reviewQueue'
import { WokinConfirmAction } from './WokinConfirmAction'

type Props = {
  actions: ReviewAction[]
  request: ReviewQueueRequest
}

async function message(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { errors?: Array<{ message?: string }>; message?: string } | null
  return body?.errors?.[0]?.message || body?.message || `Máy chủ từ chối thao tác (${response.status}).`
}

export function ReviewActionBar({ actions, request }: Props) {
  const [busy, setBusy] = useState<ReviewAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [resolution, setResolution] = useState('')
  const [showResolve, setShowResolve] = useState(false)

  async function patch(path: string, body: Record<string, unknown>): Promise<void> {
    const response = await fetch(path, {
      body: JSON.stringify(body),
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })
    if (!response.ok) throw new Error(await message(response))
  }

  async function requestChanges() {
    if (!request.product?.id) return
    setBusy('request_changes')
    setError(null)
    try {
      await patch(`/api/products/${encodeURIComponent(request.product.id)}`, { status: 'changes_requested' })
      setSuccess('Đã yêu cầu chỉnh sửa sản phẩm. Yêu cầu rà soát vẫn mở để theo dõi bằng chứng.')
      window.setTimeout(() => window.location.reload(), 650)
    } catch (caught) {
      setError(caught instanceof Error ? `Không thể yêu cầu sửa: ${caught.message}` : 'Không thể yêu cầu sửa do lỗi không xác định.')
    } finally {
      setBusy(null)
    }
  }

  async function approveAndResolve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!request.product?.id || !resolution.trim()) return
    setBusy('approve_resolve')
    setError(null)
    try {
      await patch(`/api/products/${encodeURIComponent(request.product.id)}`, { status: 'approved' })
      try {
        await patch(`/api/review-requests/${encodeURIComponent(request.id)}`, { resolution: resolution.trim(), state: 'resolved' })
      } catch (caught) {
        throw new Error(`Sản phẩm đã được duyệt nhưng chưa thể hoàn tất yêu cầu: ${caught instanceof Error ? caught.message : 'lỗi không xác định.'}`)
      }
      setSuccess('Đã duyệt sản phẩm và hoàn tất yêu cầu rà soát.')
      window.setTimeout(() => window.location.reload(), 650)
    } catch (caught) {
      setError(caught instanceof Error ? `Không thể duyệt/hoàn tất: ${caught.message}` : 'Không thể duyệt/hoàn tất do lỗi không xác định.')
    } finally {
      setBusy(null)
    }
  }

  return <div className="wokin-review-actions" aria-label="Thao tác yêu cầu rà soát">
    {actions.includes('open_product') && request.product?.id && <a href={`/admin/collections/products/${encodeURIComponent(request.product.id)}`}>Mở sản phẩm</a>}
    {actions.includes('request_changes') && <WokinConfirmAction confirmLabel="Xác nhận yêu cầu sửa" disabled={busy !== null} label="Yêu cầu sửa" message="Sản phẩm sẽ chuyển sang trạng thái cần chỉnh sửa. Yêu cầu rà soát vẫn được mở để theo dõi." onConfirm={requestChanges} title="Xác nhận yêu cầu sửa" />}
    {actions.includes('approve_resolve') && <button type="button" aria-controls={`resolve-${request.id}`} aria-expanded={showResolve} disabled={busy !== null} onClick={() => setShowResolve((visible) => !visible)}>Duyệt và hoàn tất</button>}
    {actions.includes('view_history') && request.product?.id && <a href={`/admin/collections/audit-events?where[and][0][entityType][equals]=products&where[and][1][entityId][equals]=${encodeURIComponent(request.product.id)}`}>Xem lịch sử</a>}
    {showResolve && <form id={`resolve-${request.id}`} className="wokin-review-actions__resolution" onSubmit={(event) => void approveAndResolve(event)}>
      <label htmlFor={`resolution-${request.id}`}>Kết luận duyệt</label>
      <textarea id={`resolution-${request.id}`} required value={resolution} onChange={(event) => setResolution(event.target.value)} />
      <button type="submit" disabled={busy !== null}>{busy === 'approve_resolve' ? 'Đang lưu…' : 'Xác nhận duyệt và hoàn tất'}</button>
    </form>}
    {success && <p className="wokin-state wokin-state--success" role="status">{success}</p>}
    {error && <p className="wokin-state wokin-state--error" role="alert">{error}</p>}
  </div>
}
