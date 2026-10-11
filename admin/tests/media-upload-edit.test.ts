import assert from 'node:assert/strict'
import test from 'node:test'

import { altFromFileName, deriveMediaMetadata } from '../src/lib/mediaUpload.js'

const stored = {
  path: 'media/uploads/abc.jpg', storageKey: 'media/uploads/abc.jpg', filename: 'abc.jpg', width: 800, height: 600,
  contentSha256: 'a'.repeat(64), metadata: { source: 'local-upload' }, variants: [], url: '/api/media/file/abc.jpg',
}

test('saving an uploaded image from the admin form keeps the stored file facts instead of rejecting the save', () => {
  // The edit drawer posts every field back, including computed ones that never match the stored row.
  const data: Record<string, unknown> = { ...stored, url: 'http://localhost:3020/api/media/file/abc.jpg', thumbnailURL: null, alt: 'Cờ lè vạn năng', path: 'images/hacked.jpg' }
  const result = deriveMediaMetadata({ data, originalDoc: stored, req: { user: { id: 1 } } } as never) as Record<string, unknown>
  assert.equal(result.alt, 'Cờ lè vạn năng')
  assert.equal(result.path, 'media/uploads/abc.jpg')
  assert.equal(result.url, '/api/media/file/abc.jpg')
  assert.equal('thumbnailURL' in result, false)
})

test('an upload without a description gets one from the file name', () => {
  assert.equal(altFromFileName('may-khoan_pin.20V.jpg'), 'may khoan pin 20V')
  const data: Record<string, unknown> = { filename: 'uuid.jpg' }
  const req = { file: { data: Buffer.from('x'), mimetype: 'image/jpeg', size: 1 }, context: { originalUploadName: 'co-le-van-nang.jpg' } }
  const result = deriveMediaMetadata({ data, req } as never) as Record<string, unknown>
  assert.equal(result.alt, 'co le van nang')
  assert.equal(result.rightsStatus, 'pending')
})
