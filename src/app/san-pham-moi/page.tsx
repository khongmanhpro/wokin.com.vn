import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageBand } from "@/components/PageBand";
import { ProductGrid } from "@/components/CatalogCards";
import { getNewProducts } from "@/lib/catalog";

export const metadata: Metadata = pageMetadata({ title: "Sản phẩm mới", description: "24 sản phẩm WOKIN mới nhất dành cho thợ và đội ngũ kỹ thuật chuyên nghiệp.", path: "/san-pham-moi" });

export default function NewProductsPage() {
  const products = getNewProducts();
  return <main className="page-shell"><PageBand title="SẢN PHẨM MỚI" /><Breadcrumb items={[{ label: "Sản phẩm mới" }]} /><section className="container-wokin"><p className="archive-intro">Cập nhật 24 sản phẩm mới nhất trong danh mục WOKIN, sắp xếp theo ngày phát hành.</p><ProductGrid products={products} newIds={new Set(products.map((product) => product.id))} /></section></main>;
}
