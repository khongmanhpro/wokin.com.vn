import type { CollectionConfig } from 'payload'

import { auditHooks } from '../access/audit'
import { activeAuthenticated, canCreateProduct, canDeleteProduct, canUpdateProduct } from '../access/collectionAccess'
import { canChangeProductContent, canChangeProductSEO, canChangeProductStatus } from '../access/fieldAccess'
import { enforceProductMutationPolicy } from '../access/productPolicy'

const productStatuses = ['draft', 'in_review', 'approved', 'published', 'archived'] as const
const audit = auditHooks('products')

export const Products: CollectionConfig = {
  slug: 'products',
  access: { create: canCreateProduct, delete: canDeleteProduct, read: activeAuthenticated, update: canUpdateProduct },
  admin: {
    defaultColumns: ['nameVi', 'sku', 'status', 'legacySourceId', 'slugVi'],
    group: 'Catalog',
    useAsTitle: 'nameVi',
  },
  hooks: {
    afterChange: audit.afterChange,
    afterDelete: audit.afterDelete,
    beforeChange: [enforceProductMutationPolicy, ({ data, originalDoc }) => {
      if (originalDoc?.legacySourceId !== undefined && data.legacySourceId !== undefined && data.legacySourceId !== originalDoc.legacySourceId) {
        throw new Error('legacySourceId is immutable')
      }
      return data
    }],
  },
  fields: [
    {
      name: 'legacySourceId', type: 'number', required: true, unique: true, index: true,
      admin: { description: 'Khóa identity nguồn, bất biến sau khi tạo.', readOnly: true },
    },
    {
      name: 'sku', type: 'text', required: false, index: true,
      admin: { description: 'Có thể trống hoặc trùng; tuyệt đối không dùng làm identity.' },
    },
    {
      name: 'status', type: 'select', required: true, index: true, defaultValue: 'draft',
      options: productStatuses.map((value) => ({ label: value, value })),
      access: { create: canChangeProductStatus, update: canChangeProductStatus },
    },
    { name: 'nameVi', type: 'text', required: true, access: { create: canChangeProductContent, update: canChangeProductContent } },
    { name: 'slugVi', type: 'text', required: true, unique: true, index: true, access: { create: canChangeProductContent, update: canChangeProductContent } },
    { name: 'descriptionVi', type: 'textarea', required: false, access: { create: canChangeProductContent, update: canChangeProductContent } },
    {
      name: 'specifications', type: 'array', required: false, access: { create: canChangeProductContent, update: canChangeProductContent },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
        { name: 'unit', type: 'text', required: false },
        { name: 'sourceLine', type: 'text', required: false },
      ],
    },
    {
      name: 'packaging', type: 'array', required: true, minRows: 1, access: { create: canChangeProductContent, update: canChangeProductContent },
      fields: [{
        name: 'cells', type: 'array', required: true, minRows: 1,
        fields: [{ name: 'value', type: 'text', required: false }],
      }],
    },
    {
      name: 'attributes', type: 'array', required: false, access: { create: canChangeProductContent, update: canChangeProductContent },
      fields: [
        { name: 'legacySourceId', type: 'number', required: false },
        { name: 'name', type: 'text', required: true },
        {
          name: 'values', type: 'array', required: true, minRows: 1,
          fields: [{ name: 'value', type: 'text', required: true }],
        },
      ],
    },
    { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true, required: true, access: { create: canChangeProductContent, update: canChangeProductContent } },
    { name: 'media', type: 'relationship', relationTo: 'media', hasMany: true, required: true, access: { create: canChangeProductContent, update: canChangeProductContent } },
    { name: 'publishedAt', type: 'date', required: false, index: true, access: { create: canChangeProductStatus, update: canChangeProductStatus } },
    {
      name: 'seo', type: 'group', access: { create: canChangeProductSEO, update: canChangeProductSEO },
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'canonicalPath', type: 'text' },
        { name: 'noIndex', type: 'checkbox', defaultValue: true },
      ],
    },
    {
      name: 'sourceMetadata', type: 'group', required: true, access: { update: () => false },
      fields: [
        { name: 'sourceType', type: 'text', required: true },
        { name: 'legacySlug', type: 'text', required: true, index: true },
        { name: 'sourceName', type: 'text', required: true },
        { name: 'legacyDescription', type: 'textarea' },
        { name: 'sourceChecksum', type: 'text', required: true },
        { name: 'canonicalSlugSha256', type: 'text', required: true },
        { name: 'searchIndex', type: 'json' },
        { name: 'importedAt', type: 'date', required: true },
        { name: 'legacyPublishedAt', type: 'text' },
      ],
    },
  ],
}
