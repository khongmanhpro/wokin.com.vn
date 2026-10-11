import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { auditHooks } from '../access/audit'
import { requireCapability } from '../access/collectionAccess'
import { contactSubmissionEndpoint } from '../endpoints/contactSubmission'

const audit = auditHooks('contact-submissions')
const immutableFields = ['fullName', 'phone', 'email', 'subject', 'message', 'consent', 'sourceUrl', 'submittedAt'] as const

const preserveSubmittedData: CollectionBeforeChangeHook = ({ data, operation, originalDoc }) => {
  if (operation === 'update' && originalDoc) {
    for (const field of immutableFields) data[field] = originalDoc[field]
  }
  return data
}

export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  endpoints: [contactSubmissionEndpoint],
  access: {
    create: requireCapability('settings.manage'),
    delete: requireCapability('settings.manage'),
    read: requireCapability('settings.manage'),
    update: requireCapability('settings.manage'),
  },
  admin: {
    defaultColumns: ['fullName', 'phone', 'subject', 'status', 'submittedAt'],
    description: 'Các yêu cầu liên hệ gửi từ website; chỉ quản trị viên được phân quyền mới xem được thông tin khách hàng.',
    group: 'Liên hệ',
    listSearchableFields: ['fullName', 'phone', 'email'],
    pagination: { defaultLimit: 25, limits: [25, 50, 100] },
    useAsTitle: 'fullName',
  },
  labels: { singular: 'Yêu cầu liên hệ', plural: 'Yêu cầu liên hệ' },
  hooks: {
    afterChange: audit.afterChange,
    afterDelete: audit.afterDelete,
    beforeChange: [preserveSubmittedData],
  },
  fields: [
    { name: 'fullName', label: 'Họ và tên', type: 'text', required: true, maxLength: 120 },
    { name: 'phone', label: 'Số điện thoại', type: 'text', required: true, maxLength: 32 },
    { name: 'email', label: 'Email', type: 'email', required: false },
    {
      name: 'subject', label: 'Nhu cầu', type: 'select', required: true,
      options: [
        { value: 'product', label: 'Tư vấn sản phẩm' },
        { value: 'quote', label: 'Báo giá / đơn hàng' },
        { value: 'distribution', label: 'Trở thành nhà phân phối' },
        { value: 'other', label: 'Nội dung khác' },
      ],
    },
    { name: 'message', label: 'Nội dung', type: 'textarea', required: true, maxLength: 4000 },
    { name: 'consent', label: 'Đã đồng ý xử lý thông tin', type: 'checkbox', required: true, admin: { readOnly: true } },
    {
      name: 'status', label: 'Trạng thái', type: 'select', required: true, defaultValue: 'new', index: true,
      options: [
        { value: 'new', label: 'Mới' },
        { value: 'in_progress', label: 'Đang xử lý' },
        { value: 'resolved', label: 'Đã xử lý' },
        { value: 'spam', label: 'Spam' },
      ],
    },
    { name: 'notes', label: 'Ghi chú nội bộ', type: 'textarea', maxLength: 4000 },
    { name: 'sourceUrl', label: 'Trang gửi', type: 'text', admin: { readOnly: true } },
    { name: 'submittedAt', label: 'Thời điểm gửi', type: 'date', required: true, index: true, admin: { readOnly: true } },
  ],
}
