import type { CollectionConfig } from 'payload'
import { auditHooks } from '../access/audit'
import { activeAuthenticated, canUpdatePages } from '../access/collectionAccess'

const audit = auditHooks('pages')

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: { create: canUpdatePages, delete: canUpdatePages, read: activeAuthenticated, update: canUpdatePages },
  admin: { group: 'Content', useAsTitle: 'titleVi' },
  hooks: { afterChange: audit.afterChange, afterDelete: audit.afterDelete },
  fields: [
    { name: 'titleVi', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'status', type: 'select', required: true, index: true, defaultValue: 'draft', options: ['draft', 'published', 'archived'] },
    { name: 'bodyVi', type: 'textarea' },
    { name: 'seo', type: 'json' },
  ],
}
