"use client";

import { useState } from "react";

// Share row for product pages (the original site offers social share links under the specs).
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Sao chép liên kết sản phẩm:", url);
    }
  }

  return <div className="share-buttons">
    <span>Chia sẻ:</span>
    <a href={facebook} target="_blank" rel="noreferrer" aria-label={`Chia sẻ ${title} lên Facebook`}>Facebook</a>
    <button type="button" onClick={() => void copyLink()}>{copied ? "Đã sao chép" : "Sao chép liên kết"}</button>
    <span className="sr-only" role="status" aria-live="polite">{copied ? "Đã sao chép liên kết" : ""}</span>
  </div>;
}
