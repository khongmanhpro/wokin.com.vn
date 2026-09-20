import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import { Media } from '../src/collections/Media.js'
import { canUpdateMedia } from '../src/access/collectionAccess.js'
import { getMediaLibraryQuery, mediaLibraryState, mediaPreviewURL, mediaRightsUpdateRequest } from '../src/lib/mediaCategoryWorkspace.js'
import { adminComponents } from '../src/payload.config.js'

test('UX-6 builds API-safe media filters for rights, missing alt, duplicate and orphan triage', () => {
  assert.deepEqual(getMediaLibraryQuery({ query: 'sha-256', rights: 'pending', missingAlt: true, orphan: true, duplicate: true }), {
    where: {
      and: [
        { or: [{ path: { contains: 'sha-256' } }, { storageKey: { contains: 'sha-256' } }, { contentSha256: { contains: 'sha-256' } }] },
        { rightsStatus: { equals: 'pending' } },
        { or: [{ alt: { equals: '' } }, { alt: { exists: false } }] },
      ],
    },
  })
  assert.deepEqual(mediaLibraryState({ active: true, role: 'media_manager' }), { canUpdateRights: true, importManaged: true })
  assert.deepEqual(mediaLibraryState({ active: true, role: 'editor' }), { canUpdateRights: false, importManaged: true })
  assert.equal(mediaPreviewURL('images/products/AA-01/photo.jpg'), '/images/products/AA-01/photo.jpg')
  assert.equal(mediaPreviewURL('/images/products/AA-01/photo.jpg'), '/images/products/AA-01/photo.jpg')
  assert.deepEqual(mediaRightsUpdateRequest('media-1', 'cleared'), {
    url: '/api/media/media-1',
    init: { method: 'PATCH', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rightsStatus: 'cleared' }) },
  })
})

test('UX-6 preserves server-side media RBAC and states that this collection is import-managed', () => {
  assert.equal(canUpdateMedia({ req: { user: { active: true, role: 'media_manager' } } } as never), true)
  assert.equal(canUpdateMedia({ req: { user: { active: true, role: 'editor' } } } as never), false)
  assert.equal(typeof Media.upload, 'object')
  assert.deepEqual(adminComponents.views?.mediaLibrary, {
    Component: '/components/MediaLibrary#MediaLibrary',
    path: '/media-library',
  })
})

test('media client view obtains live identity from Payload auth context, not server-only req props', async () => {
  const source = await readFile(new URL('../src/components/MediaLibrary.tsx', import.meta.url), 'utf8')
  assert.match(source, /const \{ user \} = useAuth\(\)/)
  assert.match(source, /mediaLibraryState\(actor\)/)
  for (const role of ['owner', 'admin', 'media_manager']) assert.equal(mediaLibraryState({ active: true, role }).canUpdateRights, true)
  for (const role of ['readonly', 'editor']) assert.equal(mediaLibraryState({ active: true, role }).canUpdateRights, false)
})
