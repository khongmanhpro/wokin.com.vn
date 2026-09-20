import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_contact_submissions_subject" AS ENUM('product', 'quote', 'distribution', 'other');
    CREATE TYPE "public"."enum_contact_submissions_status" AS ENUM('new', 'in_progress', 'resolved', 'spam');
    CREATE TABLE "contact_submissions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "full_name" varchar NOT NULL,
      "phone" varchar NOT NULL,
      "email" varchar,
      "subject" "enum_contact_submissions_subject" NOT NULL,
      "message" varchar NOT NULL,
      "consent" boolean DEFAULT true NOT NULL,
      "status" "enum_contact_submissions_status" DEFAULT 'new' NOT NULL,
      "notes" varchar,
      "source_url" varchar,
      "submitted_at" timestamp(3) with time zone NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX "contact_submissions_full_name_idx" ON "contact_submissions" USING btree ("full_name");
    CREATE INDEX "contact_submissions_phone_idx" ON "contact_submissions" USING btree ("phone");
    CREATE INDEX "contact_submissions_email_idx" ON "contact_submissions" USING btree ("email");
    CREATE INDEX "contact_submissions_subject_idx" ON "contact_submissions" USING btree ("subject");
    CREATE INDEX "contact_submissions_status_idx" ON "contact_submissions" USING btree ("status");
    CREATE INDEX "contact_submissions_submitted_at_idx" ON "contact_submissions" USING btree ("submitted_at");
    CREATE INDEX "contact_submissions_updated_at_idx" ON "contact_submissions" USING btree ("updated_at");
    CREATE INDEX "contact_submissions_created_at_idx" ON "contact_submissions" USING btree ("created_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "contact_submissions_full_name_idx";
    DROP INDEX "contact_submissions_phone_idx";
    DROP INDEX "contact_submissions_email_idx";
    DROP INDEX "contact_submissions_subject_idx";
    DROP INDEX "contact_submissions_status_idx";
    DROP INDEX "contact_submissions_submitted_at_idx";
    DROP INDEX "contact_submissions_updated_at_idx";
    DROP INDEX "contact_submissions_created_at_idx";
    DROP TABLE "contact_submissions";
    DROP TYPE "public"."enum_contact_submissions_subject";
    DROP TYPE "public"."enum_contact_submissions_status";
  `)
}
