import { Breadcrumb } from "@/components/Breadcrumb";
import { Pagination } from "@/components/Pagination";
import { ProductGrid } from "@/components/CatalogCards";
import { getCategoryBySlug, getNewProducts, getProductsByCategory, glossary } from "@/lib/catalog";

export const PRODUCTS_PER_PAGE = 20;

export function CategoryArchive({ slug, page = 1 }: { slug: string; page?: number }) {
  const category = getCategoryBySlug(slug);
  if (!category) return null;
  const allProducts = getProductsByCategory(slug);
  const totalPages = Math.ceil(allProducts.length / PRODUCTS_PER_PAGE);
  const currentPage = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
  const visible = allProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);
  const newIds = new Set(getNewProducts().map((product) => product.id));
  return <main className="page-shell">
    <Breadcrumb items={[{ label: glossary.ui.Products, href: "/san-pham" }, { label: category.nameVi }]} />
    <div className="container-wokin">
      <h1 className="page-title">{category.nameVi}</h1>
      <p className="archive-intro">Khám phá {category.nameVi.toLocaleLowerCase("vi")} WOKIN dành cho công việc chuyên nghiệp. Danh mục cung cấp thông số rõ ràng, hình ảnh thực tế và nhiều lựa chọn phù hợp cho xưởng, công trường và đội ngũ kỹ thuật.</p>
      <div className="toolbar"><span className="count-label">{allProducts.length} sản phẩm</span><span className="count-label">{glossary.ui.Show}: {PRODUCTS_PER_PAGE} · Trang {currentPage}/{totalPages || 1}</span></div>
      <ProductGrid products={visible} newIds={newIds} />
      <Pagination current={currentPage} total={totalPages} hrefFor={(number) => number === 1 ? `/danh-muc/${slug}` : `/danh-muc/${slug}/trang/${number}`} />
    </div>
  </main>;
}
