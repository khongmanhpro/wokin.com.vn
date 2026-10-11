import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ProductGrid } from "@/components/CatalogCards";
import { StaticHero } from "@/components/StaticHero";
import { getProductsByCategory, glossary } from "@/lib/catalog";

export const metadata: Metadata = pageMetadata({ title: "Hệ pin GP20V – máy dụng cụ dùng chung pin 20V", description: "Hệ pin Li-Ion 20V GP20V của WOKIN: một viên pin dùng chung cho máy khoan, máy mài, máy siết bu lông, máy cưa và máy làm vườn.", path: "/gp20v" });

export default function Gp20vPage() {
  const products = getProductsByCategory("20v-lithium-ion-platform");
  return <main><StaticHero title={glossary.marketing["ONE BATTERY, ENDLESS\nPOSSIBILITY."]} image={products[0]?.images[0]?.src ?? "/images/logo.png"} eyebrow="Hệ pin 20V GP20V – máy dụng cụ dùng chung pin" /><Breadcrumb items={[{ label: "GP20V" }]} /><section className="container-wokin page-shell"><p className="archive-intro gp-intro">{glossary.marketing["Experience the freedom of choice as our Lithium Battery Tool Series, offering an ever-growing range of high-performance tools to meet your evolving needs. From drills to saws, and from trimmers to blowers, our collection is designed to empower you with the right tool for every task."]}</p><ProductGrid products={products} /></section></main>;
}
