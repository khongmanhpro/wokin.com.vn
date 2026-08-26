import Image from "next/image";
import Link from "next/link";
import { getProductsByCategory, glossary } from "@/lib/catalog";

export function DistributorCta() {
  const image = getProductsByCategory("tool-sets")[0]?.images[0]?.src ?? "/images/logo.png";
  return <section className="banner banner-distributors">
    <Image src={image} alt="" fill sizes="100vw" />
    <div className="container-wokin banner-content">
      <h2>{glossary.marketing["GLOBAL DISTRIBUTORS WANTED!"]}</h2>
      <p>{glossary.marketing["Partner with WOKIN to represent our powerful range of 3500+ products worldwide. Join our global network today and unlock unlimited market potential."]}</p>
      <Link className="button-primary" href="/lien-he/">{glossary.ui["CONTACT US"]}</Link>
    </div>
  </section>;
}
