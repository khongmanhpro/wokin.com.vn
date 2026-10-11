import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryArchive, PRODUCTS_PER_PAGE } from "@/components/CategoryArchive";
import { categories, getCategoryByPath, getProductsByCategory } from "@/lib/catalog";
import { categoryMetadata } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() {
  return categories.flatMap((category) => {
    const pages = Math.ceil(getProductsByCategory(category.slug).length / PRODUCTS_PER_PAGE);
    return Array.from({ length: Math.max(0, pages - 1) }, (_, index) => ({ slug: category.path, page: String(index + 2) }));
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; page: string }> }): Promise<Metadata> {
  const { slug, page } = await params;
  const category = getCategoryByPath(slug);
  return category ? categoryMetadata(category, Number(page)) : {};
}

export default async function CategoryPaginationPage({ params }: { params: Promise<{ slug: string; page: string }> }) {
  const { slug, page } = await params;
  const numericPage = Number(page);
  const category = getCategoryByPath(slug);
  const total = category ? Math.ceil(getProductsByCategory(category.slug).length / PRODUCTS_PER_PAGE) : 0;
  if (!category || !Number.isInteger(numericPage) || numericPage < 2 || numericPage > total) notFound();
  return <CategoryArchive slug={category.slug} page={numericPage} />;
}
