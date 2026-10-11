import type { DefaultServerCellComponentProps } from 'payload'

type MediaLike = { id?: string; filename?: string | null; alt?: string | null }

// Imported catalog media are metadata-only (no Payload file), so they go through the guarded preview endpoint.
function thumbnailSrc(media: MediaLike): string | null {
  if (media.filename) return `/api/media/file/${encodeURIComponent(media.filename)}`
  return media.id ? `/api/media/preview/${encodeURIComponent(media.id)}` : null
}

function Thumbnail({ media }: { media: MediaLike | null }) {
  const src = media ? thumbnailSrc(media) : null
  if (!src) return <span className="wokin-thumb wokin-thumb--empty" aria-label="Chưa có ảnh">—</span>
  return <img className="wokin-thumb" src={src} alt={media?.alt ?? ''} loading="lazy" width={44} height={44} />
}

/** Media list: the row itself is the media document. */
export function MediaThumbnailCell({ rowData }: DefaultServerCellComponentProps) {
  return <Thumbnail media={rowData as MediaLike} />
}

/** Product list: first related image (populated at the list view's depth=1, otherwise only an id). */
export function ProductThumbnailCell({ rowData }: DefaultServerCellComponentProps) {
  const first = Array.isArray(rowData?.media) ? rowData.media[0] : undefined
  const media = typeof first === 'string' ? { id: first } : (first as MediaLike | undefined) ?? null
  return <Thumbnail media={media} />
}
