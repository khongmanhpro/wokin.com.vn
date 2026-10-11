import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageBand } from "@/components/PageBand";
import { CategoryCard } from "@/components/CatalogCards";
import { categories } from "@/lib/catalog";

export const metadata: Metadata = pageMetadata({ title: "Dụng cụ cầm tay, máy dụng cụ chính hãng", description: "30 danh mục dụng cụ WOKIN chính hãng tại Việt Nam: dụng cụ cầm tay, máy dụng cụ điện và dùng pin, dụng cụ cách điện, chống tia lửa, bảo hộ lao động.", path: "/san-pham" });

export default function ProductsPage() {
  return <main className="page-shell"><PageBand title="DANH MỤC SẢN PHẨM" />
    <Breadcrumb items={[{ label: "Sản phẩm" }]} />
    <section className="container-wokin">
      
      <p className="archive-intro">Hệ sản phẩm WOKIN bao phủ dụng cụ cầm tay, máy dụng cụ điện, thiết bị công trường và phụ kiện chuyên nghiệp. Chọn một danh mục để xem sản phẩm và thông số kỹ thuật chi tiết.</p>
      <div className="card-grid category-archive-grid">{categories.map((category) => <CategoryCard category={category} key={category.id} />)}</div>
    </section>
  </main>;
}
