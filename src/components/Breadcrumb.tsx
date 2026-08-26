import Link from "next/link";
import { glossary } from "@/lib/catalog";
import { absolutePageUrl } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";

export interface Crumb { label: string; href?: string }

export function Breadcrumb({ items }: { items: Crumb[] }) {
  const structuredItems = [{ label: glossary.ui.Home, href: "/" }, ...items];
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: structuredItems.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.label, ...(item.href ? { item: absolutePageUrl(item.href) } : {}) })) }} />
    <nav className="breadcrumb container-wokin" aria-label="Breadcrumb">
      <Link href="/">{glossary.ui.Home}</Link>
      {items.map((item, index) => <span key={`${item.label}-${index}`}> <span aria-hidden="true">/</span> {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</span>)}
    </nav>
  </>;
}
