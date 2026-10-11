import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { CategoryCard } from "@/components/CatalogCards";
import { CategoryCarousel } from "@/components/CategoryCarousel";
import { HeroSlider } from "@/components/HeroSlider";
import { DistributorCta } from "@/components/DistributorCta";
import { ResponsiveProductImage } from "@/components/ResponsiveProductImage";
import { categories, categoryHref, getProductsByCategory, glossary, type ProductImage } from "@/lib/catalog";
import { HOME_DESCRIPTION, HOME_TITLE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/", absoluteTitle: true, imageAlt: "WOKIN TOOLS Việt Nam" });

// Image beside copy on a dark band, like the Racing and GP20V sections of wokintools.com.
function SplitBanner({ image, eyebrow, title, text, href, label, reverse = false, light = false }: { image: ProductImage; eyebrow?: string; title: string; text: string; href: string; label: string; reverse?: boolean; light?: boolean }) {
  return <section className={`split-banner${reverse ? " split-banner-reverse" : ""}${light ? " split-banner-light" : ""}`}>
    <div className="container-wokin split-banner-inner">
      <div className="split-banner-media">
        <ResponsiveProductImage image={image} alt={image.alt} fallbackWidth={800} fallbackHeight={800} sizes="(max-width: 767px) 100vw, 560px" />
      </div>
      <div className="split-banner-copy">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        <p>{text}</p>
        <Link className="button-primary" href={href}>{label}</Link>
      </div>
    </div>
  </section>;
}

export default function HomePage() {
  const featured = getProductsByCategory("20v-lithium-ion-platform").slice(0, 2);
  const racing = getProductsByCategory("automotive-tools")[0] ?? featured[0];
  const gp20v = featured[0];
  const fallbackImage: ProductImage = { src: "/images/logo.png", alt: "" };

  return <main>
    <HeroSlider products={featured.map(({ id, slugVi, images }) => ({ id, slugVi, images }))} />
    <div className="trust-banner">{glossary.marketing["TRUSTED BY OVER 100 COUNTRIES WORLDWIDE"]}</div>
    <section className="section container-wokin home-categories">
      <div className="section-head">
        <h2 className="section-title">{glossary.marketing["ENHANCE YOUR TOOLBOX"]}</h2>
        <p className="subtitle">{glossary.marketing["by professional categories"]}</p>
      </div>
      <CategoryCarousel label="Danh mục sản phẩm">{categories.map((category) => <CategoryCard category={category} key={category.id} />)}</CategoryCarousel>
    </section>
    <SplitBanner image={racing.images[0] ?? fallbackImage} eyebrow="WOKIN RACING" title={glossary.marketing["EMBRACE THE SPIRIT OF RACING GREATNESS!"]} text={glossary.marketing["Choose WOKIN for their consistent performance, allowing you to focus on your racing goals with peace of mind. Let’s explore reliable automotive repair tools."]} href={categoryHref("automotive-tools")} label={glossary.ui.EXPLORE} />
    <SplitBanner image={gp20v.images[0] ?? fallbackImage} eyebrow="GP20V" title={glossary.marketing["ONE BATTERY, ENDLESS\nPOSSIBILITY."]} text={glossary.marketing["Experience the freedom of choice as our Lithium Battery Tool Series, offering an ever-growing range of high-performance tools to meet your evolving needs. From drills to saws, and from trimmers to blowers, our collection is designed to empower you with the right tool for every task."]} href="/gp20v" label={glossary.ui["EXPLORE GP20V"]} reverse light />
    <DistributorCta text={glossary.marketing["Join our brand as a valued agent, representing our exceptional range of 3000+ products worldwide, and unlock your true potential."]} />
  </main>;
}
