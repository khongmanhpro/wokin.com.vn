import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { CategoryCard } from "@/components/CatalogCards";
import { HeroSlider } from "@/components/HeroSlider";
import { categories, getProductsByCategory, glossary } from "@/lib/catalog";

export const metadata: Metadata = { title: "WOKIN TOOLS - Dụng cụ chuyên nghiệp", description: "Khám phá hơn 1.300 sản phẩm WOKIN bằng tiếng Việt: dụng cụ cầm tay, máy dụng cụ điện, thiết bị công trường và hệ pin GP20V.", alternates: { canonical: "/" } };

function Banner({ image, eyebrow, title, text, href, label, className = "" }: { image: string; eyebrow?: string; title: string; text: string; href: string; label: string; className?: string }) {
  return <section className={`banner ${className}`}>
    <Image src={image} alt="" fill sizes="100vw" />
    <div className="container-wokin banner-content">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      <p>{text}</p>
      <Link className="button-primary" href={href}>{label}</Link>
    </div>
  </section>;
}

export default function HomePage() {
  const featured = getProductsByCategory("20v-lithium-ion-platform").slice(0, 2);
  const racing = getProductsByCategory("automotive-tools")[0] ?? featured[0];
  const gp20v = featured[0];
  const distributor = getProductsByCategory("tool-sets")[0] ?? featured[1];

  return <main>
    <HeroSlider products={featured.map(({ id, slugVi, images }) => ({ id, slugVi, images }))} />
    <div className="trust-banner">{glossary.marketing["TRUSTED BY OVER 100 COUNTRIES WORLDWIDE"]}</div>
    <section className="section container-wokin">
      <div className="section-head">
        <h2 className="section-title">{glossary.marketing["ENHANCE YOUR TOOLBOX"]}</h2>
        <p className="subtitle">{glossary.marketing["by professional categories"]}</p>
      </div>
      <div className="card-grid home-category-grid">{categories.map((category) => <CategoryCard category={category} key={category.id} />)}</div>
    </section>
    <Banner image={racing.images[0]?.src ?? "/images/logo.png"} eyebrow="WOKIN RACING" title={glossary.marketing["EMBRACE THE SPIRIT OF RACING GREATNESS!"]} text={glossary.marketing["Choose WOKIN for their consistent performance, allowing you to focus on your racing goals with peace of mind. Let’s explore reliable automotive repair tools."]} href="/danh-muc/automotive-tools" label={glossary.ui.EXPLORE} />
    <Banner image={gp20v.images[0]?.src ?? "/images/logo.png"} eyebrow="GP20V" title={glossary.marketing["ONE BATTERY, ENDLESS\nPOSSIBILITY."]} text={glossary.marketing["Experience the freedom of choice as our Lithium Battery Tool Series, offering an ever-growing range of high-performance tools to meet your evolving needs. From drills to saws, and from trimmers to blowers, our collection is designed to empower you with the right tool for every task."]} href="/gp20v" label={glossary.ui["EXPLORE GP20V"]} className="banner-gp20v" />
    <Banner image={distributor.images[0]?.src ?? "/images/logo.png"} title={glossary.marketing["GLOBAL DISTRIBUTORS WANTED!"]} text={glossary.marketing["Join our brand as a valued agent, representing our exceptional range of 3000+ products worldwide, and unlock your true potential."]} href="/contact" label={glossary.ui["CONTACT US"]} className="banner-distributors" />
  </main>;
}
