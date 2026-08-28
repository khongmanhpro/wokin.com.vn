import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Integrity-only migration: no data mutation.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "review_requests" DROP CONSTRAINT "review_requests_product_id_products_id_fk";
    ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
    ALTER TABLE "review_requests" DROP CONSTRAINT "review_requests_requester_id_admins_id_fk";
    ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_requester_id_admins_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;
    ALTER TABLE "review_requests" DROP CONSTRAINT "review_requests_reviewer_id_admins_id_fk";
    ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_reviewer_id_admins_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "review_requests" DROP CONSTRAINT "review_requests_product_id_products_id_fk";
    ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "review_requests" DROP CONSTRAINT "review_requests_requester_id_admins_id_fk";
    ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_requester_id_admins_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "review_requests" DROP CONSTRAINT "review_requests_reviewer_id_admins_id_fk";
    ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_reviewer_id_admins_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
  `)
}
