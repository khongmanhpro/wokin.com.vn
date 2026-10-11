import type { CollectionConfig } from 'payload'
import { auditHooks } from '../access/audit'
import { activeAuthenticated, canManageRedirects } from '../access/collectionAccess'
import { enforceRedirectPolicy } from '../access/redirectPolicy'

const audit = auditHooks('redirects')

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  access: { create: canManageRedirects, delete: canManageRedirects, read: activeAuthenticated, update: canManageRedirects },
  admin: {
    defaultColumns: ['fromPath', 'toPath', 'statusCode', 'active'],
    description: 'Quản lý các đường dẫn chuyển hướng và trạng thái kích hoạt của chúng.',
    group: 'Nội dung',
    listSearchableFields: ['fromPath', 'toPath'],
    pagination: { defaultLimit: 25, limits: [25, 50, 100] },
    useAsTitle: 'fromPath',
  },
  labels: { singular: 'Chuyển hướng', plural: 'Chuyển hướng' },
  hooks: { afterChange: audit.afterChange, afterDelete: audit.afterDelete, beforeChange: [enforceRedirectPolicy] },
  fields: [
    { name: 'fromPath', type: 'text', required: true, unique: true, index: true },
    { name: 'toPath', type: 'text', required: true, index: true },
    { name: 'statusCode', type: 'select', required: true, defaultValue: '301', options: ['301', '302', '307', '308'] },
    { name: 'active', type: 'checkbox', required: true, defaultValue: true, index: true },
  ],
}
