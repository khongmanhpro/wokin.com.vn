import type { CollectionConfig } from 'payload'
import { auditHooks } from '../access/audit'
import { activeAuthenticated, canUpdatePages } from '../access/collectionAccess'

const audit = auditHooks('pages')

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: { create: canUpdatePages, delete: canUpdatePages, read: activeAuthenticated, update: canUpdatePages },
  admin: {
    defaultColumns: ['titleVi', 'slug', '_status', 'updatedAt'],
    description: 'Trang nội dung (Giới thiệu, Chính sách…): soạn thảo, lưu nháp, xem lại lịch sử và xuất bản.',
    group: 'Nội dung',
    listSearchableFields: ['titleVi', 'slug'],
    pagination: { defaultLimit: 25, limits: [25, 50, 100] },
    useAsTitle: 'titleVi',
  },
  labels: { singular: 'Trang', plural: 'Trang' },
  hooks: { afterChange: audit.afterChange, afterDelete: audit.afterDelete },
  // WordPress-style editing: drafts with autosave, revision history and a trash bin.
  versions: { maxPerDoc: 50, drafts: { autosave: { interval: 60_000 } } },
  trash: true,
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Nội dung',
          fields: [
            { name: 'titleVi', label: 'Tiêu đề', type: 'text', required: true },
            { name: 'excerptVi', label: 'Tóm tắt', type: 'textarea', admin: { description: 'Một đến hai câu, dùng cho thẻ chia sẻ và danh sách.' } },
            { name: 'bodyVi', label: 'Nội dung', type: 'richText' },
          ],
        },
        {
          label: 'SEO',
          fields: [{
            name: 'seo', type: 'group', label: 'SEO',
            fields: [
              { name: 'title', label: 'Tiêu đề tìm kiếm', type: 'text', admin: { description: 'Nên dưới 60 ký tự.' } },
              { name: 'description', label: 'Mô tả tìm kiếm', type: 'textarea', admin: { description: 'Nên dưới 160 ký tự.' } },
              { name: 'canonicalPath', label: 'Đường dẫn chuẩn', type: 'text' },
              { name: 'noIndex', label: 'Không cho công cụ tìm kiếm lập chỉ mục', type: 'checkbox', defaultValue: false },
            ],
          }],
        },
      ],
    },
    { name: 'slug', label: 'Đường dẫn', type: 'text', required: true, unique: true, index: true, admin: { position: 'sidebar', description: 'Chữ thường không dấu, ví dụ: gioi-thieu' } },
    { name: 'heroImage', label: 'Ảnh đại diện', type: 'upload', relationTo: 'media', admin: { position: 'sidebar' } },
  ],
}
