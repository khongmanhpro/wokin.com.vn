"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import categoriesJson from "@/data/categories.json";
import glossaryJson from "@/data/vi-glossary.json";

const categories = categoriesJson as { id: number; slug: string }[];
type SearchProduct = { id: number; sku: string; name: string; slug: string; categories: string[] };
const glossary = glossaryJson as unknown as { categories: Record<string, string>; ui: Record<string, string>; marketing: Record<string, string> };
const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusTrapTarget(currentIndex: number, focusableCount: number, shiftKey: boolean) {
  if (focusableCount <= 0) return -1;
  if (currentIndex < 0) return shiftKey ? focusableCount - 1 : 0;
  if (shiftKey && currentIndex === 0) return focusableCount - 1;
  if (!shiftKey && currentIndex === focusableCount - 1) return 0;
  return -1;
}

function trapFocus(event: ReactKeyboardEvent<HTMLElement>, container: HTMLElement, close: () => void) {
  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== "Tab") return;

  const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => element.getClientRects().length > 0 && element.getAttribute("aria-hidden") !== "true");
  const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
  const targetIndex = getFocusTrapTarget(currentIndex, focusable.length, event.shiftKey);
  if (targetIndex < 0) return;
  event.preventDefault();
  focusable[targetIndex]?.focus();
}

