import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ProductGrid } from "@/components/CatalogCards";
import { ProductGallery } from "@/components/ProductGallery";
import { JsonLd } from "@/components/JsonLd";
import { getAllProducts, getProductBySlug, getRelated, glossary, parseProductSpec, productDescription } from "@/lib/catalog";
import { absolutePageUrl, absoluteUrl } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() { return getAllProducts().map((product) => ({ slug_vi: product.slugVi })); }

export async function generateMetadata({ params }: { params: Promise<{ slug_vi: string }> }): Promise<Metadata> {
  const { slug_vi } = await params;
  const product = getProductBySlug(slug_vi);
  if (!product) return {};
  return { title: product.name, description: productDescription(product), alternates: { canonical: `/san-pham/${product.slugVi}` }, openGraph: { title: product.name, description: productDescription(product), images: product.images[0] ? [{ url: product.images[0].src, alt: product.name }] : [] } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug_vi: string }> }) {
  const { slug_vi } = await params;
  const product = getProductBySlug(slug_vi);
  if (!product) notFound();
  const category = product.categories[0];
  const spec = parseProductSpec(product.short_description);
  return <main className="detail-section">
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Product", name: product.name, description: productDescription(product), sku: product.sku, image: product.images.map((image) => absoluteUrl(image.src)), url: absolutePageUrl(`/san-pham/${product.slugVi}`), brand: { "@type": "Brand", name: "WOKIN" }, category: category ? (glossary.categories[category.slug] ?? category.name) : undefined }} />
    <Breadcrumb items={[{ label: glossary.ui.Products, href: "/san-pham" }, ...(category ? [{ label: glossary.categories[category.slug] ?? category.name, href: `/danh-muc/${category.slug}` }] : []), { label: product.name }]} />
    <section className="container-wokin product-layout">
      <ProductGallery images={product.images} name={product.name} />
      <div className="product-info">
        <Link className="eyebrow" href="/san-pham">← {glossary.ui["Back to products"]}</Link>
        <h1>{product.name}</h1>
        <div className="meta-row"><span>{glossary.ui.SKU}: <strong>{product.sku}</strong></span>{category && <span>{glossary.ui.Category}: <Link className="category-link" href={`/danh-muc/${category.slug}`}>{glossary.categories[category.slug] ?? category.name}</Link></span>}</div>
        <h2 className="spec-heading">Thông số kỹ thuật</h2>
        <div className="spec-html">
          {spec.lines.length > 0 && <p>{spec.lines.map((line, index) => <span key={`${index}-${line}`}>{line}{index < spec.lines.length - 1 && <br />}</span>)}</p>}
          {spec.table.length > 0 && <table><tbody>{spec.table.map((row, rowIndex) => <tr key={`${rowIndex}-${row.join("|")}`}>{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`}>{cell}</td>)}</tr>)}</tbody></table>}
        </div>
      </div>
    </section>
    <section className="section container-wokin"><h2 className="related-title">{glossary.ui["Related products"]}</h2><ProductGrid products={getRelated(product)} /></section>
  </main>;
}
