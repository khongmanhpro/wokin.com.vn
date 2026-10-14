import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ProductGrid } from "@/components/CatalogCards";
import { StaticHero } from "@/components/StaticHero";
import Link from "next/link";
import { getNewProducts, getProductsByCategory, glossary } from "@/lib/catalog";

export const metadata: Metadata = pageMetadata({ title: "Hệ pin GP20V – máy dụng cụ dùng chung pin 20V", description: "Hệ pin Li-Ion 20V GP20V của WOKIN: một viên pin dùng chung cho máy khoan, máy mài, máy siết bu lông, máy cưa và máy làm vườn.", path: "/gp20v" });

export default function Gp20vPage() {
  const products = getProductsByCategory("20v-lithium-ion-platform");
  const batteries = products.filter((product) => /^Pin\s/i.test(product.name));
  const chargers = products.filter((product) => /^Bộ sạc/i.test(product.name));
  const tools = products.filter((product) => !batteries.includes(product) && !chargers.includes(product));
  const newIds = new Set(getNewProducts().map((product) => product.id));
  return <main><StaticHero title={glossary.marketing["ONE BATTERY, ENDLESS\nPOSSIBILITY."]} image={products[0]?.images[0]?.src ?? "/images/logo.png"} eyebrow="Hệ pin 20V GP20V – máy dụng cụ dùng chung pin" /><Breadcrumb items={[{ label: "GP20V" }]} /><section className="container-wokin page-shell">
    <p className="archive-intro gp-intro">{glossary.marketing["Experience the freedom of choice as our Lithium Battery Tool Series, offering an ever-growing range of high-performance tools to meet your evolving needs. From drills to saws, and from trimmers to blowers, our collection is designed to empower you with the right tool for every task."]}</p>
    <section className="category-intro">
      <h2>Hệ pin GP20V gồm những gì?</h2>
      <p>GP20V là nền tảng pin Li-Ion 20V của WOKIN: cùng một loại pin dùng cho nhiều loại máy, từ khoan, mài, siết bu lông, cưa đến thổi, cắt cỏ và phun áp lực. Hiện có {tools.length} máy dụng cụ và phụ kiện, {batteries.length} loại pin (2.0Ah, 4.0Ah, 5.0Ah) và {chargers.length} bộ sạc trong hệ này.</p>
      <p>Cách chọn: bắt đầu từ công việc chính (khoan, siết, cắt…), chọn dung lượng pin theo thời gian làm việc liên tục (Ah càng cao càng lâu), rồi bổ sung thêm máy dùng chung pin. Cần máy nhỏ hơn có thể xem <Link href="/danh-muc/may-dung-cu-dung-pin/">máy dụng cụ dùng pin điện áp thấp</Link>, và <Link href="/danh-muc/phu-kien-may-dung-cu/">phụ kiện máy dụng cụ</Link> cho lưỡi, đĩa và mũi khoan. <Link href="/lien-he/">Liên hệ để được tư vấn</Link>.</p>
    </section>
    <section><h2 className="gp-section-title">Máy dụng cụ và phụ kiện GP20V ({tools.length})</h2><ProductGrid products={tools} newIds={newIds} /></section>
    {batteries.length > 0 && <section><h2 className="gp-section-title">Pin Li-Ion ({batteries.length})</h2><ProductGrid products={batteries} newIds={newIds} /></section>}
    {chargers.length > 0 && <section><h2 className="gp-section-title">Bộ sạc pin ({chargers.length})</h2><ProductGrid products={chargers} newIds={newIds} /></section>}
  </section></main>;
}
