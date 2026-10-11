import type { DefaultServerCellComponentProps } from 'payload'
import Link from 'next/link'
import type { ReactNode } from 'react'

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

type CellLinkProps = Pick<DefaultServerCellComponentProps, 'collectionSlug' | 'link' | 'linkURL' | 'rowData' | 'viewType'>

export function documentHref({ collectionSlug, linkURL, rowData, viewType }: CellLinkProps): string | null {
  if (linkURL) return linkURL
  const id = rowData?.id
  if (id === undefined || id === null) return null
  const base = `/admin/collections/${collectionSlug}`
  return viewType === 'trash' ? `${base}/trash/${encodeURIComponent(String(id))}` : `${base}/${encodeURIComponent(String(id))}`
}

/**
 * Payload only links the first column, and a custom Cell must render that link itself.
 * Without this the thumbnail column (first in the list) left rows with no way to open the document.
 */
export function DocumentLink(props: CellLinkProps & { children: ReactNode; always?: boolean }) {
  const href = props.link || props.always ? documentHref(props) : null
  return href ? <Link className="wokin-cell-link" href={href} prefetch={false}>{props.children}</Link> : <>{props.children}</>
}

/** Media list: the row itself is the media document. */
export function MediaThumbnailCell(props: DefaultServerCellComponentProps) {
  return <DocumentLink {...props}><Thumbnail media={props.rowData as MediaLike} /></DocumentLink>
}

/** Product list: first related image (populated at the list view's depth=1, otherwise only an id). */
export function ProductThumbnailCell(props: DefaultServerCellComponentProps) {
  const first = Array.isArray(props.rowData?.media) ? props.rowData.media[0] : undefined
  const media = typeof first === 'string' ? { id: first } : (first as MediaLike | undefined) ?? null
  return <DocumentLink {...props}><Thumbnail media={media} /></DocumentLink>
}

/** Title column that always opens the document, so editors can click the name (not only the thumbnail). */
export function TitleLinkCell(props: DefaultServerCellComponentProps) {
  const text = typeof props.cellData === 'string' && props.cellData.trim() ? props.cellData : '(chưa có tên)'
  return <DocumentLink {...props} always><strong>{text}</strong></DocumentLink>
}
