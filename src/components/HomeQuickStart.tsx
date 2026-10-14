"use client";

import Link from "next/link";

// First-screen entry points: product search (opens the header search dialog) and the most common intents.
export function HomeQuickStart() {
  return <section className="quick-start" aria-label="Tìm nhanh">
    <div className="container-wokin quick-start-inner">
      <button type="button" className="quick-start-search" onClick={(event) => window.dispatchEvent(new CustomEvent("wokin:open-search", { detail: { trigger: event.currentTarget } }))}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
        <span>Tìm theo tên hoặc mã sản phẩm…</span>
      </button>
      <nav className="quick-start-links" aria-label="Lối tắt">
        <Link href="/gp20v/">Máy dùng pin GP20V</Link>
        <Link href="/san-pham/">Tất cả sản phẩm</Link>
        <Link href="/lien-he/">Báo giá</Link>
        <Link href="/nha-phan-phoi/">Tìm đại lý / Tuyển đại lý</Link>
      </nav>
    </div>
  </section>;
}
