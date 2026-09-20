import type { DefaultServerCellComponentProps } from 'payload'

type Seo = { title?: unknown; description?: unknown; canonicalPath?: unknown; noIndex?: unknown } | undefined

function text(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 }

export function seoReadiness(seo: Seo) {
  const issues: string[] = []
  if (!text(seo?.title)) issues.push('Thiếu tiêu đề SEO')
  if (!text(seo?.description)) issues.push('Thiếu mô tả SEO')
  if (!text(seo?.canonicalPath)) issues.push('Thiếu canonical')
  else if (!seo.canonicalPath.trim().startsWith('/')) issues.push('Canonical phải là đường dẫn nội bộ, không dùng source-domain')
  if (seo?.noIndex === true) issues.push('Trang đang bật noindex')
  else if (seo?.noIndex !== false) issues.push('Chưa xác nhận trạng thái index')
  return { ready: issues.length === 0, issues }
}

export function SeoReadinessBadge({ seo, slugVi }: { seo?: Seo; slugVi?: string }) {
  const result = seoReadiness(seo)
  return <section className={`wokin-seo-readiness wokin-seo-readiness--${result.ready ? 'ready' : 'missing'}`} aria-label="Mức sẵn sàng SEO">
    <strong>{result.ready ? 'Sẵn sàng SEO' : 'Chưa sẵn sàng SEO'}</strong>
    <p>Canonical xem trước: <code>{text(seo?.canonicalPath) ? seo.canonicalPath : slugVi ? `/san-pham/${slugVi} (chưa lưu)` : 'Chưa có'}</code></p>
    <p>JSON-LD: {result.ready ? 'Sẵn sàng sinh từ dữ liệu SEO đã lưu.' : 'JSON-LD cần bổ sung trước khi xuất bản.'}</p>
    {result.issues.length > 0 && <ul>{result.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
  </section>
}

export function ProductSeoReadinessCell({ rowData }: DefaultServerCellComponentProps) {
  const product = rowData as { seo?: Seo; slugVi?: string }
  return <SeoReadinessBadge seo={product.seo} slugVi={product.slugVi} />
}
