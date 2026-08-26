import Image from "next/image";
import Link from "next/link";
import type { Category, Product } from "@/lib/catalog";
import { glossary } from "@/lib/catalog";

export function ProductCard({ product, isNew = false }: { product: Product; isNew?: boolean }) {
  return <article className="product-card">
    <Link href={`/san-pham/${product.slugVi}`} aria-label={product.name}>
      <div className="product-media">
        {isNew && <span className="badge-new">{glossary.ui.NEW}</span>}
        <Image src={product.images[0]?.src ?? "/images/logo.png"} alt={product.name} width={500} height={500} />
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
      <div className="category-media"><Image src={category.image} alt={category.nameVi} width={500} height={500} /></div>
      <span className="category-name">{category.nameVi}</span>
    </Link>
  </article>;
}
