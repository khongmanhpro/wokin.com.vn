import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_review_requests_state" AS ENUM('open', 'resolved');
  ALTER TYPE "public"."enum_products_status" ADD VALUE 'changes_requested' BEFORE 'approved';
  CREATE TABLE "review_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"comment" varchar NOT NULL,
	"state" "enum_review_requests_state" DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp(3) with time zone,
	"resolved_by_id" uuid,
	"resolution" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "review_requests_id" uuid;
  ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_requester_id_admins_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_reviewer_id_admins_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_resolved_by_id_admins_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "review_requests_product_idx" ON "review_requests" USING btree ("product_id");
  CREATE INDEX "review_requests_requester_idx" ON "review_requests" USING btree ("requester_id");
  CREATE INDEX "review_requests_reviewer_idx" ON "review_requests" USING btree ("reviewer_id");
  CREATE INDEX "review_requests_state_idx" ON "review_requests" USING btree ("state");
  CREATE INDEX "review_requests_resolved_at_idx" ON "review_requests" USING btree ("resolved_at");
  CREATE INDEX "review_requests_resolved_by_idx" ON "review_requests" USING btree ("resolved_by_id");
  CREATE INDEX "review_requests_updated_at_idx" ON "review_requests" USING btree ("updated_at");
  CREATE INDEX "review_requests_created_at_idx" ON "review_requests" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_review_requests_fk" FOREIGN KEY ("review_requests_id") REFERENCES "public"."review_requests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_review_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("review_requests_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "review_requests" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "review_requests" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_review_requests_fk";

  ALTER TABLE "products" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'draft'::text;
  DROP TYPE "public"."enum_products_status";
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'in_review', 'approved', 'published', 'archived');
  ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."enum_products_status";
  ALTER TABLE "products" ALTER COLUMN "status" SET DATA TYPE "public"."enum_products_status" USING "status"::"public"."enum_products_status";
  DROP INDEX "payload_locked_documents_rels_review_requests_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "review_requests_id";
  DROP TYPE "public"."enum_review_requests_state";`)
}
