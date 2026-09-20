import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" ADD COLUMN "url" varchar;
    ALTER TABLE "media" ADD COLUMN "thumbnail_u_r_l" varchar;
    ALTER TABLE "media" ADD COLUMN "filename" varchar;
    ALTER TABLE "media" ADD COLUMN "mime_type" varchar;
    ALTER TABLE "media" ADD COLUMN "filesize" numeric;
    CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "media_filename_idx";
    ALTER TABLE "media" DROP COLUMN "url", DROP COLUMN "thumbnail_u_r_l", DROP COLUMN "filename", DROP COLUMN "mime_type", DROP COLUMN "filesize";
  `)
}
