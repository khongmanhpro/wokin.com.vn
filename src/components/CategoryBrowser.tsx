"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type IndexProduct = { id: number; sku: string; name: string; slug: string; categories: string[]; image: string | null };
type SortKey = "default" | "name-asc" | "name-desc" | "sku";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "default", label: "Mặc định" },
  { value: "name-asc", label: "Tên A → Z" },
  { value: "name-desc", label: "Tên Z → A" },
  { value: "sku", label: "Mã sản phẩm" },
];
const PER_PAGE_OPTIONS = [20, 25, 30] as const;
const DEFAULT_PER_PAGE = 20;
const collator = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });

function sortProducts(products: IndexProduct[], sort: SortKey): IndexProduct[] {
  if (sort === "name-asc") return [...products].sort((a, b) => collator.compare(a.name, b.name));
  if (sort === "name-desc") return [...products].sort((a, b) => collator.compare(b.name, a.name));
  if (sort === "sku") return [...products].sort((a, b) => collator.compare(a.sku || "~", b.sku || "~"));
  return products;
}

/**
 * Sort and page-size controls like WooCommerce's. The server-rendered grid (children) stays the default
 * view for SEO; any other choice lazily loads the search index and pages through the category client-side.
 */
export function CategoryBrowser({ slug, total, skuLabel, children }: { slug: string; total: number; skuLabel: string; children: ReactNode }) {
  const [sort, setSort] = useState<SortKey>("default");
  const [perPage, setPerPage] = useState<number>(DEFAULT_PER_PAGE);
  const [page, setPage] = useState(1);
  const [index, setIndex] = useState<IndexProduct[] | null>(null);
  const customised = sort !== "default" || perPage !== DEFAULT_PER_PAGE;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSort = params.get("sap-xep") as SortKey | null;
    const requestedPerPage = Number(params.get("so-luong"));
    if (requestedSort && SORT_OPTIONS.some((option) => option.value === requestedSort)) setSort(requestedSort);
    if (PER_PAGE_OPTIONS.includes(requestedPerPage as (typeof PER_PAGE_OPTIONS)[number])) setPerPage(requestedPerPage);
  }, []);

  useEffect(() => {
    if (!customised || index) return;
    let active = true;
    import("@/data/search-index.json").then((module) => {
      if (active) setIndex(module.default as IndexProduct[]);
    });
    return () => { active = false; };
  }, [customised, index]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (sort === "default") url.searchParams.delete("sap-xep"); else url.searchParams.set("sap-xep", sort);
    if (perPage === DEFAULT_PER_PAGE) url.searchParams.delete("so-luong"); else url.searchParams.set("so-luong", String(perPage));
    window.history.replaceState(null, "", url);
  }, [sort, perPage]);

  const products = useMemo(
    () => (index ? sortProducts(index.filter((product) => product.categories.includes(slug)), sort) : []),
    [index, slug, sort],
  );
  const pageCount = Math.max(1, Math.ceil(products.length / perPage));
  const visible = products.slice((page - 1) * perPage, page * perPage);

  return <>
    <div className="toolbar">
      <span className="count-label">{total} sản phẩm</span>
      <div className="catalog-controls">
        <label>Sắp xếp
          <select value={sort} onChange={(event) => { setSort(event.target.value as SortKey); setPage(1); }}>
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>Hiển thị
          <select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }}>
            {PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
    </div>
    {!customised ? children : index === null ? <p className="count-label" role="status">Đang sắp xếp sản phẩm…</p> : <>
      <div className="card-grid grid-products">{visible.map((product) => <article className="product-card" key={product.id}>
        <Link href={`/san-pham/${product.slug}`}>
          <div className="product-media"><img src={product.image ?? "/images/logo.png"} alt={product.name} width={500} height={500} loading="lazy" decoding="async" /></div>
          <span className="product-name">{product.name}</span>
          <span className="sku">{skuLabel}: {product.sku || "—"}</span>
        </Link>
      </article>)}</div>
      {pageCount > 1 && <nav className="pagination" aria-label="Phân trang">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((number) => <button type="button" key={number} className={`page-link${number === page ? " active" : ""}`} aria-current={number === page ? "page" : undefined} onClick={() => { setPage(number); window.scrollTo({ top: 0 }); }}>{number}</button>)}
      </nav>}
    </>}
  </>;
}
