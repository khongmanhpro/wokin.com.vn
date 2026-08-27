import type { CollectionConfig } from 'payload'

import { auditHooks } from '../access/audit'
import { activeAuthenticated, canManageCategories } from '../access/collectionAccess'

const audit = auditHooks('categories')

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: { create: canManageCategories, delete: canManageCategories, read: activeAuthenticated, update: canManageCategories },
  admin: { defaultColumns: ['nameVi', 'slug', 'status', 'sortOrder'], group: 'Catalog', useAsTitle: 'nameVi' },
  hooks: {
    afterChange: audit.afterChange,
    afterDelete: audit.afterDelete,
    beforeChange: [({ data, originalDoc }) => {
      if (originalDoc?.legacySourceId !== undefined && data.legacySourceId !== undefined && data.legacySourceId !== originalDoc.legacySourceId) {
        throw new Error('legacySourceId is immutable')
      }
      return data
    }],
  },
  fields: [
    { name: 'legacySourceId', type: 'number', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'nameVi', type: 'text', required: true },
    { name: 'sourceName', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'status', type: 'select', required: true, index: true, defaultValue: 'draft',
      options: ['draft', 'active', 'archived'],
    },
    { name: 'parent', type: 'relationship', relationTo: 'categories', required: false, index: true },
    { name: 'sortOrder', type: 'number', required: true, index: true, defaultValue: 0 },
    {
      name: 'seo', type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'canonicalPath', type: 'text' },
        { name: 'noIndex', type: 'checkbox', defaultValue: true },
      ],
    },
  ],
}
