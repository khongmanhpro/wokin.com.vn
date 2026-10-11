import type { Payload, PayloadRequest } from 'payload'

import { isActiveAdmin } from '../access/hasCapability'
import { productStatusLabel } from '../lib/productOperations'
import { WokinErrorState } from './WokinErrorState'

export type ProductPreviewSnapshot = {
  id?: string
  nameVi?: string
  sku?: string | null
  status?: string
  descriptionVi?: string | null
  specifications?: Array<{ label?: string; value?: string; unit?: string | null }> | null
  packaging?: Array<{ cells?: Array<{ value?: string | null }> }> | null
  categories?: Array<string | { id: string; nameVi?: string }> | null
  media?: Array<string | { id: string; path?: string; filename?: string | null; alt?: string }> | null
  seo?: { title?: string | null; description?: string | null; canonicalPath?: string | null; noIndex?: boolean | null }
}

export function ProductPreviewContent({ product }: { product: ProductPreviewSnapshot }) {
  const media = (product.media ?? []).filter((item): item is Exclude<NonNullable<ProductPreviewSnapshot['media']>[number], string> => typeof item === 'object' && item !== null)
  const categories = (product.categories ?? []).flatMap((item) => typeof item === 'object' && item?.nameVi ? [item.nameVi] : [])
  return <main className="wokin-product-preview" lang="vi">
    <aside className="wokin-product-preview__notice"><strong>Bản xem trước nội bộ — {productStatusLabel(product.status)}</strong><p>Chỉ hiển thị dữ liệu đã lưu. Chưa công khai lên website; thay đổi chưa lưu không xuất hiện ở đây.</p>{product.id && <a href={`/admin/collections/products/${encodeURIComponent(product.id)}`}>Quay lại chỉnh sửa</a>}</aside>
    <p className="wokin-product-preview__breadcrumb">Sản phẩm / {categories.join(' / ') || 'Chưa có danh mục'}</p>
    <div className="wokin-product-preview__detail">
      <section className="wokin-product-preview__gallery" aria-label="Hình ảnh sản phẩm">{media.length ? media.map((item, index) => <figure key={item.id}><img src={item.filename ? `/api/media/file/${encodeURIComponent(item.filename)}` : `/api/media/preview/${encodeURIComponent(item.id)}`} alt={item.alt || product.nameVi || 'Ảnh sản phẩm'} loading={index ? 'lazy' : 'eager'} /></figure>) : <p>Chưa có ảnh hoặc không có quyền xem ảnh.</p>}</section>
      <section className="wokin-product-preview__info"><h1>{product.nameVi || 'Sản phẩm chưa có dữ liệu'}</h1><p><strong>SKU:</strong> {product.sku || 'Chưa có mã'}</p><p><strong>Danh mục:</strong> {categories.join(', ') || 'Chưa có danh mục'}</p>
        {product.descriptionVi && <p className="wokin-product-preview__description">{product.descriptionVi}</p>}
        <h2>Thông số kỹ thuật</h2><ul>{product.specifications?.map((item, index) => <li key={index}>{item.label}: {item.value} {item.unit}</li>)}</ul>
        {!!product.packaging?.length && <div className="wokin-product-preview__table"><table><caption>Thông tin đóng gói</caption><tbody>{product.packaging.map((row, rowIndex) => <tr key={rowIndex}>{row.cells?.map((cell, cellIndex) => <td key={cellIndex}>{cell.value}</td>)}</tr>)}</tbody></table></div>}
      </section>
    </div>
    <section aria-label="Thông tin tìm kiếm"><h2>Thông tin tìm kiếm</h2><p>{product.seo?.title || 'Chưa có tiêu đề tìm kiếm'}</p><p>{product.seo?.description || 'Chưa có mô tả tìm kiếm'}</p></section>
  </main>
}

export async function ProductDraftPreview({ doc, initPageResult, payload }: { doc?: { id?: string }; initPageResult?: { req: PayloadRequest }; payload?: Payload }) {
  const req = initPageResult?.req
  if (!req || !isActiveAdmin(req.user) || !doc?.id || !payload) return <WokinErrorState title="Không thể xem trước" description="Vui lòng đăng nhập và mở một sản phẩm đã lưu." />
  try {
    // Native document views receive depth:0. Fetch relationships with the same authenticated request.
    const product = await payload.findByID({ collection: 'products', id: doc.id, depth: 1, overrideAccess: false, req })
    return <ProductPreviewContent product={product} />
  } catch {
    return <WokinErrorState title="Không thể tải bản xem trước" description="Hãy tải lại trang hoặc kiểm tra quyền xem sản phẩm." />
  }
}
