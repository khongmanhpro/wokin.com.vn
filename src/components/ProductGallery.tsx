"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage } from "@/lib/catalog";

export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const safeImages = images.length ? images : [{ src: "/images/logo.png", alt: name }];
  const [active, setActive] = useState(0);
  const selected = safeImages[active] ?? safeImages[0];
  return <div className="gallery">
    <div className="gallery-main"><Image src={selected.src} alt={selected.alt || name} width={800} height={800} priority /></div>
    {safeImages.length > 1 && <div className="thumbnails">{safeImages.map((image, index) => <button type="button" className={`thumbnail${active === index ? " active" : ""}`} key={`${image.src}-${index}`} onClick={() => setActive(index)} aria-label={`Xem ảnh ${index + 1}`}><Image src={image.src} alt={image.alt || `${name} - ảnh ${index + 1}`} width={120} height={120} /></button>)}</div>}
  </div>;
}
