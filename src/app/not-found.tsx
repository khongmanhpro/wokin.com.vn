import type { Metadata } from "next";
import Link from "next/link";
import { CategoryCard } from "@/components/CatalogCards";
import { PageBand } from "@/components/PageBand";
import { categories } from "@/lib/catalog";

export const metadata: Metadata = { title: "Không tìm thấy trang", robots: { index: false, follow: true } };

export default function NotFound() {
  return <main className="page-shell">
    <PageBand title="KHÔNG TÌM THẤY TRANG" />
    <section className="container-wokin section">
      <p className="archive-intro">Trang bạn tìm không tồn tại hoặc đã được chuyển. Bạn có thể quay về <Link href="/">trang chủ</Link>, xem <Link href="/san-pham/">danh mục sản phẩm</Link> hoặc <Link href="/lien-he/">liên hệ WOKIN</Link>.</p>
      <div className="card-grid category-archive-grid">{categories.slice(0, 8).map((category) => <CategoryCard category={category} key={category.id} />)}</div>
    </section>
  </main>;
}
