import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_admins_role" AS ENUM('owner', 'admin', 'editor', 'seo_reviewer', 'media_manager', 'publisher', 'readonly');
  ALTER TABLE "audit_events" RENAME COLUMN "details" TO "metadata";
  ALTER TABLE "admins" ADD COLUMN "role" "enum_admins_role" DEFAULT 'readonly' NOT NULL;
  ALTER TABLE "admins" ADD COLUMN "active" boolean DEFAULT true NOT NULL;
  ALTER TABLE "audit_events" ADD COLUMN "request_id" varchar;
  ALTER TABLE "audit_events" ADD COLUMN "ip" varchar;
  ALTER TABLE "audit_events" ADD COLUMN "before" jsonb;
  ALTER TABLE "audit_events" ADD COLUMN "after" jsonb;
  CREATE INDEX "admins_role_idx" ON "admins" USING btree ("role");
  CREATE INDEX "admins_active_idx" ON "admins" USING btree ("active");
  CREATE INDEX "audit_events_request_id_idx" ON "audit_events" USING btree ("request_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "audit_events" RENAME COLUMN "metadata" TO "details";
  DROP INDEX "admins_role_idx";
  DROP INDEX "admins_active_idx";
  DROP INDEX "audit_events_request_id_idx";
  ALTER TABLE "admins" DROP COLUMN "role";
  ALTER TABLE "admins" DROP COLUMN "active";
  ALTER TABLE "audit_events" DROP COLUMN "request_id";
  ALTER TABLE "audit_events" DROP COLUMN "ip";
  ALTER TABLE "audit_events" DROP COLUMN "before";
  ALTER TABLE "audit_events" DROP COLUMN "after";
  DROP TYPE "public"."enum_admins_role";`)
}
