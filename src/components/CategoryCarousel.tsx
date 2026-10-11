"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// Horizontal category strip like wokintools.com: native scroll-snap, arrow buttons and page dots.
export function CategoryCarousel({ children, label }: { children: ReactNode; label: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setPageCount(Math.max(1, Math.round(track.scrollWidth / track.clientWidth)));
    setPage(Math.round(track.scrollLeft / track.clientWidth));
  }, []);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  const scrollToPage = (target: number) => {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = Math.min(Math.max(target, 0), pageCount - 1);
    track.scrollTo({ left: next * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return <div className="category-carousel" role="region" aria-roledescription="carousel" aria-label={label}>
    <button type="button" className="carousel-arrow carousel-prev" aria-label="Danh mục trước" disabled={page <= 0} onClick={() => scrollToPage(page - 1)}>‹</button>
    <div className="category-carousel-track" ref={trackRef} onScroll={measure}>{children}</div>
    <button type="button" className="carousel-arrow carousel-next" aria-label="Danh mục tiếp theo" disabled={page >= pageCount - 1} onClick={() => scrollToPage(page + 1)}>›</button>
    {pageCount > 1 && <div className="carousel-dots">
      {Array.from({ length: pageCount }, (_, index) => <button type="button" key={index} aria-label={`Trang danh mục ${index + 1}`} aria-current={index === page ? "true" : undefined} className={index === page ? "active" : ""} onClick={() => scrollToPage(index)} />)}
    </div>}
  </div>;
}
