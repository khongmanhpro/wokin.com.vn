import type { Metadata } from "next";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CategoryCard } from "@/components/CatalogCards";
import { categories } from "@/lib/catalog";

export const metadata: Metadata = { title: "Sản phẩm", description: "Khám phá 30 danh mục dụng cụ WOKIN chuyên nghiệp tại Việt Nam.", alternates: { canonical: "/san-pham" } };

export default function ProductsPage() {
  return <main className="page-shell">
    <Breadcrumb items={[{ label: "Sản phẩm" }]} />
    <section className="container-wokin">
      <h1 className="page-title">DANH MỤC SẢN PHẨM</h1>
      <p className="archive-intro">Hệ sản phẩm WOKIN bao phủ dụng cụ cầm tay, máy dụng cụ điện, thiết bị công trường và phụ kiện chuyên nghiệp. Chọn một danh mục để xem sản phẩm và thông số kỹ thuật chi tiết.</p>
      <div className="card-grid category-archive-grid">{categories.map((category) => <CategoryCard category={category} key={category.id} />)}</div>
    </section>
  </main>;
}
