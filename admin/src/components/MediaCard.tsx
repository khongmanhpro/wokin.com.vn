'use client'

import { useState } from 'react'

import { mediaRightsUpdateRequest, type MediaRightsStatus } from '../lib/mediaCategoryWorkspace'
import { MediaRightsBadge } from './MediaRightsBadge'

export type MediaCardData = { id: string; path: string; storageKey: string; filename?: string; alt?: string; width: number; height: number; contentSha256: string; rightsStatus: MediaRightsStatus }

export function MediaCard({ media, canUpdateRights }: { media: MediaCardData; canUpdateRights: boolean }) {
  const [previewFailed, setPreviewFailed] = useState(false)
  const [rightsStatus, setRightsStatus] = useState(media.rightsStatus)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  async function updateRights(nextStatus: MediaRightsStatus) {
    setSaving(true); setMessage(null)
    try {
      const request = mediaRightsUpdateRequest(media.id, nextStatus)
      const response = await fetch(request.url, request.init)
      if (!response.ok) throw new Error('Không thể cập nhật quyền sử dụng. Vui lòng thử lại.')
      setRightsStatus(nextStatus); setMessage('Đã cập nhật quyền sử dụng.')
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không thể cập nhật quyền sử dụng.') } finally { setSaving(false) }
  }
  return <article className="wokin-media-card">
    <div className="wokin-media-card__thumbnail">
      {previewFailed ? <p>Không thể tải ảnh xem trước.</p> : <img src={media.filename ? `/api/media/file/${encodeURIComponent(media.filename)}` : `/api/media/preview/${encodeURIComponent(media.id)}`} alt={media.alt || 'Ảnh chưa có văn bản thay thế'} onError={() => setPreviewFailed(true)} />}
    </div>
    <div className="wokin-media-card__body">
      <MediaRightsBadge status={rightsStatus} />
      <p><strong>Đường dẫn:</strong> {media.path}</p>
      <p><strong>Kích thước:</strong> {media.width} × {media.height}px</p>
      <p><strong>Alt:</strong> {media.alt?.trim() || 'Thiếu alt'}</p>
      <p><strong>Hash:</strong> <code>{media.contentSha256}</code></p>
      <a href={`/admin/collections/media/${media.id}`}>Mở chi tiết</a>
      {canUpdateRights ? <label className="wokin-media-card__rights-control">Cập nhật quyền sử dụng<select value={rightsStatus} disabled={saving} onChange={(event) => updateRights(event.target.value as MediaRightsStatus)}><option value="pending">Chờ xác nhận</option><option value="cleared">Đã xác nhận</option><option value="restricted">Hạn chế</option><option value="expired">Hết hạn</option></select></label> : <p className="wokin-media-card__limited">Bạn không có quyền thay đổi trạng thái quyền sử dụng.</p>}
      {message && <p className={message.startsWith('Đã') ? 'wokin-state wokin-state--success' : 'wokin-state wokin-state--error'} role="status">{message}</p>}
    </div>
  </article>
}
