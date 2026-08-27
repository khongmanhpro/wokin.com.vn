import type { CollectionConfig } from 'payload'
import { auditHooks } from '../access/audit'
import { activeAuthenticated, canManageRedirects } from '../access/collectionAccess'

const audit = auditHooks('redirects')

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  access: { create: canManageRedirects, delete: canManageRedirects, read: activeAuthenticated, update: canManageRedirects },
  admin: { group: 'Content', useAsTitle: 'fromPath' },
  hooks: { afterChange: audit.afterChange, afterDelete: audit.afterDelete },
  fields: [
    { name: 'fromPath', type: 'text', required: true, unique: true, index: true },
    { name: 'toPath', type: 'text', required: true, index: true },
    { name: 'statusCode', type: 'select', required: true, defaultValue: '301', options: ['301', '302', '307', '308'] },
    { name: 'active', type: 'checkbox', required: true, defaultValue: true, index: true },
  ],
}