function makeBackgroundInert(dialog: HTMLElement) {
  const previous: { element: HTMLElement; inert: boolean; ariaHidden: string | null }[] = [];
  let current: HTMLElement | null = dialog;

  while (current && current !== document.body) {
    const parentElement: HTMLElement | null = current.parentElement;
    if (!parentElement) break;
    for (const sibling of Array.from(parentElement.children)) {
      if (sibling === current || !(sibling instanceof HTMLElement) || ["SCRIPT", "STYLE", "LINK"].includes(sibling.tagName)) continue;
      previous.push({ element: sibling, inert: sibling.inert, ariaHidden: sibling.getAttribute("aria-hidden") });
      sibling.inert = true;
      sibling.setAttribute("aria-hidden", "true");
    }
    current = parentElement;
  }

  return () => {
    for (const { element, inert, ariaHidden } of previous) {
      element.inert = inert;
      if (ariaHidden === null) element.removeAttribute("aria-hidden");
      else element.setAttribute("aria-hidden", ariaHidden);
    }
  };
}

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
  const [searchProducts, setSearchProducts] = useState<SearchProduct[] | null>(null);
  const searchDialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerDialogRef = useRef<HTMLElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const searchWasOpen = useRef(false);
  const drawerWasOpen = useRef(false);
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const results = normalizedQuery && searchProducts
    ? searchProducts.filter((product) => `${product.name} ${product.sku}`.toLocaleLowerCase("vi").includes(normalizedQuery)).slice(0, 12)
    : [];
  const searchStatus = !normalizedQuery
    ? "Nhập tên hoặc mã sản phẩm để tìm kiếm."
    : searchProducts === null
      ? "Đang tải chỉ mục tìm kiếm."
      : results.length
        ? `Có ${results.length} kết quả tìm kiếm.`
        : "Không tìm thấy sản phẩm phù hợp.";

  const openSearch = (event: ReactMouseEvent<HTMLButtonElement>) => {
    searchTriggerRef.current = event.currentTarget;
    setDrawerOpen(false);
    setSearchOpen(true);
  };
  const closeSearch = () => setSearchOpen(false);
  const openDrawer = (event: ReactMouseEvent<HTMLButtonElement>) => {
    drawerTriggerRef.current = event.currentTarget;
    setSearchOpen(false);
    setDrawerOpen(true);
  };
  const closeDrawer = () => setDrawerOpen(false);
  const trapFocusSearch = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (searchDialogRef.current) trapFocus(event, searchDialogRef.current, closeSearch);
  };
  const trapFocusDrawer = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (drawerDialogRef.current) trapFocus(event, drawerDialogRef.current, closeDrawer);
  };

  useEffect(() => {
    const dialog = searchOpen ? searchDialogRef.current : drawerOpen ? drawerDialogRef.current : null;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const restoreBackground = makeBackgroundInert(dialog);
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreBackground();
    };
  }, [searchOpen, drawerOpen]);

  useEffect(() => {
    if (searchOpen) {
      searchWasOpen.current = true;
      window.requestAnimationFrame(() => searchInputRef.current?.focus());
    } else if (searchWasOpen.current) {
      searchWasOpen.current = false;
      window.requestAnimationFrame(() => searchTriggerRef.current?.focus());
    }
  }, [searchOpen]);

  useEffect(() => {
    if (drawerOpen) {
      drawerWasOpen.current = true;
      window.requestAnimationFrame(() => drawerCloseRef.current?.focus());
    } else if (drawerWasOpen.current) {
      drawerWasOpen.current = false;
      window.requestAnimationFrame(() => drawerTriggerRef.current?.focus());
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!searchOpen || searchProducts) return;
    let active = true;
    import("@/data/search-index.json").then((module) => {
      if (active) setSearchProducts(module.default as SearchProduct[]);
    });
    return () => { active = false; };
  }, [searchOpen, searchProducts]);

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
          <button className="icon-button mobile-only" aria-label="Mở danh mục" aria-controls="category-drawer" aria-expanded={drawerOpen} onClick={openDrawer}><Icon name="menu" /></button>
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
                <Link href="/gioi-thieu/">{glossary.ui["About WOKIN"]}</Link>
                <Link href="/lien-he/">{glossary.ui["Contact WOKIN"]}</Link>
                <Link href="/nha-phan-phoi/">{glossary.ui["Seeking Distributors"]}</Link>
              </div>}
            </div>
          </nav>
          <div className="header-actions">
            <button className="icon-button desktop-search" aria-label={glossary.ui.Search} aria-controls="search-dialog" aria-expanded={searchOpen} onClick={openSearch}><Icon name="search" /></button>
            <button className="icon-button mobile-only" aria-label={glossary.ui.Search} aria-controls="search-dialog" aria-expanded={searchOpen} onClick={openSearch}><Icon name="search" /></button>
          </div>
        </div>
      </header>

      {searchOpen && <div className="search-overlay" id="search-dialog" ref={searchDialogRef} role="dialog" aria-modal="true" aria-labelledby="search-dialog-title" onKeyDown={trapFocusSearch}>
        <div className="search-overlay-inner">
          <h2 className="sr-only" id="search-dialog-title">{glossary.ui.Search}</h2>
          <div className="overlay-top"><button className="icon-button overlay-close" aria-label="Đóng tìm kiếm" onClick={closeSearch}><Icon name="close" /></button></div>
          <label className="sr-only" htmlFor="product-search-input">{glossary.ui["Search products..."]}</label>
          <input id="product-search-input" ref={searchInputRef} className="search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={glossary.ui["Search products..."]} aria-describedby="search-results-status" />
          <p className="sr-only" id="search-results-status" role="status" aria-live="polite" aria-atomic="true">{searchStatus}</p>
          {query && searchProducts === null && <p className="empty-search">Đang tải chỉ mục tìm kiếm...</p>}
          {query && searchProducts !== null && <div className="search-results">
            {results.length ? results.map((product) => <Link className="search-result" href={`/san-pham/${product.slug}`} key={product.id} onClick={closeSearch}>
              <Image className="result-image" src="/images/logo.png" alt="" width={58} height={58} />
              <span><strong>{product.name}</strong><br /><small>{glossary.ui.SKU}: {product.sku}</small></span>
            </Link>) : <p className="empty-search">Không tìm thấy sản phẩm phù hợp.</p>}
          </div>}
        </div>
      </div>}

      {drawerOpen && <aside className="mobile-drawer" id="category-drawer" ref={drawerDialogRef} role="dialog" aria-modal="true" aria-labelledby="category-drawer-title" onKeyDown={trapFocusDrawer}>
        <div className="drawer-header"><strong id="category-drawer-title">{glossary.ui.Categories}</strong><button ref={drawerCloseRef} className="icon-button overlay-close" aria-label="Đóng danh mục" onClick={closeDrawer}><Icon name="close" /></button></div>
        <ul className="drawer-list">
          <li><Link href="/san-pham" onClick={closeDrawer}>{glossary.ui.Products}</Link></li>
          {categories.map((category) => <li key={category.id}><Link href={`/danh-muc/${category.slug}`} onClick={closeDrawer}>{glossary.categories[category.slug] ?? category.slug}</Link></li>)}
          <li><Link href="/san-pham-moi" onClick={closeDrawer}>{glossary.ui["New Products"]}</Link></li>
          <li><Link href="/gioi-thieu/" onClick={closeDrawer}>{glossary.ui["About WOKIN"]}</Link></li>
          <li><Link href="/lien-he/" onClick={closeDrawer}>{glossary.ui["Contact WOKIN"]}</Link></li>
          <li><Link href="/nha-phan-phoi/" onClick={closeDrawer}>{glossary.ui["Seeking Distributors"]}</Link></li>
        </ul>
      </aside>}
    </>
  );
}
