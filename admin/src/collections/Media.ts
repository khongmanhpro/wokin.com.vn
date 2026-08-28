import type { CollectionConfig } from 'payload'

import { auditHooks } from '../access/audit'
import { activeAuthenticated, canUpdateMedia, canUploadMedia } from '../access/collectionAccess'

const audit = auditHooks('media')

export const Media: CollectionConfig = {
  slug: 'media',
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
  hooks: { afterChange: audit.afterChange, afterDelete: audit.afterDelete },
  fields: [
    { name: 'path', type: 'text', required: true, unique: true, index: true },
    { name: 'storageKey', type: 'text', required: true, unique: true, index: true },
    { name: 'alt', type: 'text', required: true },
    { name: 'metadata', type: 'json', required: true },
    { name: 'width', type: 'number', required: true },
    { name: 'height', type: 'number', required: true },
    { name: 'contentSha256', type: 'text', required: true, index: true },
    {
      name: 'rightsStatus', type: 'select', required: true, index: true, defaultValue: 'pending',
      options: ['pending', 'cleared', 'restricted', 'expired'],
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
