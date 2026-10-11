'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@payloadcms/ui'

import { mediaLibraryQueryString, mediaLibraryState, type MediaLibraryFilters, type MediaRightsStatus } from '../lib/mediaCategoryWorkspace'
import { hasCapability, isActiveAdmin } from '../access/hasCapability'
import { MediaCard, type MediaCardData } from './MediaCard'
import { WokinEmptyState } from './WokinEmptyState'
import { WokinErrorState } from './WokinErrorState'

type ViewUser = { active?: boolean; role?: 'owner' | 'admin' | 'editor' | 'seo_reviewer' | 'media_manager' | 'publisher' | 'readonly' }
type MediaResponse = { docs: MediaCardData[]; totalDocs: number; totalPages: number }

export function MediaLibrary({ initPageResult }: { initPageResult?: { req?: { user?: ViewUser } } }) {
  const { user } = useAuth()
  const candidate = user ?? initPageResult?.req?.user
  const actor = isActiveAdmin(candidate) ? candidate : undefined
  const [filters, setFilters] = useState<MediaLibraryFilters>({})
  const [media, setMedia] = useState<MediaCardData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('-createdAt')
  const [totalDocs, setTotalDocs] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const state = mediaLibraryState(actor)
  const queryString = useMemo(() => mediaLibraryQueryString(filters, page, sort), [filters, page, sort])
  function updateFilters(next: MediaLibraryFilters) { setFilters(next); setPage(1) }

  useEffect(() => {
    let active = true
    setLoading(true); setError(null)
    fetch(`/api/media?${queryString}`, { credentials: 'same-origin' })
      .then(async (response) => { if (!response.ok) throw new Error('Không thể tải thư viện ảnh.'); return response.json() as Promise<MediaResponse> })
      .then((result) => {
        if (!active) return
        const pages = Math.max(1, result.totalPages)
        if (page > pages) { setPage(pages); return }
        setMedia(result.docs); setTotalDocs(result.totalDocs); setTotalPages(pages)
      })
      .catch((reason: Error) => { if (active) setError(reason.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [queryString])

  return <main className="wokin-workspace" aria-labelledby="media-library-title">
    <header><p className="wokin-nav__label">Danh mục / Hình ảnh</p><h1 id="media-library-title">Thư viện hình ảnh</h1><p>Quản lý ảnh, mô tả ảnh và quyền sử dụng trước khi gắn vào sản phẩm.</p>{hasCapability(actor, 'media.upload') && <a className="wokin-button" href="/admin/collections/media/create">Tải ảnh mới</a>}</header>
    <form className="wokin-workspace__filters" onSubmit={(event) => event.preventDefault()}>
      <label>Tìm đường dẫn hoặc mã ảnh<input value={filters.query ?? ''} onChange={(event) => updateFilters({ ...filters, query: event.target.value })} /></label>
      <label>Quyền sử dụng<select value={filters.rights ?? ''} onChange={(event) => updateFilters({ ...filters, rights: (event.target.value || undefined) as MediaRightsStatus | undefined })}><option value="">Tất cả</option><option value="pending">Chờ xác nhận</option><option value="cleared">Đã xác nhận</option><option value="restricted">Hạn chế</option><option value="expired">Hết hạn</option></select></label>
      <label><input type="checkbox" checked={Boolean(filters.missingAlt)} onChange={(event) => updateFilters({ ...filters, missingAlt: event.target.checked })} /> Thiếu mô tả ảnh</label>
      <label>Sắp xếp<select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }}><option value="-createdAt">Mới nhất</option><option value="createdAt">Cũ nhất</option></select></label>
    </form>
    {loading && <p className="wokin-state" role="status">Đang tải thư viện hình ảnh…</p>}
    {error && <WokinErrorState title="Không thể tải thư viện hình ảnh" description={error} />}
    {!loading && !error && !media.length && <WokinEmptyState title="Không có ảnh phù hợp" description="Thử đổi bộ lọc hoặc từ khóa tìm kiếm." />}
    {!loading && !error && <><section className="wokin-media-grid" aria-live="polite">{media.map((item) => <MediaCard key={item.id} media={item} canUpdateRights={state.canUpdateRights} />)}</section>
      <nav className="wokin-pagination" aria-label="Phân trang hình ảnh"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</button><span role="status">Trang {page} / {totalPages} · {totalDocs} ảnh</span><button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Trang sau</button></nav></>}
  </main>
}
