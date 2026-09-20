import type { CollectionConfig } from 'payload'

import { auditHooks } from '../access/audit'
import { activeAuthenticated, canUpdateMedia, canUploadMedia } from '../access/collectionAccess'
import { deriveMediaMetadata, IMAGE_MIME_TYPES, mediaUploadDirectory, prepareMediaUpload } from '../lib/mediaUpload'
import { mediaPreviewEndpoint } from '../lib/mediaPreview'

const audit = auditHooks('media')

export const Media: CollectionConfig = {
  slug: 'media',
  endpoints: [mediaPreviewEndpoint],
  upload: {
    staticDir: mediaUploadDirectory,
    filesRequiredOnCreate: false, // Trusted imports retain existing metadata-only records.
    mimeTypes: IMAGE_MIME_TYPES,
    crop: false,
    focalPoint: false,
    pasteURL: false,
    hideRemoveFile: true,
  },
  access: { create: canUploadMedia, delete: canUpdateMedia, read: activeAuthenticated, update: canUpdateMedia },
  admin: {
    defaultColumns: ['storageKey', 'path', 'width', 'height', 'rightsStatus'],
    description: 'Quản lý tệp đa phương tiện, đường dẫn lưu trữ và tình trạng quyền sử dụng.',
    group: 'Nội dung',
    listSearchableFields: ['path', 'storageKey', 'contentSha256'],
    pagination: { defaultLimit: 25, limits: [25, 50, 100] },
    useAsTitle: 'storageKey',
  },
  labels: { singular: 'Tệp đa phương tiện', plural: 'Tệp đa phương tiện' },
  hooks: { afterChange: audit.afterChange, afterDelete: audit.afterDelete, beforeOperation: [prepareMediaUpload], beforeValidate: [deriveMediaMetadata] },
  fields: [
    { name: 'path', label: 'Đường dẫn tệp', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'storageKey', label: 'Mã lưu trữ', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'alt', label: 'Mô tả ảnh', type: 'text', required: true, admin: { description: 'Mô tả ngắn nội dung ảnh để hỗ trợ người dùng trình đọc màn hình.' } },
    { name: 'metadata', label: 'Thông tin tệp', type: 'json', required: true, admin: { readOnly: true } },
    { name: 'width', label: 'Chiều rộng', type: 'number', required: true, admin: { readOnly: true } },
    { name: 'height', label: 'Chiều cao', type: 'number', required: true, admin: { readOnly: true } },
    { name: 'contentSha256', label: 'Mã kiểm tra nội dung', type: 'text', required: true, index: true, admin: { readOnly: true } },
    {
      name: 'rightsStatus', label: 'Quyền sử dụng', type: 'select', required: true, index: true, defaultValue: 'pending',
      options: [{ value: 'pending', label: 'Chờ xác nhận' }, { value: 'cleared', label: 'Đã xác nhận' }, { value: 'restricted', label: 'Hạn chế' }, { value: 'expired', label: 'Hết hạn' }],
    },
    {
      name: 'variants', type: 'array', required: false,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'storageKey', type: 'text', required: true },
        { name: 'width', type: 'number', required: true },
        { name: 'height', type: 'number', required: true },
        { name: 'contentSha256', type: 'text', required: true },
      ],
    },
  ],
}
