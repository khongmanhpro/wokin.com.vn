"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import glossaryJson from "@/data/vi-glossary.json";

interface HeroProduct { id: number; slugVi: string; images: { src: string }[] }
const glossary = glossaryJson as unknown as { marketing: Record<string, string>; ui: Record<string, string> };

export function HeroSlider({ products }: { products: HeroProduct[] }) {
  const [active, setActive] = useState(0);
  const slides = [
    { product: products[0], eyebrow: glossary.marketing["Crafted for Precision."], title: glossary.marketing["Trusted by Professionals."] },
    { product: products[1] ?? products[0], eyebrow: "WOKIN TOOLS", title: glossary.marketing["The Respect of Professionals"] },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const move = (direction: number) => setActive((index) => (index + direction + slides.length) % slides.length);

  return <section className="hero" aria-roledescription="carousel" aria-label="Sản phẩm WOKIN nổi bật">
    {slides.map((slide, index) => <div className={`hero-slide${index === active ? " active" : ""}`} aria-hidden={index !== active} key={slide.product.id}>
      <Image src={slide.product.images[0]?.src ?? "/images/logo.png"} alt="" fill sizes="100vw" priority={index === 0} />
      <div className="hero-content container-wokin">
        <div className="hero-copy">
          <span className="eyebrow">{slide.eyebrow}</span>
          <h1 className="hero-title">{slide.title}</h1>
          <Link className="button-primary" href={`/san-pham/${slide.product.slugVi}`}>{glossary.ui.EXPLORE}</Link>
        </div>
      </div>
    </div>)}
    <div className="slider-controls">
      <button className="slider-arrow" onClick={() => move(-1)} aria-label="Slide trước">‹</button>
      <button className="slider-arrow" onClick={() => move(1)} aria-label="Slide sau">›</button>
    </div>
    <div className="slider-dots">{slides.map((slide, index) => <button key={slide.product.id} aria-label={`Đến slide ${index + 1}`} className={index === active ? "active" : ""} onClick={() => setActive(index)} />)}</div>
  </section>;
}
