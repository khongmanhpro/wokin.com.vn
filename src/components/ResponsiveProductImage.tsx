import Image from "next/image";
import type { ProductImage } from "@/lib/catalog";

interface ResponsiveProductImageProps {
  alt: string;
  fallbackHeight: number;
  fallbackWidth: number;
  image: ProductImage;
  priority?: boolean;
  sizes: string;
}

export function ResponsiveProductImage({
  alt,
  fallbackHeight,
  fallbackWidth,
  image,
  priority = false,
  sizes,
}: ResponsiveProductImageProps) {
  const srcSet = image.variants?.map((variant) => `${variant.src} ${variant.width}w`).join(", ");
  return (
    <picture className="responsive-product-picture">
      {srcSet && <source type="image/webp" srcSet={srcSet} sizes={sizes} />}
      <Image
        src={image.src}
        alt={alt}
        width={image.width ?? fallbackWidth}
        height={image.height ?? fallbackHeight}
        sizes={sizes}
        fetchPriority={priority ? "high" : undefined}
      />
    </picture>
  );
}
