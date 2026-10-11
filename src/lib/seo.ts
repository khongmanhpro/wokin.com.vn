import type { Metadata } from "next";
import { categoryHref, type Category } from "@/lib/catalog";
import { siteSettings } from "@/lib/site-settings";
import { absolutePageUrl, absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";

const DEFAULT_IMAGE = "/images/logo.png";
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const MAX_TITLE_BEFORE_SUFFIX = 46;

interface PageSeo {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  /** Skip the "| WOKIN TOOLS" template (already-branded titles such as the home page). */
  absoluteTitle?: boolean;
}

/**
 * Every page builds its metadata here. Next.js replaces `openGraph` wholesale when a page sets it,
 * so a partial override silently drops url/type/siteName/locale (or inherits the home page's).
 */
export function pageMetadata({ title, description, path, image = DEFAULT_IMAGE, imageAlt, absoluteTitle = false }: PageSeo): Metadata {
  const url = absolutePageUrl(path);
  const images = [{ url: image, alt: imageAlt ?? title }];
  return {
    // Google shows ~60 characters; long product names drop the " | WOKIN TOOLS" suffix instead of being cut off.
    title: absoluteTitle || title.length > MAX_TITLE_BEFORE_SUFFIX ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", locale: "vi_VN", siteName: SITE_NAME, title, description, url, images },
    twitter: { card: "summary_large_image", title, description, images: images.map((item) => item.url) },
  };
}

export function categoryMetadata(category: Category, page = 1): Metadata {
  const hotline = siteSettings.company.hotline;
  const pageSuffix = page > 1 ? ` – Trang ${page}` : "";
  return pageMetadata({
    title: `${category.nameVi} chính hãng${pageSuffix}`,
    description: `${category.nameVi} WOKIN chính hãng tại Việt Nam: ${category.count} sản phẩm có thông số kỹ thuật và hình ảnh chi tiết.${hotline ? ` Tư vấn, báo giá: ${hotline}.` : ""}${pageSuffix ? ` Trang ${page}.` : ""}`,
    path: categoryHref(category.slug, page),
    image: category.image,
    imageAlt: category.nameVi,
  });
}

function telephone(hotline: string): string {
  const digits = hotline.replace(/\D/g, "");
  return digits.startsWith("0") ? `+84${digits.slice(1)}` : digits;
}

/** Organization + WebSite graph; company facts come from site-settings.json (edited in the admin). */
export function organizationJsonLd(): Record<string, unknown>[] {
  const { company } = siteSettings;
  const sameAs = Object.values(company.social).filter(Boolean);
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: SITE_NAME,
      alternateName: "WOKIN Việt Nam",
      url: SITE_URL,
      logo: absoluteUrl(DEFAULT_IMAGE),
      ...(company.legalName ? { legalName: company.legalName } : {}),
      ...(company.taxCode ? { taxID: company.taxCode } : {}),
      ...(company.address ? { address: { "@type": "PostalAddress", streetAddress: company.address, addressCountry: "VN" } } : {}),
      ...(company.hotline ? {
        telephone: telephone(company.hotline),
        contactPoint: [{ "@type": "ContactPoint", telephone: telephone(company.hotline), contactType: "sales", areaServed: "VN", availableLanguage: ["vi"] }],
      } : {}),
      ...(company.email ? { email: company.email } : {}),
      ...(sameAs.length ? { sameAs } : {}),
      brand: { "@type": "Brand", name: "WOKIN" },
    },
    { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, inLanguage: "vi-VN", publisher: { "@id": ORGANIZATION_ID } },
  ];
}

/** Store details for the contact page; only emitted when the admin has an address and hotline. */
export function storeJsonLd(): Record<string, unknown> | null {
  const { company } = siteSettings;
  if (!company.address || !company.hotline) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/lien-he/#store`,
    name: SITE_NAME,
    url: absolutePageUrl("/lien-he"),
    image: absoluteUrl(DEFAULT_IMAGE),
    telephone: telephone(company.hotline),
    address: { "@type": "PostalAddress", streetAddress: company.address, addressCountry: "VN" },
    parentOrganization: { "@id": ORGANIZATION_ID },
  };
}

/** "Nhãn: giá trị" spec lines as schema.org PropertyValue, so search engines and AI can read specs as data. */
export function specProperties(lines: string[]): Record<string, unknown>[] {
  const properties: Record<string, unknown>[] = [];
  for (const line of lines) {
    const match = /^[>•\-\s]*([^:]{2,60}?)\s*:\s*(.{1,200})$/.exec(line.trim());
    if (!match) continue;
    const [, name, value] = match;
    if (/^\d+$/.test(name.trim())) continue;
    properties.push({ "@type": "PropertyValue", name: name.trim(), value: value.trim() });
    if (properties.length >= 30) break;
  }
  return properties;
}

export { ORGANIZATION_ID };
