import type { CollectionConfig } from 'payload'
import { canReadAudit, deny, internalAuditCreate } from '../access/collectionAccess'

export const AuditEvents: CollectionConfig = {
  slug: 'audit-events',
  access: { create: internalAuditCreate, delete: deny, read: canReadAudit, update: deny },
  admin: {
    defaultColumns: ['eventType', 'actor', 'entityType', 'entityId', 'occurredAt', 'requestId'],
    description: 'Theo dõi các sự kiện kiểm toán phục vụ truy vết hoạt động quản trị.',
    group: 'Quản trị',
    listSearchableFields: ['eventType', 'entityType', 'entityId', 'requestId'],
    pagination: { defaultLimit: 25, limits: [25, 50, 100] },
    useAsTitle: 'eventType',
  },
  labels: { singular: 'Sự kiện kiểm toán', plural: 'Sự kiện kiểm toán' },
  fields: [
    { name: 'eventType', type: 'text', required: true, index: true },
    { name: 'actor', type: 'relationship', relationTo: 'admins', required: true, index: true },
    { name: 'entityType', type: 'text', required: true, index: true },
    { name: 'entityId', type: 'text', required: true, index: true },
    { name: 'occurredAt', type: 'date', required: true, index: true },
    { name: 'requestId', type: 'text', index: true },
    { name: 'ip', type: 'text' },
    { name: 'before', type: 'json' },
    { name: 'after', type: 'json' },
    { name: 'metadata', type: 'json', required: true, defaultValue: {} },
  ],
}
