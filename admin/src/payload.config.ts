import { postgresAdapter } from '@payloadcms/db-postgres'
import { vi } from '@payloadcms/translations/languages/vi'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig, type Config } from 'payload'

import { Admins } from './collections/Admins'
import { AuditEvents } from './collections/AuditEvents'
import { CatalogSnapshots } from './collections/CatalogSnapshots'
import { Categories } from './collections/Categories'
import { ContactSubmissions } from './collections/ContactSubmissions'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Products } from './collections/Products'
import { Redirects } from './collections/Redirects'
import { Releases } from './collections/Releases'
import { ReviewRequests } from './collections/ReviewRequests'
import { MAX_IMAGE_BYTES } from './lib/mediaUpload'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const publicServerURL = process.env.PAYLOAD_PUBLIC_SERVER_URL
const contactOrigins = (process.env.CONTACT_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/u, ''))
  .filter(Boolean)
const corsOrigins = [...new Set([publicServerURL, ...contactOrigins].filter((origin): origin is string => Boolean(origin)))]

export const adminComponents = {
  Nav: '/components/WokinNav#WokinNav',
  beforeLogin: ['/components/WokinBootstrapNotice#WokinBootstrapNotice'],
  views: {
    dashboard: { Component: '/components/WokinDashboardIntro#WokinDashboardIntro' },
    releaseCenter: { Component: '/components/ReleaseCenter#ReleaseCenter', path: '/release-center' },
    mediaLibrary: { Component: '/components/MediaLibrary#MediaLibrary', path: '/media-library' },
    categoryWorkspace: { Component: '/components/CategoryTree#CategoryTree', path: '/category-workspace' },
  },
  graphics: {
    Icon: '/components/WokinBrand#WokinIcon',
    Logo: '/components/WokinBrand#WokinLogo',
  },
} satisfies NonNullable<NonNullable<Config['admin']>['components']>

export default buildConfig({
  i18n: { fallbackLanguage: 'vi', supportedLanguages: { vi } },
  upload: { abortOnLimit: true, limits: { fileSize: MAX_IMAGE_BYTES }, responseOnLimit: 'Ảnh không được vượt quá 10 MB.' },
  admin: {
    components: adminComponents,
      // Payload 3.88's `Nav` slot replaces native collection navigation.
      // Appending a separate menu would render two competing navigations.
    user: Admins.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: '— WOKIN Admin',
    },
  },
  collections: [Admins, Categories, Media, Products, ReviewRequests, Pages, Redirects, CatalogSnapshots, Releases, AuditEvents, ContactSubmissions],
  cors: corsOrigins,
  csrf: corsOrigins,
  db: postgresAdapter({
    allowIDOnCreate: true,
    idType: 'uuid',
    migrationDir: path.resolve(dirname, 'migrations'),
    pool: { connectionString: process.env.DATABASE_URL },
    // Every database is migration-managed. Never let a dev/import process infer and push schema changes.
    push: false,
  }),
  graphQL: { disable: true },
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: publicServerURL,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
