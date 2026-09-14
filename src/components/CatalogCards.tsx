import Link from "next/link";
import type { Category, Product } from "@/lib/catalog";
import { glossary } from "@/lib/catalog";
import { responsiveImageMetadata } from "@/lib/responsive-images";
import { ResponsiveProductImage } from "@/components/ResponsiveProductImage";

const cardSizes = "(max-width: 767px) 50vw, (max-width: 1199px) 30vw, 280px";

export function ProductCard({ product, isNew = false }: { product: Product; isNew?: boolean }) {
  const image = product.images[0] ?? { src: "/images/logo.png", alt: product.name };
  return <article className="product-card">
    <Link href={`/san-pham/${product.slugVi}`}>
      <div className="product-media">
        {isNew && <span className="badge-new">{glossary.ui.NEW}</span>}
        <ResponsiveProductImage image={image} alt={product.name} fallbackWidth={500} fallbackHeight={500} sizes={cardSizes} />
      </div>
      <span className="product-name">{product.name}</span>
      <span className="sku">{glossary.ui.SKU}: {product.sku}</span>
    </Link>
  </article>;
}

export function ProductGrid({ products, newIds }: { products: Product[]; newIds?: Set<number> }) {
  return <div className="card-grid grid-products">{products.map((product) => <ProductCard key={product.id} product={product} isNew={newIds?.has(product.id)} />)}</div>;
}

export function CategoryCard({ category }: { category: Category }) {
  return <article className="category-card">
    <Link href={`/danh-muc/${category.slug}`}>
      <div className="category-media"><ResponsiveProductImage image={{ src: category.image, alt: "", ...responsiveImageMetadata(category.image) }} alt="" fallbackWidth={500} fallbackHeight={500} sizes={cardSizes} /></div>
      <span className="category-name">{category.nameVi}</span>
    </Link>
  </article>;
}
