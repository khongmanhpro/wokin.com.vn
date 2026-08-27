"use client";

import { useState } from "react";
import type { ProductImage } from "@/lib/catalog";
import { ResponsiveProductImage } from "@/components/ResponsiveProductImage";

export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const safeImages = images.length ? images : [{ src: "/images/logo.png", alt: name }];
  const [active, setActive] = useState(0);
  const selected = safeImages[active] ?? safeImages[0];
  return <div className="gallery">
    <div className="gallery-main"><ResponsiveProductImage image={selected} alt={selected.alt || name} fallbackWidth={800} fallbackHeight={800} sizes="(max-width: 767px) 100vw, 800px" priority /></div>
    {safeImages.length > 1 && <div className="thumbnails">{safeImages.map((image, index) => <button type="button" className={`thumbnail${active === index ? " active" : ""}`} key={`${image.src}-${index}`} onClick={() => setActive(index)} aria-label={`Xem ảnh ${index + 1}`}><ResponsiveProductImage image={image} alt={image.alt || `${name} - ảnh ${index + 1}`} fallbackWidth={120} fallbackHeight={120} sizes="120px" /></button>)}</div>}
  </div>;
}
