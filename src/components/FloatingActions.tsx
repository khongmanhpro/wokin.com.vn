"use client";

import { useEffect, useState } from "react";
import { companyContact } from "@/lib/contact";

// Vietnamese buyers reach sales by Zalo or phone, so these replace the original site's chat bubble.
export function FloatingActions() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const update = () => setShowTop(window.scrollY > 600);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return <div className="floating-actions" aria-label="Liên hệ nhanh">
    {showTop && <button type="button" className="floating-action floating-top" aria-label="Về đầu trang" onClick={scrollToTop}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 15 6-6 6 6" /></svg>
    </button>}
    <a className="floating-action floating-zalo" href={companyContact.zaloHref} target="_blank" rel="noreferrer" aria-label="Nhắn Zalo cho Workman">Zalo</a>
    <a className="floating-action floating-call" href={companyContact.hotlineHref} aria-label={`Gọi hotline ${companyContact.hotline}`}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
    </a>
  </div>;
}
