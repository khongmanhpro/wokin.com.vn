import type { CollectionConfig } from 'payload'
import { auditHooks } from '../access/audit'
import { activeAuthenticated, canApproveRelease, canCreateRelease } from '../access/collectionAccess'

const audit = auditHooks('releases')

export const Releases: CollectionConfig = {
  slug: 'releases',
  access: { create: canCreateRelease, delete: canApproveRelease, read: activeAuthenticated, update: canApproveRelease },
  admin: { group: 'Publishing foundation', useAsTitle: 'name' },
  hooks: { afterChange: audit.afterChange, afterDelete: audit.afterDelete },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true, index: true },
    { name: 'status', type: 'select', required: true, index: true, defaultValue: 'draft', options: ['draft', 'ready', 'released', 'failed'] },
    { name: 'catalogSnapshot', type: 'relationship', relationTo: 'catalog-snapshots', required: true, index: true },
    { name: 'notes', type: 'textarea' },
    { name: 'releasedAt', type: 'date', index: true },
  ],
}
