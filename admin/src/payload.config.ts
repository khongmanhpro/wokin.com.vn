import { postgresAdapter } from '@payloadcms/db-postgres'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'

import { Admins } from './collections/Admins'
import { AuditEvents } from './collections/AuditEvents'
import { CatalogSnapshots } from './collections/CatalogSnapshots'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Products } from './collections/Products'
import { Redirects } from './collections/Redirects'
import { Releases } from './collections/Releases'
import { ReviewRequests } from './collections/ReviewRequests'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const publicServerURL = process.env.PAYLOAD_PUBLIC_SERVER_URL

export default buildConfig({
  admin: {
    components: {
      afterNavLinks: ['/components/WokinNav#WokinNav'],
      beforeDashboard: ['/components/WokinDashboardIntro#WokinDashboardIntro'],
      graphics: {
        Icon: '/components/WokinBrand#WokinIcon',
        Logo: '/components/WokinBrand#WokinLogo',
      },
    },
    user: Admins.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: '— WOKIN Admin',
    },
  },
  collections: [Admins, Categories, Media, Products, ReviewRequests, Pages, Redirects, CatalogSnapshots, Releases, AuditEvents],
  cors: publicServerURL ? [publicServerURL] : [],
  csrf: publicServerURL ? [publicServerURL] : [],
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
