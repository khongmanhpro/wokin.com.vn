import Link from "next/link";

// Grey title band used on WooCommerce archive pages of wokintools.com ("← TOOL SETS").
export function PageBand({ title, backHref, backLabel }: { title: string; backHref?: string; backLabel?: string }) {
  return <div className="page-band">
    <div className="container-wokin page-band-inner">
      {backHref && <Link className="page-band-back" href={backHref} aria-label={backLabel ?? "Quay lại"}>←</Link>}
      <h1>{title}</h1>
    </div>
  </div>;
}
