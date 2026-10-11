'use client'

import { useAuth, useForm, useFormFields, useFormProcessing } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { getProductWorkflowActions, type ProductWorkflowAction, type ProductWorkflowStatus, workflowActionLabels, workflowActionTarget } from '../lib/productOperations'

type FieldState = { value?: unknown }
type AdminUser = { role?: string }

function statusValue(fields: Record<string, FieldState>): ProductWorkflowStatus {
  const status = fields.status?.value
  return ['draft', 'in_review', 'changes_requested', 'approved', 'published', 'archived'].includes(String(status))
    ? status as ProductWorkflowStatus
    : 'draft'
}

export function ProductWorkflowPanel() {
  const { user } = useAuth<AdminUser>()
  const pathname = usePathname()
  const form = useForm()
  const processing = useFormProcessing()
  const fields = useFormFields(([formFields]) => formFields as Record<string, FieldState>)
  const [error, setError] = useState<string | null>(null)
  const status = statusValue(fields)
  const role = user?.role
  const actions = role && ['owner', 'admin', 'editor', 'seo_reviewer', 'media_manager', 'publisher', 'readonly'].includes(role)
    ? getProductWorkflowActions(role as never, status)
    : ['preview' as ProductWorkflowAction]

  async function run(action: ProductWorkflowAction) {
    setError(null)
    try {
      await form.submit({ overrides: workflowActionTarget[action] ? { status: workflowActionTarget[action] } : undefined })
    } catch {
      setError('Không thể lưu thay đổi. Chính sách máy chủ hoặc kiểm tra sẵn sàng đã từ chối thao tác.')
    }
  }

  return <section className="wokin-product-workflow" aria-label="Thao tác workflow">
    <h3>Thao tác</h3>
    <p>Thao tác chỉ gửi dữ liệu qua form chuẩn của Payload; quyền và trạng thái được máy chủ kiểm tra lại.</p>
    <div className="wokin-product-workflow__actions">
      {actions.map((action) => action === 'preview'
        ? <a href={`${pathname.replace(/\/$/, '')}/preview`} key={action}>{workflowActionLabels[action]}</a>
        : <button key={action} type="button" disabled={processing} onClick={() => void run(action)}>{workflowActionLabels[action]}</button>)}
    </div>
    {error && <p className="wokin-state wokin-state--error" role="alert">{error}</p>}
  </section>
}
