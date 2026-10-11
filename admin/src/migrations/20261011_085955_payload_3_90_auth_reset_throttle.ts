import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Payload 3.90.0 throttles forgot-password requests and stores the last request
// time on every auth collection (`resetPasswordRequestedAt`). This is the only
// schema change the 3.89 -> 3.90.2 upgrade needs.
//
// The generator also emitted `DROP NOT NULL` for the products/_products_v source
// identity columns. That drift comes from the `admin.condition` added to those
// fields in 955821f (the drizzle notNull rule is identical in 3.89 and 3.90), not
// from this upgrade, so it is intentionally left out and the snapshot keeps the
// columns NOT NULL to match the database.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "admins" ADD COLUMN "reset_password_requested_at" timestamp(3) with time zone;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "admins" DROP COLUMN "reset_password_requested_at";`)
}
