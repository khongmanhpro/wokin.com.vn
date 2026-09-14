import Image from "next/image";
import type { ProductImage } from "@/lib/catalog";

interface ResponsiveProductImageProps {
  alt: string;
  fallbackHeight?: number;
  fallbackWidth?: number;
  fill?: boolean;
  image: ProductImage;
  priority?: boolean;
  sizes: string;
}

export function ResponsiveProductImage({
  alt,
  fallbackHeight = 800,
  fallbackWidth = 800,
  fill = false,
  image,
  priority = false,
  sizes,
}: ResponsiveProductImageProps) {
  const srcSet = image.variants?.map((variant) => `${variant.src} ${variant.width}w`).join(", ");
  // `priority` on next/image would preload the JPEG fallback while the browser picks the WebP source,
  // so LCP images opt out of lazy loading and raise fetch priority instead.
  return (
    <picture className={`responsive-product-picture${fill ? " responsive-product-picture-fill" : ""}`}>
      {srcSet && <source type="image/webp" srcSet={srcSet} sizes={sizes} />}
      <Image
        src={image.src}
        alt={alt}
        {...(fill ? { fill: true } : { width: image.width ?? fallbackWidth, height: image.height ?? fallbackHeight })}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
      />
    </picture>
  );
}
