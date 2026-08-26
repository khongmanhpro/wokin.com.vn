import Link from "next/link";

export function Pagination({ current, total, hrefFor }: { current: number; total: number; hrefFor: (page: number) => string }) {
  if (total <= 1) return null;
  const candidates = new Set([1, total, current - 2, current - 1, current, current + 1, current + 2]);
  const pages = [...candidates].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  return <nav className="pagination" aria-label="Phân trang">
    {pages.map((page, index) => <span key={page} className="pagination-item">
      {index > 0 && page - pages[index - 1] > 1 && <span className="pagination-gap">…</span>}
      <Link className={`page-link${page === current ? " active" : ""}`} href={hrefFor(page)} aria-current={page === current ? "page" : undefined}>{page}</Link>
    </span>)}
  </nav>;
}
