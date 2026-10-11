'use client'

import { useFormFields } from '@payloadcms/ui'

import { getProductReadiness } from '../lib/productOperations'

type FieldState = { value?: unknown; errorMessage?: string }

export function ProductValidationPanel() {
  const fields = useFormFields(([formFields]) => formFields as Record<string, FieldState>)
  const readiness = getProductReadiness({
    media: fields.media?.value,
    seo: {
      title: fields['seo.title']?.value,
      description: fields['seo.description']?.value,
      canonicalPath: fields['seo.canonicalPath']?.value,
      noIndex: fields['seo.noIndex']?.value,
    },
  })
  const errors = Object.entries(fields).filter(([, field]) => field.errorMessage).map(([path, field]) => `${path}: ${field.errorMessage}`)
  const checks = [
    readiness.media === 'ready' ? null : 'Cần ít nhất một hình ảnh trước khi xuất bản.',
    readiness.seo === 'ready' ? null : 'SEO cần tiêu đề, mô tả, canonical path và cho phép lập chỉ mục.',
  ].filter(Boolean)

  return <section className="wokin-product-validation" aria-label="Kiểm tra sẵn sàng">
    <h3>Kiểm tra sẵn sàng</h3>
    {checks.length === 0 && errors.length === 0 ? <p className="wokin-state">Sản phẩm đã đủ dữ liệu cơ bản. Máy chủ vẫn xác minh quyền media khi xuất bản.</p> : <ul>{[...checks, ...errors].map((message) => <li key={message}>{message}</li>)}</ul>}
  </section>
}
