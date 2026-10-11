import { APIError, type CollectionConfig } from 'payload'

import { auditHooks } from '../access/audit'
import { activeAuthenticated, canCreateProduct, canDeleteProduct, canUpdateProduct } from '../access/collectionAccess'
import { canChangeProductContent, canChangeProductSEO, canChangeProductStatus } from '../access/fieldAccess'
import { enforceProductMutationPolicy } from '../access/productPolicy'
import { enforcePublishReadiness } from '../access/publishReadiness'
import { assignManualProductIdentity, requiredAfterCreate, validateProductSlug } from '../lib/manualProductIdentity'
import { productStatusLabel } from '../lib/productOperations'

const productStatuses = ['draft', 'in_review', 'changes_requested', 'approved', 'published', 'archived'] as const
const audit = auditHooks('products')

export const Products: CollectionConfig = {
  slug: 'products',
  access: { create: canCreateProduct, delete: canDeleteProduct, read: activeAuthenticated, update: canUpdateProduct },
  admin: {
    defaultColumns: ['thumbnail', 'nameVi', 'sku', 'status', 'categories', 'legacySourceId', 'slugVi'],
    description: 'Quản lý nội dung, trạng thái biên tập, hình ảnh và SEO của sản phẩm.',
    group: 'Danh mục sản phẩm',
    listSearchableFields: ['nameVi', 'sku', 'legacySourceId'],
    pagination: { defaultLimit: 25, limits: [25, 50, 100] },
    useAsTitle: 'nameVi',
    components: {
      views: {
        edit: {
          preview: {
            Component: '/components/ProductDraftPreview#ProductDraftPreview',
            path: '/preview',
            meta: { robots: { index: false, follow: false } },
          },
        },
      },
    },
  },
  labels: { singular: 'Sản phẩm', plural: 'Sản phẩm' },
  // Revision history and trash like WordPress. No Payload drafts: the editorial status workflow owns publishing.
  versions: { maxPerDoc: 30 },
  trash: true,
  hooks: {
    afterChange: audit.afterChange,
    afterDelete: audit.afterDelete,
    beforeValidate: [assignManualProductIdentity],
    beforeChange: [enforceProductMutationPolicy, enforcePublishReadiness, ({ data, originalDoc }) => {
      if (originalDoc?.legacySourceId !== undefined && data.legacySourceId !== undefined && data.legacySourceId !== originalDoc.legacySourceId) {
        throw new APIError('Mã nguồn của sản phẩm không được thay đổi (legacySourceId is immutable).', 400)
      }
      return data
    }],
  },
  fields: [
    { name: 'thumbnail', label: 'Ảnh', type: 'ui', admin: { components: { Cell: '/components/MediaThumbnailCell#ProductThumbnailCell', Field: false } } },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Định danh',
          fields: [
            {
              name: 'legacySourceId', type: 'number', required: true, unique: true, index: true, label: 'Mã nguồn (bất biến)', validate: requiredAfterCreate,
              admin: { description: 'Khóa định danh nguồn, bất biến sau khi tạo. Sản phẩm tạo mới để trống, hệ thống tự cấp từ 900000 khi lưu.', readOnly: true },
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
            { name: 'nameVi', type: 'text', required: true, label: 'Tên sản phẩm', access: { create: canChangeProductContent, update: canChangeProductContent }, admin: { components: { Cell: '/components/MediaThumbnailCell#TitleLinkCell' } } },
            { name: 'slugVi', type: 'text', required: true, unique: true, index: true, label: 'Đường dẫn tiếng Việt', validate: validateProductSlug, admin: { description: 'Để trống thì tự tạo từ tên sản phẩm.' }, access: { create: canChangeProductContent, update: canChangeProductContent } },
            { name: 'descriptionVi', type: 'textarea', required: false, label: 'Mô tả tiếng Việt', access: { create: canChangeProductContent, update: canChangeProductContent } },
          ],
        },
        {
          label: 'Thông số kỹ thuật',
          fields: [{
            name: 'specifications', type: 'array', required: false, label: 'Thông số kỹ thuật', access: { create: canChangeProductContent, update: canChangeProductContent },
            fields: [
              { name: 'label', label: 'Tên thông số', type: 'text', required: true },
              { name: 'value', label: 'Giá trị', type: 'text', required: true },
              { name: 'unit', label: 'Đơn vị', type: 'text', required: false },
              { name: 'sourceLine', label: 'Dòng nguồn đối chiếu', type: 'text', required: false },
            ],
          }],
        },
        {
          label: 'Đóng gói & thuộc tính',
          fields: [
            {
              name: 'packaging', type: 'array', required: false, label: 'Đóng gói', access: { create: canChangeProductContent, update: canChangeProductContent },
              fields: [{
                name: 'cells', label: 'Các ô trong hàng', type: 'array', required: true, minRows: 1,
                fields: [{ name: 'value', label: 'Nội dung ô', type: 'text', required: false }],
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
            { name: 'media', type: 'relationship', relationTo: 'media', hasMany: true, required: true, label: 'Hình ảnh & quyền', access: { create: canChangeProductContent, update: canChangeProductContent }, admin: { components: { Cell: '/components/ProductReadinessBadge#ProductMediaReadinessCell' } } },
          ],
        },
        {
          label: 'SEO',
          fields: [{
            name: 'seo', type: 'group', label: 'SEO', access: { create: canChangeProductSEO, update: canChangeProductSEO }, admin: { components: { Cell: '/components/SeoReadinessBadge#ProductSeoReadinessCell' } },
            fields: [
              { name: 'title', label: 'Tiêu đề tìm kiếm', type: 'text' },
              { name: 'description', label: 'Mô tả tìm kiếm', type: 'textarea' },
              { name: 'canonicalPath', label: 'Đường dẫn chuẩn', type: 'text' },
              { name: 'noIndex', label: 'Không cho công cụ tìm kiếm lập chỉ mục', type: 'checkbox', defaultValue: true },
            ],
          }],
        },
        {
          label: 'Vòng đời & kiểm tra',
          fields: [
            {
              name: 'status', type: 'select', required: true, index: true, defaultValue: 'draft', label: 'Trạng thái',
              options: productStatuses.map((value) => ({ label: productStatusLabel(value), value })),
              admin: { components: { Cell: '/components/ProductStatusBadge#ProductStatusCell' } },
              access: { create: canChangeProductStatus, update: canChangeProductStatus },
            },
            { name: 'publishedAt', type: 'date', required: false, index: true, label: 'Ngày xuất bản', access: { create: canChangeProductStatus, update: canChangeProductStatus } },
          ],
        },
        {
          label: 'Nguồn gốc',
          fields: [{
            name: 'sourceMetadata', type: 'group', required: true, label: 'Dữ liệu nguồn (chỉ đọc)', access: { update: () => false },
            admin: { readOnly: true, description: 'Dữ liệu nhập nguồn được bảo toàn để đối chiếu. Sản phẩm tạo tay được hệ thống tự điền khi lưu.' },
            fields: [
              { name: 'sourceType', type: 'text', required: true, validate: requiredAfterCreate },
              { name: 'legacySlug', type: 'text', required: true, index: true, validate: requiredAfterCreate },
              { name: 'sourceName', type: 'text', required: true, validate: requiredAfterCreate },
              { name: 'legacyDescription', type: 'textarea' },
              { name: 'sourceChecksum', type: 'text', required: true, validate: requiredAfterCreate },
              { name: 'canonicalSlugSha256', type: 'text', required: true, validate: requiredAfterCreate },
              { name: 'searchIndex', type: 'json' },
              { name: 'importedAt', type: 'date', required: true, validate: requiredAfterCreate },
              { name: 'legacyPublishedAt', type: 'text' },
            ],
          }],
        },
      ],
    },
    {
      name: 'productOperations',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/ProductEditorHeader#ProductEditorHeader',
        },
      },
    },
  ],
}
