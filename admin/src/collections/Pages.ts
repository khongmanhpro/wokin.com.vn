import type { CollectionConfig } from 'payload'
import { auditHooks } from '../access/audit'
import { activeAuthenticated, canUpdatePages } from '../access/collectionAccess'

const audit = auditHooks('pages')

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: { create: canUpdatePages, delete: canUpdatePages, read: activeAuthenticated, update: canUpdatePages },
  admin: {
    defaultColumns: ['titleVi', 'slug', 'status'],
    description: 'Quản lý nội dung và trạng thái xuất bản của các trang tĩnh.',
    group: 'Nội dung',
    listSearchableFields: ['slug'],
    pagination: { defaultLimit: 25, limits: [25, 50, 100] },
    useAsTitle: 'titleVi',
  },
  labels: { singular: 'Trang', plural: 'Trang' },
  hooks: { afterChange: audit.afterChange, afterDelete: audit.afterDelete },
  fields: [
    { name: 'titleVi', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'status', type: 'select', required: true, index: true, defaultValue: 'draft', options: ['draft', 'published', 'archived'] },
    { name: 'bodyVi', type: 'textarea' },
    { name: 'seo', type: 'json' },
  ],
}
