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
    defaultColumns: ['nameVi', 'sku', 'status', 'categories', 'legacySourceId', 'slugVi'],
    group: 'Catalog',
    listSearchableFields: ['nameVi', 'sku', 'legacySourceId'],
    pagination: { defaultLimit: 25, limits: [25, 50, 100] },
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
      type: 'tabs',
      tabs: [
        {
          label: 'Định danh',
          fields: [
            {
              name: 'legacySourceId', type: 'number', required: true, unique: true, index: true, label: 'Mã nguồn (bất biến)',
              admin: { description: 'Khóa định danh nguồn, bất biến sau khi tạo.', readOnly: true },
            },
            {
              name: 'sku', type: 'text', required: false, index: true, label: 'SKU',
              admin: {
                components: { Cell: '/components/ProductSkuCell#ProductSkuCell' },
                description: 'Có thể trống hoặc trùng; tuyệt đối không dùng làm định danh.',
              },
            },
          ],
        },
        {
          label: 'Nội dung tiếng Việt',
          fields: [
            { name: 'nameVi', type: 'text', required: true, label: 'Tên sản phẩm', access: { create: canChangeProductContent, update: canChangeProductContent } },
            { name: 'slugVi', type: 'text', required: true, unique: true, index: true, label: 'Đường dẫn tiếng Việt', access: { create: canChangeProductContent, update: canChangeProductContent } },
            { name: 'descriptionVi', type: 'textarea', required: false, label: 'Mô tả tiếng Việt', access: { create: canChangeProductContent, update: canChangeProductContent } },
          ],
        },
        {
          label: 'Thông số kỹ thuật',
          fields: [{
            name: 'specifications', type: 'array', required: false, label: 'Thông số kỹ thuật', access: { create: canChangeProductContent, update: canChangeProductContent },
            fields: [
              { name: 'label', type: 'text', required: true },
              { name: 'value', type: 'text', required: true },
              { name: 'unit', type: 'text', required: false },
              { name: 'sourceLine', type: 'text', required: false },
            ],
          }],
        },
        {
          label: 'Đóng gói & thuộc tính',
          fields: [
            {
              name: 'packaging', type: 'array', required: true, minRows: 1, label: 'Đóng gói', access: { create: canChangeProductContent, update: canChangeProductContent },
              fields: [{
                name: 'cells', type: 'array', required: true, minRows: 1,
                fields: [{ name: 'value', type: 'text', required: false }],
              }],
            },
            {
              name: 'attributes', type: 'array', required: false, label: 'Thuộc tính', access: { create: canChangeProductContent, update: canChangeProductContent },
              fields: [
                { name: 'legacySourceId', type: 'number', required: false },
                { name: 'name', type: 'text', required: true },
                {
                  name: 'values', type: 'array', required: true, minRows: 1,
                  fields: [{ name: 'value', type: 'text', required: true }],
                },
              ],
            },
          ],
        },
        {
          label: 'Danh mục & hình ảnh',
          fields: [
            { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true, required: true, label: 'Danh mục', access: { create: canChangeProductContent, update: canChangeProductContent } },
            { name: 'media', type: 'relationship', relationTo: 'media', hasMany: true, required: true, label: 'Hình ảnh', access: { create: canChangeProductContent, update: canChangeProductContent } },
          ],
        },
        {
          label: 'SEO',
          fields: [{
            name: 'seo', type: 'group', label: 'SEO', access: { create: canChangeProductSEO, update: canChangeProductSEO },
            fields: [
              { name: 'title', type: 'text' },
              { name: 'description', type: 'textarea' },
              { name: 'canonicalPath', type: 'text' },
              { name: 'noIndex', type: 'checkbox', defaultValue: true },
            ],
          }],
        },
        {
          label: 'Vòng đời & kiểm tra',
          fields: [
            {
              name: 'status', type: 'select', required: true, index: true, defaultValue: 'draft', label: 'Trạng thái',
              options: productStatuses.map((value) => ({ label: value, value })),
              access: { create: canChangeProductStatus, update: canChangeProductStatus },
            },
            { name: 'publishedAt', type: 'date', required: false, index: true, label: 'Ngày xuất bản', access: { create: canChangeProductStatus, update: canChangeProductStatus } },
          ],
        },
        {
          label: 'Nguồn gốc',
          fields: [{
            name: 'sourceMetadata', type: 'group', required: true, label: 'Dữ liệu nguồn (chỉ đọc)', access: { update: () => false },
            admin: { readOnly: true, description: 'Dữ liệu nhập nguồn được bảo toàn để đối chiếu.' },
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
          }],
        },
      ],
    },
  ],
}
