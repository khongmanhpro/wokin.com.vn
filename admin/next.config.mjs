import { withPayload } from '@payloadcms/next/withPayload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  // Repo root, not admin/: the admin shares contracts/catalog-snapshot-validator.mjs with the website build,
  // and the "Xuất bản website" export imports it at runtime.
  outputFileTracingRoot: path.resolve(dirname, '..'),
  turbopack: {
    root: path.resolve(dirname, '..'),
  },
}

export default withPayload(nextConfig)
