import type { CollectionConfig } from 'payload'
import { auditHooks } from '../access/audit'
import { activeAuthenticated, canApproveRelease, canCreateRelease } from '../access/collectionAccess'

const audit = auditHooks('catalog-snapshots')

export const CatalogSnapshots: CollectionConfig = {
  slug: 'catalog-snapshots',
  access: { create: canCreateRelease, delete: canApproveRelease, read: activeAuthenticated, update: canApproveRelease },
  admin: { group: 'Publishing foundation', useAsTitle: 'snapshotId' },
  hooks: { afterChange: audit.afterChange, afterDelete: audit.afterDelete },
  fields: [
    { name: 'snapshotId', type: 'text', required: true, unique: true, index: true },
    { name: 'schemaVersion', type: 'number', required: true, index: true },
    { name: 'checksum', type: 'text', required: true, unique: true, index: true },
    { name: 'sourceChecksum', type: 'text', required: true, index: true },
    { name: 'status', type: 'select', required: true, index: true, defaultValue: 'draft', options: ['draft', 'validated', 'superseded'] },
    { name: 'counts', type: 'json', required: true },
    { name: 'importReport', type: 'json' },
  ],
}
