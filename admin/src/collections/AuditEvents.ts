import type { CollectionConfig } from 'payload'
import { canReadAudit, deny, internalAuditCreate } from '../access/collectionAccess'

export const AuditEvents: CollectionConfig = {
  slug: 'audit-events',
  access: { create: internalAuditCreate, delete: deny, read: canReadAudit, update: deny },
  admin: { group: 'Administration', useAsTitle: 'eventType' },
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
