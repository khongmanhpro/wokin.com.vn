import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryArchive } from "@/components/CategoryArchive";
import { categories, getCategoryByPath } from "@/lib/catalog";
import { categoryMetadata } from "@/lib/seo";

export const dynamicParams = false;
// The route segment is the Vietnamese category path (see src/data/category-paths.json).
export function generateStaticParams() { return categories.map((category) => ({ slug: category.path })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryByPath(slug);
  return category ? categoryMetadata(category) : {};
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategoryByPath(slug);
  if (!category) notFound();
  return <CategoryArchive slug={category.slug} />;
}
