import Link from "next/link";
import { glossary } from "@/lib/catalog";

const defaultText = glossary.marketing["Partner with WOKIN to represent our powerful range of 3500+ products worldwide. Join our global network today and unlock unlimited market potential."];

// Compact white strip as on wokintools.com: big orange title, copy, call to action.
export function DistributorCta({ text = defaultText }: { text?: string }) {
  return <section className="distributor-strip">
    <div className="container-wokin distributor-strip-inner">
      <h2>{glossary.marketing["GLOBAL DISTRIBUTORS WANTED!"]}</h2>
      <p>{text}</p>
      <Link className="button-primary" href="/lien-he/">{glossary.ui["CONTACT US"]}</Link>
    </div>
  </section>;
}
