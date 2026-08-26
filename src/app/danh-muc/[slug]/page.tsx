import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryArchive } from "@/components/CategoryArchive";
import { categories, getCategoryBySlug } from "@/lib/catalog";

export const dynamicParams = false;
export function generateStaticParams() { return categories.map((category) => ({ slug: category.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};
  return { title: category.nameVi, description: `Danh mục ${category.nameVi} WOKIN: ${category.count} sản phẩm chuyên nghiệp, thông số rõ ràng và hình ảnh chi tiết.`, alternates: { canonical: `/danh-muc/${slug}` } };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getCategoryBySlug(slug)) notFound();
  return <CategoryArchive slug={slug} />;
}
