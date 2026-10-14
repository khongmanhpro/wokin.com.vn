import type { Metadata } from "next";
import { pageMetadata, specProperties } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ProductGrid } from "@/components/CatalogCards";
import { ProductGallery } from "@/components/ProductGallery";
import { ShareButtons } from "@/components/ShareButtons";
import { JsonLd } from "@/components/JsonLd";
import { categoryHref, getAllProducts, getProductBySlug, getRelated, glossary, parseProductSpec, productDescription, productSeoName } from "@/lib/catalog";
import { absolutePageUrl, absoluteUrl } from "@/lib/site";

export const dynamicParams = false;

function SpecTable({ rows }: { rows: string[][] }) {
  // Packaging tables start with a label row ("MÃ KHO", ...); expose it as column headers.
  const [first, ...rest] = rows;
  const hasHeader = rows.length > 1 && first[0]?.trim().toUpperCase() === glossary.ui["STOCK NO."].toUpperCase();
  const body = hasHeader ? rest : rows;
  return <table>
    {hasHeader && <thead><tr>{first.map((cell, cellIndex) => <th scope="col" key={`${cellIndex}-${cell}`}>{cell}</th>)}</tr></thead>}
    <tbody>{body.map((row, rowIndex) => <tr key={`${rowIndex}-${row.join("|")}`}>{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`}>{cell}</td>)}</tr>)}</tbody>
  </table>;
}
export function generateStaticParams() { return getAllProducts().map((product) => ({ slug_vi: product.slugVi })); }

export async function generateMetadata({ params }: { params: Promise<{ slug_vi: string }> }): Promise<Metadata> {
  const { slug_vi } = await params;
  const product = getProductBySlug(slug_vi);
  if (!product) return {};
  const name = productSeoName(product);
  const description = productDescription(product);
  return pageMetadata({ title: name, description, path: `/san-pham/${product.slugVi}`, image: product.images[0]?.src, imageAlt: name });
}

export default async function ProductPage({ params }: { params: Promise<{ slug_vi: string }> }) {
  const { slug_vi } = await params;
  const product = getProductBySlug(slug_vi);
  if (!product) notFound();
  const category = product.categories[0];
  const spec = parseProductSpec(product.short_description);
  const name = productSeoName(product);
  const description = productDescription(product);
  const canonical = absolutePageUrl(`/san-pham/${product.slugVi}`);
  const properties = specProperties(spec.lines);
  return <main className="detail-section">
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Product", name, description, ...(product.sku.trim() ? { sku: product.sku.trim(), mpn: product.sku.trim() } : {}), image: product.images.map((image) => absoluteUrl(image.src)), url: canonical, brand: { "@type": "Brand", name: "WOKIN" }, manufacturer: { "@type": "Organization", name: "WOKIN TOOLS" }, category: category ? (glossary.categories[category.slug] ?? category.name) : undefined, ...(properties.length ? { additionalProperty: properties } : {}) }} />
    <Breadcrumb items={[{ label: glossary.ui.Products, href: "/san-pham" }, ...(category ? [{ label: glossary.categories[category.slug] ?? category.name, href: categoryHref(category.slug) }] : []), { label: name }]} />
    <section className="container-wokin product-layout">
      <ProductGallery images={product.images} name={product.name} />
      <div className="product-info">
        <Link className="eyebrow" href="/san-pham">← {glossary.ui["Back to products"]}</Link>
        <h1>{name}</h1>
        <div className="meta-row">{product.sku.trim() && <span>{glossary.ui.SKU}: <strong>{product.sku.trim()}</strong></span>}{category && <span>{glossary.ui.Category}: <Link className="category-link" href={categoryHref(category.slug)}>{glossary.categories[category.slug] ?? category.name}</Link></span>}</div>
        <h2 className="spec-heading">Thông số kỹ thuật</h2>
        <div className="spec-html">
          {spec.lines.length > 0 && <p>{spec.lines.map((line, index) => <span key={`${index}-${line}`}>{line}{index < spec.lines.length - 1 && <br />}</span>)}</p>}
          {spec.table.length > 0 && <SpecTable rows={spec.table} />}
        </div>
        <ShareButtons url={canonical} title={name} />
      </div>
    </section>
    <section className="section container-wokin"><h2 className="related-title">{glossary.ui["Related products"]}</h2><ProductGrid products={getRelated(product)} /></section>
  </main>;
}
