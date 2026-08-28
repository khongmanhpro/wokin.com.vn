type ProductSnapshot = {
  nameVi?: string
  status?: string
  descriptionVi?: string
  specifications?: Array<{ label?: string; value?: string; unit?: string }>
  categories?: unknown[]
  media?: unknown[]
  seo?: { title?: string; description?: string; canonicalPath?: string; noIndex?: boolean }
}

export function ProductDraftPreview({ doc: product }: { doc?: ProductSnapshot }) {
  const seo = product?.seo
  const seoReady = Boolean(seo?.title?.trim() && seo.description?.trim() && seo.canonicalPath?.trim() && seo.noIndex === false)

  return <main>
    <h1>{product?.nameVi ?? 'Sản phẩm chưa có dữ liệu'}</h1>
    <p><strong>Trạng thái:</strong> {product?.status ?? '—'}</p>
    <p><strong>Lưu ý:</strong> Không công khai / chỉ hiển thị dữ liệu đã lưu.</p>
    <section>
      <h2>Mô tả tiếng Việt</h2>
      <p>{product?.descriptionVi ?? '—'}</p>
    </section>
    <section>
      <h2>Thông số kỹ thuật</h2>
      <ul>{product?.specifications?.map((item, index) => <li key={index}>{item.label}: {item.value} {item.unit}</li>)}</ul>
    </section>
    <p><strong>Danh mục:</strong> {product?.categories?.length ?? 0}</p>
    <p><strong>Hình ảnh:</strong> {product?.media?.length ?? 0}</p>
    <section>
      <h2>SEO</h2>
      <p>{seoReady ? 'Sẵn sàng lập chỉ mục' : 'Chưa sẵn sàng lập chỉ mục'}</p>
    </section>
  </main>
}
