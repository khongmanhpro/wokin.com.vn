import assert from 'node:assert/strict'
import test from 'node:test'
import type { CollectionConfig } from 'payload'

import { Admins } from '../src/collections/Admins.js'
import { AuditEvents } from '../src/collections/AuditEvents.js'
import { Categories } from '../src/collections/Categories.js'
import { ContactSubmissions } from '../src/collections/ContactSubmissions.js'
import { Media } from '../src/collections/Media.js'
import { Pages } from '../src/collections/Pages.js'
import { Redirects } from '../src/collections/Redirects.js'
import { ReviewRequests } from '../src/collections/ReviewRequests.js'

const collections: Array<{
  collection: CollectionConfig
  group: string
  labels: { singular: string; plural: string }
  defaultColumns: string[]
  listSearchableFields: string[]
}> = [
  { collection: Categories, group: 'Danh mục', labels: { singular: 'Danh mục', plural: 'Danh mục' }, defaultColumns: ['nameVi', 'slug', 'status', 'sortOrder'], listSearchableFields: ['slug'] },
  { collection: ContactSubmissions, group: 'Liên hệ', labels: { singular: 'Yêu cầu liên hệ', plural: 'Yêu cầu liên hệ' }, defaultColumns: ['fullName', 'phone', 'subject', 'status', 'submittedAt'], listSearchableFields: ['fullName', 'phone', 'email'] },
  { collection: Media, group: 'Nội dung', labels: { singular: 'Tệp đa phương tiện', plural: 'Tệp đa phương tiện' }, defaultColumns: ['storageKey', 'path', 'width', 'height', 'rightsStatus'], listSearchableFields: ['path', 'storageKey', 'contentSha256'] },
  { collection: Pages, group: 'Nội dung', labels: { singular: 'Trang', plural: 'Trang' }, defaultColumns: ['titleVi', 'slug', 'status'], listSearchableFields: ['slug'] },
  { collection: Redirects, group: 'Nội dung', labels: { singular: 'Chuyển hướng', plural: 'Chuyển hướng' }, defaultColumns: ['fromPath', 'toPath', 'statusCode', 'active'], listSearchableFields: ['fromPath', 'toPath'] },
  { collection: ReviewRequests, group: 'Danh mục', labels: { singular: 'Yêu cầu rà soát', plural: 'Yêu cầu rà soát' }, defaultColumns: ['product', 'requester', 'reviewer', 'state', 'resolvedAt'], listSearchableFields: ['product', 'requester', 'reviewer', 'state'] },
  { collection: Admins, group: 'Quản trị', labels: { singular: 'Quản trị viên', plural: 'Quản trị viên' }, defaultColumns: ['email', 'role', 'active'], listSearchableFields: ['email'] },
  { collection: AuditEvents, group: 'Quản trị', labels: { singular: 'Sự kiện kiểm toán', plural: 'Sự kiện kiểm toán' }, defaultColumns: ['eventType', 'actor', 'entityType', 'entityId', 'occurredAt', 'requestId'], listSearchableFields: ['eventType', 'entityType', 'entityId', 'requestId'] },
]

test('R5.4a configures operational list UX with native indexed search', () => {
  for (const { collection, group, labels, defaultColumns, listSearchableFields } of collections) {
    assert.deepEqual(collection.admin?.pagination, { defaultLimit: 25, limits: [25, 50, 100] }, collection.slug)
    assert.equal(collection.admin?.group, group, collection.slug)
    assert.deepEqual(collection.labels, labels, collection.slug)
    assert.ok(collection.admin?.description, `${collection.slug} requires a Vietnamese description`)
    assert.deepEqual(collection.admin?.defaultColumns, defaultColumns, collection.slug)
    assert.deepEqual(collection.admin?.listSearchableFields, listSearchableFields, collection.slug)
  }
})
