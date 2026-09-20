import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { APIError, type CollectionBeforeOperationHook, type CollectionBeforeValidateHook } from 'payload'
import sharp from 'sharp'

import { hasCapability } from '../access/hasCapability'

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_IMAGE_PIXELS = 40_000_000
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const mediaUploadDirectory = process.env.MEDIA_UPLOAD_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../media')

export async function normalizeUploadedImage(data: Buffer, mimetype: string) {
  if (!IMAGE_MIME_TYPES.includes(mimetype)) throw new APIError('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.', 400)
  if (!data.length || data.length > MAX_IMAGE_BYTES) throw new APIError('Ảnh phải có dung lượng lớn hơn 0 và không vượt quá 10 MB.', 400)
  try {
    const image = sharp(data, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'warning' })
    const metadata = await image.metadata()
    const formats: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
    if (!metadata.format || formats[metadata.format] !== mimetype || (metadata.pages ?? 1) > 1) throw new Error('format')
    // Decode and re-encode: reject corrupt images and strip embedded metadata before persistence.
    const normalized = await image.rotate().toBuffer()
    if (normalized.length > MAX_IMAGE_BYTES) throw new Error('size')
    return { buffer: normalized, extension: metadata.format === 'jpeg' ? 'jpg' : metadata.format }
  } catch {
    throw new APIError('Ảnh không hợp lệ: kiểm tra định dạng, dữ liệu ảnh, tối đa 40 triệu điểm ảnh và không dùng ảnh động.', 400)
  }
}

export const prepareMediaUpload: CollectionBeforeOperationHook = async ({ args, operation }) => {
  if (operation !== 'create' && operation !== 'update') return args
  const { req } = args
  if (req.file) {
    if (process.env.STORAGE_ADAPTER !== 'local') throw new APIError('Chưa cấu hình nơi lưu ảnh. Vui lòng liên hệ quản trị viên.', 503)
    if (!args.overrideAccess && !hasCapability(req.user, operation === 'create' ? 'media.upload' : 'media.update')) throw new APIError('Bạn không có quyền tải hoặc thay thế ảnh.', 403)
    if (req.file.size > MAX_IMAGE_BYTES) throw new APIError('Ảnh không được vượt quá 10 MB.', 400)
    const buffer = req.file.tempFilePath ? await readFile(req.file.tempFilePath) : req.file.data
    const normalized = await normalizeUploadedImage(buffer, req.file.mimetype)
    req.file = { data: normalized.buffer, mimetype: req.file.mimetype, name: `${randomUUID()}.${normalized.extension}`, size: normalized.buffer.length }
  } else if (operation === 'create' && req.user) {
    throw new APIError('Vui lòng chọn tệp ảnh trước khi lưu.', 400)
  }
  return args
}

export const deriveMediaMetadata: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  if (!data) return data
  if (req.file) {
    data.path = `media/uploads/${data.filename}`
    data.storageKey = data.path
    data.contentSha256 = createHash('sha256').update(req.file.data).digest('hex')
    data.metadata = { source: 'local-upload', mimeType: req.file.mimetype, bytes: req.file.size }
    data.rightsStatus = 'pending'
    data.variants = []
  } else if (req.user && originalDoc) {
    const derived = ['path', 'storageKey', 'contentSha256', 'metadata', 'width', 'height', 'filename', 'mimeType', 'filesize', 'url', 'thumbnailURL', 'variants']
    for (const key of derived) {
      if (data[key] !== undefined && JSON.stringify(data[key]) !== JSON.stringify(originalDoc[key])) throw new APIError('Thông tin tệp được hệ thống quản lý; hãy tải ảnh mới để thay thế.', 400)
    }
  }
  return data
}
