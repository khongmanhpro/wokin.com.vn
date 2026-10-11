import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// WordPress-parity features: revision history (products, categories, pages, globals), trash,
// media folders, Lexical page body, and the site-settings / navigation globals.
// Hand-assembled: the generated diff also replayed the hand-written 20260916/20260920/20261011
// migrations (media upload columns, contact submissions), which are excluded here.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM "pages") THEN
      RAISE EXCEPTION 'pages must be empty: body_vi changes from plain text to Lexical JSON and the old status/seo columns are dropped';
    END IF;
  END $$;
  DROP INDEX IF EXISTS "pages_status_idx";
  ALTER TABLE "pages" DROP COLUMN "status";
  ALTER TABLE "pages" DROP COLUMN "seo";
  DROP TYPE "public"."enum_pages_status";
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  ALTER TABLE "pages" ALTER COLUMN "title_vi" DROP NOT NULL;
  ALTER TABLE "pages" ALTER COLUMN "slug" DROP NOT NULL;
  ALTER TABLE "pages" ALTER COLUMN "body_vi" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages" ADD COLUMN "excerpt_vi" varchar;
  ALTER TABLE "pages" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "pages" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "pages" ADD COLUMN "seo_canonical_path" varchar;
  ALTER TABLE "pages" ADD COLUMN "seo_no_index" boolean DEFAULT false;
  ALTER TABLE "pages" ADD COLUMN "hero_image_id" uuid;
  ALTER TABLE "pages" ADD COLUMN "deleted_at" timestamp(3) with time zone;
  ALTER TABLE "pages" ADD COLUMN "_status" "enum_pages_status" DEFAULT 'draft';
  ALTER TABLE "pages" ADD CONSTRAINT "pages_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_hero_image_idx" ON "pages" USING btree ("hero_image_id");
  CREATE INDEX "pages_deleted_at_idx" ON "pages" USING btree ("deleted_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE TYPE "public"."enum__categories_v_version_status" AS ENUM('draft', 'active', 'archived');
  CREATE TYPE "public"."enum__products_v_version_status" AS ENUM('draft', 'in_review', 'changes_requested', 'approved', 'published', 'archived');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_payload_folders_folder_type" AS ENUM('media');
  CREATE TABLE "_categories_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_legacy_source_id" numeric NOT NULL,
  	"version_name_vi" varchar NOT NULL,
  	"version_source_name" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_status" "enum__categories_v_version_status" DEFAULT 'draft' NOT NULL,
  	"version_parent_id" uuid,
  	"version_sort_order" numeric DEFAULT 0 NOT NULL,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_canonical_path" varchar,
  	"version_seo_no_index" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE TABLE "_products_v_version_specifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL,
  	"unit" varchar,
  	"source_line" varchar,
  	"_uuid" varchar
  );
  CREATE TABLE "_products_v_version_packaging_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  CREATE TABLE "_products_v_version_packaging" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_uuid" varchar
  );
  CREATE TABLE "_products_v_version_attributes_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"value" varchar NOT NULL,
  	"_uuid" varchar
  );
  CREATE TABLE "_products_v_version_attributes" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"legacy_source_id" numeric,
  	"name" varchar NOT NULL,
  	"_uuid" varchar
  );
  CREATE TABLE "_products_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_legacy_source_id" numeric NOT NULL,
  	"version_sku" varchar,
  	"version_name_vi" varchar NOT NULL,
  	"version_slug_vi" varchar NOT NULL,
  	"version_description_vi" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_canonical_path" varchar,
  	"version_seo_no_index" boolean DEFAULT true,
  	"version_status" "enum__products_v_version_status" DEFAULT 'draft' NOT NULL,
  	"version_published_at" timestamp(3) with time zone,
  	"version_source_metadata_source_type" varchar NOT NULL,
  	"version_source_metadata_legacy_slug" varchar NOT NULL,
  	"version_source_metadata_source_name" varchar NOT NULL,
  	"version_source_metadata_legacy_description" varchar,
  	"version_source_metadata_source_checksum" varchar NOT NULL,
  	"version_source_metadata_canonical_slug_sha256" varchar NOT NULL,
  	"version_source_metadata_search_index" jsonb,
  	"version_source_metadata_imported_at" timestamp(3) with time zone NOT NULL,
  	"version_source_metadata_legacy_published_at" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE TABLE "_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" uuid,
  	"media_id" uuid
  );
  CREATE TABLE "_pages_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_title_vi" varchar,
  	"version_excerpt_vi" varchar,
  	"version_body_vi" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_canonical_path" varchar,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version_slug" varchar,
  	"version_hero_image_id" uuid,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  CREATE TABLE "payload_folders_folder_type" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "enum_payload_folders_folder_type",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  CREATE TABLE "payload_folders" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"folder_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE TABLE "site_settings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"site_name" varchar DEFAULT 'WOKIN TOOLS Việt Nam' NOT NULL,
  	"legal_name" varchar DEFAULT 'CÔNG TY CỔ PHẦN THIẾT BỊ CÔNG NGHIỆP WORKMAN' NOT NULL,
  	"tax_code" varchar,
  	"address" varchar,
  	"hotline" varchar,
  	"email" varchar,
  	"zalo_url" varchar,
  	"social_facebook" varchar,
  	"social_youtube" varchar,
  	"social_tiktok" varchar,
  	"default_title" varchar,
  	"default_description" varchar,
  	"og_image_id" uuid,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  CREATE TABLE "_site_settings_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"version_site_name" varchar DEFAULT 'WOKIN TOOLS Việt Nam' NOT NULL,
  	"version_legal_name" varchar DEFAULT 'CÔNG TY CỔ PHẦN THIẾT BỊ CÔNG NGHIỆP WORKMAN' NOT NULL,
  	"version_tax_code" varchar,
  	"version_address" varchar,
  	"version_hotline" varchar,
  	"version_email" varchar,
  	"version_zalo_url" varchar,
  	"version_social_facebook" varchar,
  	"version_social_youtube" varchar,
  	"version_social_tiktok" varchar,
  	"version_default_title" varchar,
  	"version_default_description" varchar,
  	"version_og_image_id" uuid,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE TABLE "navigation_header_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"new_tab" boolean DEFAULT false
  );
  CREATE TABLE "navigation_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"new_tab" boolean DEFAULT false
  );
  CREATE TABLE "navigation_footer" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"new_tab" boolean DEFAULT false
  );
  CREATE TABLE "navigation" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  CREATE TABLE "_navigation_v_version_header_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  CREATE TABLE "_navigation_v_version_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  CREATE TABLE "_navigation_v_version_footer" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  CREATE TABLE "_navigation_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  ALTER TABLE "categories" ADD COLUMN "deleted_at" timestamp(3) with time zone;
  ALTER TABLE "media" ADD COLUMN "folder_id" uuid;
  ALTER TABLE "media" ADD COLUMN "deleted_at" timestamp(3) with time zone;
  ALTER TABLE "products" ADD COLUMN "deleted_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payload_folders_id" uuid;
  ALTER TABLE "_categories_v" ADD CONSTRAINT "_categories_v_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_categories_v" ADD CONSTRAINT "_categories_v_version_parent_id_categories_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_specifications" ADD CONSTRAINT "_products_v_version_specifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_packaging_cells" ADD CONSTRAINT "_products_v_version_packaging_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_version_packaging"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_packaging" ADD CONSTRAINT "_products_v_version_packaging_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_attributes_values" ADD CONSTRAINT "_products_v_version_attributes_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_version_attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_attributes" ADD CONSTRAINT "_products_v_version_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_folders_folder_type" ADD CONSTRAINT "payload_folders_folder_type_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_folders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_folders" ADD CONSTRAINT "payload_folders_folder_id_payload_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."payload_folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_og_image_id_media_id_fk" FOREIGN KEY ("version_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_header_children" ADD CONSTRAINT "navigation_header_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_header" ADD CONSTRAINT "navigation_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer" ADD CONSTRAINT "navigation_footer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_header_children" ADD CONSTRAINT "_navigation_v_version_header_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_header" ADD CONSTRAINT "_navigation_v_version_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_footer" ADD CONSTRAINT "_navigation_v_version_footer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "_categories_v_parent_idx" ON "_categories_v" USING btree ("parent_id");
  CREATE INDEX "_categories_v_version_version_legacy_source_id_idx" ON "_categories_v" USING btree ("version_legacy_source_id");
  CREATE INDEX "_categories_v_version_version_slug_idx" ON "_categories_v" USING btree ("version_slug");
  CREATE INDEX "_categories_v_version_version_status_idx" ON "_categories_v" USING btree ("version_status");
  CREATE INDEX "_categories_v_version_version_parent_idx" ON "_categories_v" USING btree ("version_parent_id");
  CREATE INDEX "_categories_v_version_version_sort_order_idx" ON "_categories_v" USING btree ("version_sort_order");
  CREATE INDEX "_categories_v_version_version_updated_at_idx" ON "_categories_v" USING btree ("version_updated_at");
  CREATE INDEX "_categories_v_version_version_created_at_idx" ON "_categories_v" USING btree ("version_created_at");
  CREATE INDEX "_categories_v_version_version_deleted_at_idx" ON "_categories_v" USING btree ("version_deleted_at");
  CREATE INDEX "_categories_v_created_at_idx" ON "_categories_v" USING btree ("created_at");
  CREATE INDEX "_categories_v_updated_at_idx" ON "_categories_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_version_specifications_order_idx" ON "_products_v_version_specifications" USING btree ("_order");
  CREATE INDEX "_products_v_version_specifications_parent_id_idx" ON "_products_v_version_specifications" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_packaging_cells_order_idx" ON "_products_v_version_packaging_cells" USING btree ("_order");
  CREATE INDEX "_products_v_version_packaging_cells_parent_id_idx" ON "_products_v_version_packaging_cells" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_packaging_order_idx" ON "_products_v_version_packaging" USING btree ("_order");
  CREATE INDEX "_products_v_version_packaging_parent_id_idx" ON "_products_v_version_packaging" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_attributes_values_order_idx" ON "_products_v_version_attributes_values" USING btree ("_order");
  CREATE INDEX "_products_v_version_attributes_values_parent_id_idx" ON "_products_v_version_attributes_values" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_attributes_order_idx" ON "_products_v_version_attributes" USING btree ("_order");
  CREATE INDEX "_products_v_version_attributes_parent_id_idx" ON "_products_v_version_attributes" USING btree ("_parent_id");
  CREATE INDEX "_products_v_parent_idx" ON "_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_legacy_source_id_idx" ON "_products_v" USING btree ("version_legacy_source_id");
  CREATE INDEX "_products_v_version_version_sku_idx" ON "_products_v" USING btree ("version_sku");
  CREATE INDEX "_products_v_version_version_slug_vi_idx" ON "_products_v" USING btree ("version_slug_vi");
  CREATE INDEX "_products_v_version_version_status_idx" ON "_products_v" USING btree ("version_status");
  CREATE INDEX "_products_v_version_version_published_at_idx" ON "_products_v" USING btree ("version_published_at");
  CREATE INDEX "_products_v_version_source_metadata_version_source_metad_idx" ON "_products_v" USING btree ("version_source_metadata_legacy_slug");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version_deleted_at_idx" ON "_products_v" USING btree ("version_deleted_at");
  CREATE INDEX "_products_v_created_at_idx" ON "_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_rels_order_idx" ON "_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_categories_id_idx" ON "_products_v_rels" USING btree ("categories_id");
  CREATE INDEX "_products_v_rels_media_id_idx" ON "_products_v_rels" USING btree ("media_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_hero_image_idx" ON "_pages_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version_deleted_at_idx" ON "_pages_v" USING btree ("version_deleted_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "_pages_v" USING btree ("autosave");
  CREATE INDEX "payload_folders_folder_type_order_idx" ON "payload_folders_folder_type" USING btree ("order");
  CREATE INDEX "payload_folders_folder_type_parent_idx" ON "payload_folders_folder_type" USING btree ("parent_id");
  CREATE INDEX "payload_folders_name_idx" ON "payload_folders" USING btree ("name");
  CREATE INDEX "payload_folders_folder_idx" ON "payload_folders" USING btree ("folder_id");
  CREATE INDEX "payload_folders_updated_at_idx" ON "payload_folders" USING btree ("updated_at");
  CREATE INDEX "payload_folders_created_at_idx" ON "payload_folders" USING btree ("created_at");
  CREATE INDEX "site_settings_og_image_idx" ON "site_settings" USING btree ("og_image_id");
  CREATE INDEX "_site_settings_v_version_version_og_image_idx" ON "_site_settings_v" USING btree ("version_og_image_id");
  CREATE INDEX "_site_settings_v_created_at_idx" ON "_site_settings_v" USING btree ("created_at");
  CREATE INDEX "_site_settings_v_updated_at_idx" ON "_site_settings_v" USING btree ("updated_at");
  CREATE INDEX "navigation_header_children_order_idx" ON "navigation_header_children" USING btree ("_order");
  CREATE INDEX "navigation_header_children_parent_id_idx" ON "navigation_header_children" USING btree ("_parent_id");
  CREATE INDEX "navigation_header_order_idx" ON "navigation_header" USING btree ("_order");
  CREATE INDEX "navigation_header_parent_id_idx" ON "navigation_header" USING btree ("_parent_id");
  CREATE INDEX "navigation_footer_order_idx" ON "navigation_footer" USING btree ("_order");
  CREATE INDEX "navigation_footer_parent_id_idx" ON "navigation_footer" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_version_header_children_order_idx" ON "_navigation_v_version_header_children" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_header_children_parent_id_idx" ON "_navigation_v_version_header_children" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_version_header_order_idx" ON "_navigation_v_version_header" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_header_parent_id_idx" ON "_navigation_v_version_header" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_version_footer_order_idx" ON "_navigation_v_version_footer" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_footer_parent_id_idx" ON "_navigation_v_version_footer" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_created_at_idx" ON "_navigation_v" USING btree ("created_at");
  CREATE INDEX "_navigation_v_updated_at_idx" ON "_navigation_v" USING btree ("updated_at");
  ALTER TABLE "media" ADD CONSTRAINT "media_folder_id_payload_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."payload_folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payload_folders_fk" FOREIGN KEY ("payload_folders_id") REFERENCES "public"."payload_folders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "categories_deleted_at_idx" ON "categories" USING btree ("deleted_at");
  CREATE INDEX "media_folder_idx" ON "media" USING btree ("folder_id");
  CREATE INDEX "media_deleted_at_idx" ON "media" USING btree ("deleted_at");
  CREATE INDEX "products_deleted_at_idx" ON "products" USING btree ("deleted_at");
  CREATE INDEX "payload_locked_documents_rels_payload_folders_id_idx" ON "payload_locked_documents_rels" USING btree ("payload_folders_id");
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "payload_folders_id";
  ALTER TABLE "products" DROP COLUMN IF EXISTS "deleted_at";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "deleted_at";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "folder_id";
  ALTER TABLE "categories" DROP COLUMN IF EXISTS "deleted_at";
  DROP TABLE IF EXISTS "_navigation_v" CASCADE;
  DROP TABLE IF EXISTS "_navigation_v_version_footer" CASCADE;
  DROP TABLE IF EXISTS "_navigation_v_version_header" CASCADE;
  DROP TABLE IF EXISTS "_navigation_v_version_header_children" CASCADE;
  DROP TABLE IF EXISTS "navigation" CASCADE;
  DROP TABLE IF EXISTS "navigation_footer" CASCADE;
  DROP TABLE IF EXISTS "navigation_header" CASCADE;
  DROP TABLE IF EXISTS "navigation_header_children" CASCADE;
  DROP TABLE IF EXISTS "_site_settings_v" CASCADE;
  DROP TABLE IF EXISTS "site_settings" CASCADE;
  DROP TABLE IF EXISTS "payload_folders" CASCADE;
  DROP TABLE IF EXISTS "payload_folders_folder_type" CASCADE;
  DROP TABLE IF EXISTS "_pages_v" CASCADE;
  DROP TABLE IF EXISTS "_products_v_rels" CASCADE;
  DROP TABLE IF EXISTS "_products_v" CASCADE;
  DROP TABLE IF EXISTS "_products_v_version_attributes" CASCADE;
  DROP TABLE IF EXISTS "_products_v_version_attributes_values" CASCADE;
  DROP TABLE IF EXISTS "_products_v_version_packaging" CASCADE;
  DROP TABLE IF EXISTS "_products_v_version_packaging_cells" CASCADE;
  DROP TABLE IF EXISTS "_products_v_version_specifications" CASCADE;
  DROP TABLE IF EXISTS "_categories_v" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_payload_folders_folder_type";
  DROP TYPE IF EXISTS "public"."enum__pages_v_version_status";
  DROP TYPE IF EXISTS "public"."enum__products_v_version_status";
  DROP TYPE IF EXISTS "public"."enum__categories_v_version_status";
  ALTER TABLE "pages" DROP CONSTRAINT IF EXISTS "pages_hero_image_id_media_id_fk";
  ALTER TABLE "pages" DROP COLUMN "_status";
  ALTER TABLE "pages" DROP COLUMN "deleted_at";
  ALTER TABLE "pages" DROP COLUMN "hero_image_id";
  ALTER TABLE "pages" DROP COLUMN "seo_no_index";
  ALTER TABLE "pages" DROP COLUMN "seo_canonical_path";
  ALTER TABLE "pages" DROP COLUMN "seo_description";
  ALTER TABLE "pages" DROP COLUMN "seo_title";
  ALTER TABLE "pages" DROP COLUMN "excerpt_vi";
  ALTER TABLE "pages" ALTER COLUMN "body_vi" SET DATA TYPE varchar USING NULL;
  DROP TYPE "public"."enum_pages_status";
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published', 'archived');
  ALTER TABLE "pages" ADD COLUMN "status" "enum_pages_status" DEFAULT 'draft' NOT NULL;
  ALTER TABLE "pages" ADD COLUMN "seo" jsonb;
  CREATE INDEX "pages_status_idx" ON "pages" USING btree ("status");`)
}
