import type { MetadataRoute } from "next";
import { PRODUCTS_PER_PAGE } from "@/components/CategoryArchive";
import { categories, getAllProducts, getProductsByCategory } from "@/lib/catalog";
import { absolutePageUrl, staticPages } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = staticPages.map((path) => ({ url: absolutePageUrl(path || "/"), changeFrequency: path === "" ? "weekly" : "monthly", priority: path === "" ? 1 : 0.8 }));
  const productEntries: MetadataRoute.Sitemap = getAllProducts().map((product) => ({ url: absolutePageUrl(`/san-pham/${product.slugVi}`), lastModified: product.date, changeFrequency: "monthly", priority: 0.7 }));
  const categoryEntries: MetadataRoute.Sitemap = categories.flatMap((category) => {
    const count = getProductsByCategory(category.slug).length;
    const pages = Math.ceil(count / PRODUCTS_PER_PAGE);
    return Array.from({ length: Math.max(1, pages) }, (_, index) => ({
      url: absolutePageUrl(index === 0 ? `/danh-muc/${category.slug}` : `/danh-muc/${category.slug}/trang/${index + 1}`),
      changeFrequency: "weekly" as const,
      priority: index === 0 ? 0.8 : 0.6,
    }));
  });
  return [...staticEntries, ...categoryEntries, ...productEntries];
}
