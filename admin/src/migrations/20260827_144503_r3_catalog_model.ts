import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_categories_status" AS ENUM('draft', 'active', 'archived');
  CREATE TYPE "public"."enum_media_rights_status" AS ENUM('pending', 'cleared', 'restricted', 'expired');
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'in_review', 'approved', 'published', 'archived');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_redirects_status_code" AS ENUM('301', '302', '307', '308');
  CREATE TYPE "public"."enum_catalog_snapshots_status" AS ENUM('draft', 'validated', 'superseded');
  CREATE TYPE "public"."enum_releases_status" AS ENUM('draft', 'ready', 'released', 'failed');
  CREATE TABLE "media_variants" (
	"_order" integer NOT NULL,
	"_parent_id" uuid NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"storage_key" varchar NOT NULL,
	"width" numeric NOT NULL,
	"height" numeric NOT NULL,
	"content_sha256" varchar NOT NULL
  );

  CREATE TABLE "products_packaging_cells" (
	"_order" integer NOT NULL,
	"_parent_id" varchar NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"value" varchar NOT NULL
  );

  CREATE TABLE "products_packaging" (
	"_order" integer NOT NULL,
	"_parent_id" uuid NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL
  );

  CREATE TABLE "products_attributes_values" (
	"_order" integer NOT NULL,
	"_parent_id" varchar NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"value" varchar NOT NULL
  );

  CREATE TABLE "products_attributes" (
	"_order" integer NOT NULL,
	"_parent_id" uuid NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"legacy_source_id" numeric,
	"name" varchar NOT NULL
  );

  CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_vi" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"status" "enum_pages_status" DEFAULT 'draft' NOT NULL,
	"body_vi" varchar,
	"seo" jsonb,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_path" varchar NOT NULL,
	"to_path" varchar NOT NULL,
	"status_code" "enum_redirects_status_code" DEFAULT '301' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "catalog_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" varchar NOT NULL,
	"schema_version" numeric NOT NULL,
	"checksum" varchar NOT NULL,
	"source_checksum" varchar NOT NULL,
	"status" "enum_catalog_snapshots_status" DEFAULT 'draft' NOT NULL,
	"counts" jsonb NOT NULL,
	"import_report" jsonb,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"status" "enum_releases_status" DEFAULT 'draft' NOT NULL,
	"catalog_snapshot_id" uuid NOT NULL,
	"notes" varchar,
	"released_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar NOT NULL,
	"actor_id" uuid,
	"entity_type" varchar NOT NULL,
	"entity_id" varchar NOT NULL,
	"occurred_at" timestamp(3) with time zone NOT NULL,
	"details" jsonb NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "categories" ADD COLUMN "legacy_source_id" numeric NOT NULL;
  ALTER TABLE "categories" ADD COLUMN "source_name" varchar NOT NULL;
  ALTER TABLE "categories" ADD COLUMN "status" "enum_categories_status" DEFAULT 'draft' NOT NULL;
  ALTER TABLE "categories" ADD COLUMN "parent_id" uuid;
  ALTER TABLE "categories" ADD COLUMN "sort_order" numeric DEFAULT 0 NOT NULL;
  ALTER TABLE "categories" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "categories" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "categories" ADD COLUMN "seo_canonical_path" varchar;
  ALTER TABLE "categories" ADD COLUMN "seo_no_index" boolean DEFAULT true;
  ALTER TABLE "media" ADD COLUMN "storage_key" varchar NOT NULL;
  ALTER TABLE "media" ADD COLUMN "metadata" jsonb NOT NULL;
  ALTER TABLE "media" ADD COLUMN "width" numeric NOT NULL;
  ALTER TABLE "media" ADD COLUMN "height" numeric NOT NULL;
  ALTER TABLE "media" ADD COLUMN "content_sha256" varchar NOT NULL;
  ALTER TABLE "media" ADD COLUMN "rights_status" "enum_media_rights_status" DEFAULT 'pending' NOT NULL;
  ALTER TABLE "products_specifications" ADD COLUMN "source_line" varchar;
  ALTER TABLE "products" ADD COLUMN "status" "enum_products_status" DEFAULT 'draft' NOT NULL;
  ALTER TABLE "products" ADD COLUMN "description_vi" varchar;
  ALTER TABLE "products" ADD COLUMN "published_at" timestamp(3) with time zone;
  ALTER TABLE "products" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "products" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "products" ADD COLUMN "seo_canonical_path" varchar;
  ALTER TABLE "products" ADD COLUMN "seo_no_index" boolean DEFAULT true;
  ALTER TABLE "products" ADD COLUMN "source_metadata_source_type" varchar NOT NULL;
  ALTER TABLE "products" ADD COLUMN "source_metadata_legacy_slug" varchar NOT NULL;
  ALTER TABLE "products" ADD COLUMN "source_metadata_source_name" varchar NOT NULL;
  ALTER TABLE "products" ADD COLUMN "source_metadata_legacy_description" varchar;
  ALTER TABLE "products" ADD COLUMN "source_metadata_source_checksum" varchar NOT NULL;
  ALTER TABLE "products" ADD COLUMN "source_metadata_canonical_slug_sha256" varchar NOT NULL;
  ALTER TABLE "products" ADD COLUMN "source_metadata_search_index" jsonb;
  ALTER TABLE "products" ADD COLUMN "source_metadata_imported_at" timestamp(3) with time zone NOT NULL;
  ALTER TABLE "products" ADD COLUMN "source_metadata_legacy_published_at" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pages_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "redirects_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "catalog_snapshots_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "releases_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "audit_events_id" uuid;
  ALTER TABLE "media_variants" ADD CONSTRAINT "media_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_packaging_cells" ADD CONSTRAINT "products_packaging_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_packaging"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_packaging" ADD CONSTRAINT "products_packaging_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_attributes_values" ADD CONSTRAINT "products_attributes_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_attributes" ADD CONSTRAINT "products_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_catalog_snapshot_id_catalog_snapshots_id_fk" FOREIGN KEY ("catalog_snapshot_id") REFERENCES "public"."catalog_snapshots"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_admins_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "media_variants_order_idx" ON "media_variants" USING btree ("_order");
  CREATE INDEX "media_variants_parent_id_idx" ON "media_variants" USING btree ("_parent_id");
  CREATE INDEX "products_packaging_cells_order_idx" ON "products_packaging_cells" USING btree ("_order");
  CREATE INDEX "products_packaging_cells_parent_id_idx" ON "products_packaging_cells" USING btree ("_parent_id");
  CREATE INDEX "products_packaging_order_idx" ON "products_packaging" USING btree ("_order");
  CREATE INDEX "products_packaging_parent_id_idx" ON "products_packaging" USING btree ("_parent_id");
  CREATE INDEX "products_attributes_values_order_idx" ON "products_attributes_values" USING btree ("_order");
  CREATE INDEX "products_attributes_values_parent_id_idx" ON "products_attributes_values" USING btree ("_parent_id");
  CREATE INDEX "products_attributes_order_idx" ON "products_attributes" USING btree ("_order");
  CREATE INDEX "products_attributes_parent_id_idx" ON "products_attributes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_status_idx" ON "pages" USING btree ("status");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE UNIQUE INDEX "redirects_from_path_idx" ON "redirects" USING btree ("from_path");
  CREATE INDEX "redirects_to_path_idx" ON "redirects" USING btree ("to_path");
  CREATE INDEX "redirects_active_idx" ON "redirects" USING btree ("active");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE UNIQUE INDEX "catalog_snapshots_snapshot_id_idx" ON "catalog_snapshots" USING btree ("snapshot_id");
  CREATE INDEX "catalog_snapshots_schema_version_idx" ON "catalog_snapshots" USING btree ("schema_version");
  CREATE UNIQUE INDEX "catalog_snapshots_checksum_idx" ON "catalog_snapshots" USING btree ("checksum");
  CREATE INDEX "catalog_snapshots_source_checksum_idx" ON "catalog_snapshots" USING btree ("source_checksum");
  CREATE INDEX "catalog_snapshots_status_idx" ON "catalog_snapshots" USING btree ("status");
  CREATE INDEX "catalog_snapshots_updated_at_idx" ON "catalog_snapshots" USING btree ("updated_at");
  CREATE INDEX "catalog_snapshots_created_at_idx" ON "catalog_snapshots" USING btree ("created_at");
  CREATE UNIQUE INDEX "releases_name_idx" ON "releases" USING btree ("name");
  CREATE INDEX "releases_status_idx" ON "releases" USING btree ("status");
  CREATE INDEX "releases_catalog_snapshot_idx" ON "releases" USING btree ("catalog_snapshot_id");
  CREATE INDEX "releases_released_at_idx" ON "releases" USING btree ("released_at");
  CREATE INDEX "releases_updated_at_idx" ON "releases" USING btree ("updated_at");
  CREATE INDEX "releases_created_at_idx" ON "releases" USING btree ("created_at");
  CREATE INDEX "audit_events_event_type_idx" ON "audit_events" USING btree ("event_type");
  CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_id");
  CREATE INDEX "audit_events_entity_type_idx" ON "audit_events" USING btree ("entity_type");
  CREATE INDEX "audit_events_entity_id_idx" ON "audit_events" USING btree ("entity_id");
  CREATE INDEX "audit_events_occurred_at_idx" ON "audit_events" USING btree ("occurred_at");
  CREATE INDEX "audit_events_updated_at_idx" ON "audit_events" USING btree ("updated_at");
  CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_catalog_snapshots_fk" FOREIGN KEY ("catalog_snapshots_id") REFERENCES "public"."catalog_snapshots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_releases_fk" FOREIGN KEY ("releases_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_events_fk" FOREIGN KEY ("audit_events_id") REFERENCES "public"."audit_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "categories_legacy_source_id_idx" ON "categories" USING btree ("legacy_source_id");
  CREATE INDEX "categories_status_idx" ON "categories" USING btree ("status");
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_sort_order_idx" ON "categories" USING btree ("sort_order");
  CREATE UNIQUE INDEX "media_storage_key_idx" ON "media" USING btree ("storage_key");
  CREATE INDEX "media_content_sha256_idx" ON "media" USING btree ("content_sha256");
  CREATE INDEX "media_rights_status_idx" ON "media" USING btree ("rights_status");
  CREATE INDEX "products_status_idx" ON "products" USING btree ("status");
  CREATE INDEX "products_published_at_idx" ON "products" USING btree ("published_at");
  CREATE INDEX "products_source_metadata_source_metadata_legacy_slug_idx" ON "products" USING btree ("source_metadata_legacy_slug");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_locked_documents_rels_catalog_snapshots_id_idx" ON "payload_locked_documents_rels" USING btree ("catalog_snapshots_id");
  CREATE INDEX "payload_locked_documents_rels_releases_id_idx" ON "payload_locked_documents_rels" USING btree ("releases_id");
  CREATE INDEX "payload_locked_documents_rels_audit_events_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media_variants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_packaging_cells" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_packaging" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_attributes_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_attributes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "redirects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "catalog_snapshots" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "releases" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audit_events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "media_variants" CASCADE;
  DROP TABLE "products_packaging_cells" CASCADE;
  DROP TABLE "products_packaging" CASCADE;
  DROP TABLE "products_attributes_values" CASCADE;
  DROP TABLE "products_attributes" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "catalog_snapshots" CASCADE;
  DROP TABLE "releases" CASCADE;
  DROP TABLE "audit_events" CASCADE;
  ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_categories_id_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pages_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_redirects_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_catalog_snapshots_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_releases_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audit_events_fk";

  DROP INDEX "categories_legacy_source_id_idx";
  DROP INDEX "categories_status_idx";
  DROP INDEX "categories_parent_idx";
  DROP INDEX "categories_sort_order_idx";
  DROP INDEX "media_storage_key_idx";
  DROP INDEX "media_content_sha256_idx";
  DROP INDEX "media_rights_status_idx";
  DROP INDEX "products_status_idx";
  DROP INDEX "products_published_at_idx";
  DROP INDEX "products_source_metadata_source_metadata_legacy_slug_idx";
  DROP INDEX "payload_locked_documents_rels_pages_id_idx";
  DROP INDEX "payload_locked_documents_rels_redirects_id_idx";
  DROP INDEX "payload_locked_documents_rels_catalog_snapshots_id_idx";
  DROP INDEX "payload_locked_documents_rels_releases_id_idx";
  DROP INDEX "payload_locked_documents_rels_audit_events_id_idx";
  ALTER TABLE "categories" DROP COLUMN "legacy_source_id";
  ALTER TABLE "categories" DROP COLUMN "source_name";
  ALTER TABLE "categories" DROP COLUMN "status";
  ALTER TABLE "categories" DROP COLUMN "parent_id";
  ALTER TABLE "categories" DROP COLUMN "sort_order";
  ALTER TABLE "categories" DROP COLUMN "seo_title";
  ALTER TABLE "categories" DROP COLUMN "seo_description";
  ALTER TABLE "categories" DROP COLUMN "seo_canonical_path";
  ALTER TABLE "categories" DROP COLUMN "seo_no_index";
  ALTER TABLE "media" DROP COLUMN "storage_key";
  ALTER TABLE "media" DROP COLUMN "metadata";
  ALTER TABLE "media" DROP COLUMN "width";
  ALTER TABLE "media" DROP COLUMN "height";
  ALTER TABLE "media" DROP COLUMN "content_sha256";
  ALTER TABLE "media" DROP COLUMN "rights_status";
  ALTER TABLE "products_specifications" DROP COLUMN "source_line";
  ALTER TABLE "products" DROP COLUMN "status";
  ALTER TABLE "products" DROP COLUMN "description_vi";
  ALTER TABLE "products" DROP COLUMN "published_at";
  ALTER TABLE "products" DROP COLUMN "seo_title";
  ALTER TABLE "products" DROP COLUMN "seo_description";
  ALTER TABLE "products" DROP COLUMN "seo_canonical_path";
  ALTER TABLE "products" DROP COLUMN "seo_no_index";
  ALTER TABLE "products" DROP COLUMN "source_metadata_source_type";
  ALTER TABLE "products" DROP COLUMN "source_metadata_legacy_slug";
  ALTER TABLE "products" DROP COLUMN "source_metadata_source_name";
  ALTER TABLE "products" DROP COLUMN "source_metadata_legacy_description";
  ALTER TABLE "products" DROP COLUMN "source_metadata_source_checksum";
  ALTER TABLE "products" DROP COLUMN "source_metadata_canonical_slug_sha256";
  ALTER TABLE "products" DROP COLUMN "source_metadata_search_index";
  ALTER TABLE "products" DROP COLUMN "source_metadata_imported_at";
  ALTER TABLE "products" DROP COLUMN "source_metadata_legacy_published_at";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "redirects_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "catalog_snapshots_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "releases_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "audit_events_id";
  DROP TYPE "public"."enum_categories_status";
  DROP TYPE "public"."enum_media_rights_status";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum_redirects_status_code";
  DROP TYPE "public"."enum_catalog_snapshots_status";
  DROP TYPE "public"."enum_releases_status";`)
}
