"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import glossaryJson from "@/data/vi-glossary.json";
import type { ProductImage } from "@/lib/catalog";
import { ResponsiveProductImage } from "@/components/ResponsiveProductImage";

interface HeroProduct { id: number; slugVi: string; images: ProductImage[] }
const heroFallbackImage: ProductImage = { src: "/images/logo.png", alt: "" };
const glossary = glossaryJson as unknown as { marketing: Record<string, string>; ui: Record<string, string> };

export function HeroSlider({ products }: { products: HeroProduct[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const slides = [
    { product: products[0], eyebrow: glossary.marketing["Crafted for Precision."], title: glossary.marketing["Trusted by Professionals."] },
    { product: products[1] ?? products[0], eyebrow: "WOKIN TOOLS", title: glossary.marketing["The Respect of Professionals"] },
  ];

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      setReducedMotion(mediaQuery.matches);
      if (mediaQuery.matches) setPaused(true);
    };
    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (reducedMotion || paused) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, slides.length]);

  const move = (direction: number) => {
    setPaused(true);
    setActive((index) => (index + direction + slides.length) % slides.length);
  };
  const selectSlide = (index: number) => {
    setPaused(true);
    setActive(index);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(slides.length - 1);
    }
  };

  return <section className="hero" role="region" aria-roledescription="carousel" aria-label="Sản phẩm WOKIN nổi bật" tabIndex={0} onKeyDown={handleKeyDown}>
    <p className="sr-only" aria-live={paused || reducedMotion ? "polite" : "off"} aria-atomic="true">Slide {active + 1} / {slides.length}: {slides[active].title}</p>
    {slides.map((slide, index) => <div className={`hero-slide${index === active ? " active" : ""}`} role="group" aria-roledescription="slide" aria-label={`${index + 1} / ${slides.length}: ${slide.title}`} aria-hidden={index !== active} inert={index !== active} key={slide.product.id}>
      <ResponsiveProductImage image={slide.product.images[0] ?? heroFallbackImage} alt="" fill sizes="100vw" priority={index === 0} />
      <div className="hero-content container-wokin">
        <div className="hero-copy">
          <span className="eyebrow">{slide.eyebrow}</span>
          {index === 0 ? <h1 className="hero-title">{slide.title}</h1> : <p className="hero-title">{slide.title}</p>}
          <Link className="button-primary" href={`/san-pham/${slide.product.slugVi}`}>{glossary.ui.EXPLORE}</Link>
        </div>
      </div>
    </div>)}
    <div className="slider-controls">
      <button className="slider-arrow" onClick={() => move(-1)} aria-label="Slide trước">‹</button>
      <button className="slider-arrow slider-toggle" type="button" aria-label={reducedMotion ? "Tự động chuyển slide đã tắt theo cài đặt giảm chuyển động" : paused ? "Tiếp tục tự động chuyển slide" : "Tạm dừng tự động chuyển slide"} aria-pressed={paused} disabled={reducedMotion} onClick={() => setPaused((value) => !value)}><span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span></button>
      <button className="slider-arrow" onClick={() => move(1)} aria-label="Slide sau">›</button>
    </div>
    <div className="slider-dots">{slides.map((slide, index) => <button key={slide.product.id} type="button" aria-label={`Đến slide ${index + 1}`} aria-current={index === active ? "true" : undefined} className={index === active ? "active" : ""} onClick={() => selectSlide(index)} />)}</div>
  </section>;
}
