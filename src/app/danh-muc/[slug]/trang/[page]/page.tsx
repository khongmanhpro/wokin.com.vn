import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryArchive, PRODUCTS_PER_PAGE } from "@/components/CategoryArchive";
import { categories, getCategoryBySlug, getProductsByCategory } from "@/lib/catalog";

export const dynamicParams = false;
export function generateStaticParams() {
  return categories.flatMap((category) => {
    const pages = Math.ceil(getProductsByCategory(category.slug).length / PRODUCTS_PER_PAGE);
    return Array.from({ length: Math.max(0, pages - 1) }, (_, index) => ({ slug: category.slug, page: String(index + 2) }));
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; page: string }> }): Promise<Metadata> {
  const { slug, page } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};
  return { title: `${category.nameVi} - Trang ${page}`, description: `Sản phẩm ${category.nameVi} WOKIN, trang ${page}.`, alternates: { canonical: `/danh-muc/${slug}/trang/${page}` } };
}

export default async function CategoryPaginationPage({ params }: { params: Promise<{ slug: string; page: string }> }) {
  const { slug, page } = await params;
  const numericPage = Number(page);
  const category = getCategoryBySlug(slug);
  const total = category ? Math.ceil(getProductsByCategory(slug).length / PRODUCTS_PER_PAGE) : 0;
  if (!category || !Number.isInteger(numericPage) || numericPage < 2 || numericPage > total) notFound();
  return <CategoryArchive slug={slug} page={numericPage} />;
}
