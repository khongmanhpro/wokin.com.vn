"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import categoriesJson from "@/data/categories.json";
import productsViJson from "@/data/products_vi.json";
import glossaryJson from "@/data/vi-glossary.json";

const categories = categoriesJson as { id: number; slug: string }[];
const searchProducts = productsViJson as { id: number; sku: string; name_vi: string; slug_vi: string }[];
const glossary = glossaryJson as unknown as { categories: Record<string, string>; ui: Record<string, string>; marketing: Record<string, string> };

function Icon({ name }: { name: "search" | "menu" | "close" | "chevron" }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    chevron: <path d="m8 10 4 4 4-4"/>,
  };
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const results = normalizedQuery ? searchProducts.filter((product) => `${product.name_vi} ${product.sku}`.toLocaleLowerCase("vi").includes(normalizedQuery)).slice(0, 12) : [];

  useEffect(() => {
    document.body.style.overflow = searchOpen || drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [searchOpen, drawerOpen]);

  return (
    <>
      <div className="topbar">
        <div className="container-wokin topbar-inner">
          <span>{glossary.marketing["QUALITY TOOLS, QUALITY WORK"]}</span>
          <span className="topbar-note">DỤNG CỤ CHUYÊN NGHIỆP TỪ 1995</span>
        </div>
      </div>
      <header className="site-header">
        <div className="container-wokin header-main">
          <button className="icon-button mobile-only" aria-label="Mở danh mục" onClick={() => setDrawerOpen(true)}><Icon name="menu" /></button>
          <Link className="logo" href="/" aria-label="WOKIN TOOLS">
            <Image src="/images/logo.png" alt="WOKIN TOOLS" width={180} height={60} priority />
          </Link>
          <nav className="main-nav" aria-label="Điều hướng chính">
            <Link className="nav-link" href="/san-pham">{glossary.ui.Products}</Link>
            <Link className="nav-link" href="/gp20v">GP20V</Link>
            <Link className="nav-link" href="/san-pham-moi">{glossary.ui["New Products"]}</Link>
            <div className="nav-item" onMouseEnter={() => setSupportOpen(true)} onMouseLeave={() => setSupportOpen(false)}>
              <button className="action-button" aria-expanded={supportOpen} onClick={() => setSupportOpen((open) => !open)}>{glossary.ui.Support}<Icon name="chevron" /></button>
              {supportOpen && <div className="dropdown">
                <Link href="/about">{glossary.ui["About WOKIN"]}</Link>
                <Link href="/contact">{glossary.ui["Contact WOKIN"]}</Link>
                <Link href="/distributors">{glossary.ui["Seeking Distributors"]}</Link>
              </div>}
            </div>
          </nav>
          <div className="header-actions">
            <button className="icon-button desktop-search" aria-label={glossary.ui.Search} onClick={() => setSearchOpen(true)}><Icon name="search" /></button>
            <button className="icon-button mobile-only" aria-label={glossary.ui.Search} onClick={() => setSearchOpen(true)}><Icon name="search" /></button>
          </div>
        </div>
      </header>

      {searchOpen && <div className="search-overlay" role="dialog" aria-modal="true" aria-label={glossary.ui.Search}>
        <div className="search-overlay-inner">
          <div className="overlay-top"><button className="icon-button overlay-close" aria-label="Đóng tìm kiếm" onClick={() => setSearchOpen(false)}><Icon name="close" /></button></div>
          <input autoFocus className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={glossary.ui["Search products..."]} />
          {query && <div className="search-results">
            {results.length ? results.map((product) => <Link className="search-result" href={`/san-pham/${product.slug_vi}`} key={product.id} onClick={() => setSearchOpen(false)}>
              <Image className="result-image" src="/images/logo.png" alt="" width={58} height={58} />
              <span><strong>{product.name_vi}</strong><br /><small>{glossary.ui.SKU}: {product.sku}</small></span>
            </Link>) : <p className="empty-search">Không tìm thấy sản phẩm phù hợp.</p>}
          </div>}
        </div>
      </div>}

      {drawerOpen && <aside className="mobile-drawer" aria-label={glossary.ui.Categories}>
        <div className="drawer-header"><strong>{glossary.ui.Categories}</strong><button className="icon-button overlay-close" aria-label="Đóng danh mục" onClick={() => setDrawerOpen(false)}><Icon name="close" /></button></div>
        <ul className="drawer-list">
          <li><Link href="/san-pham" onClick={() => setDrawerOpen(false)}>{glossary.ui.Products}</Link></li>
          {categories.map((category) => <li key={category.id}><Link href={`/danh-muc/${category.slug}`} onClick={() => setDrawerOpen(false)}>{glossary.categories[category.slug] ?? category.slug}</Link></li>)}
          <li><Link href="/san-pham-moi" onClick={() => setDrawerOpen(false)}>{glossary.ui["New Products"]}</Link></li>
          <li><Link href="/about" onClick={() => setDrawerOpen(false)}>{glossary.ui["About WOKIN"]}</Link></li>
          <li><Link href="/contact" onClick={() => setDrawerOpen(false)}>{glossary.ui["Contact WOKIN"]}</Link></li>
        </ul>
      </aside>}
    </>
  );
}
