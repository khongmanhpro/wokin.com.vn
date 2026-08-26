import type { Metadata } from "next";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ProductGrid } from "@/components/CatalogCards";
import { getNewProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Sản phẩm mới", description: "24 sản phẩm WOKIN mới nhất dành cho thợ và đội ngũ kỹ thuật chuyên nghiệp.", alternates: { canonical: "/san-pham-moi" } };

export default function NewProductsPage() {
  const products = getNewProducts();
  return <main className="page-shell"><Breadcrumb items={[{ label: "Sản phẩm mới" }]} /><section className="container-wokin"><h1 className="page-title">SẢN PHẨM MỚI</h1><p className="archive-intro">Cập nhật 24 sản phẩm mới nhất trong danh mục WOKIN, sắp xếp theo ngày phát hành.</p><ProductGrid products={products} newIds={new Set(products.map((product) => product.id))} /></section></main>;
}
