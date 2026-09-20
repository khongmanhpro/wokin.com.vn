'use client'

import { useFormFields } from '@payloadcms/ui'

import { getProductReadiness, productStatusLabel } from '../lib/productOperations'
import { ProductValidationPanel } from './ProductValidationPanel'
import { ProductWorkflowPanel } from './ProductWorkflowPanel'

type FieldState = { value?: unknown }

function fieldValue(fields: Record<string, FieldState>, path: string): unknown {
  return fields[path]?.value
}

function fieldText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '—'
}

export function ProductEditorHeader() {
  const fields = useFormFields(([formFields]) => formFields as Record<string, FieldState>)
  const seo = {
    title: fieldValue(fields, 'seo.title'),
    description: fieldValue(fields, 'seo.description'),
    canonicalPath: fieldValue(fields, 'seo.canonicalPath'),
    noIndex: fieldValue(fields, 'seo.noIndex'),
  }
  const readiness = getProductReadiness({ media: fieldValue(fields, 'media'), seo })

  return <>
    <section className="wokin-product-editor-header" aria-label="Tóm tắt sản phẩm">
      <p className="wokin-nav__label">Không gian vận hành sản phẩm</p>
      <h2>{fieldText(fieldValue(fields, 'nameVi')) === '—' ? 'Sản phẩm chưa có tên' : fieldText(fieldValue(fields, 'nameVi'))}</h2>
      <dl>
        <div><dt>SKU</dt><dd>{fieldText(fieldValue(fields, 'sku'))}</dd></div>
        <div><dt>Trạng thái</dt><dd>{productStatusLabel(fieldValue(fields, 'status'))}</dd></div>
        <div><dt>Hình ảnh</dt><dd>{readiness.media === 'ready' ? 'Đã gắn' : 'Cần bổ sung'}</dd></div>
        <div><dt>SEO</dt><dd>{readiness.seo === 'ready' ? 'Sẵn sàng' : 'Cần bổ sung'}</dd></div>
        <div><dt>Cập nhật</dt><dd>{fieldValue(fields, 'updatedAt') ? new Date(String(fieldValue(fields, 'updatedAt'))).toLocaleString('vi-VN') : 'Chưa lưu'}</dd></div>
      </dl>
    </section>
    <ProductValidationPanel />
    <ProductWorkflowPanel />
  </>
}
