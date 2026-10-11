import siteSettingsJson from "@/data/site-settings.json";

// Edited in the admin (globals "Thông tin website" + "Menu") and exported to src/data/site-settings.json
// with `npm run export:site-settings` in the admin app. The static build reads the committed file.

export interface NavLink { label: string; url: string; newTab: boolean }
export interface HeaderNavItem extends NavLink { children: NavLink[] }

export interface SiteSettings {
  version: 1;
  site: { siteName: string; defaultTitle: string; defaultDescription: string };
  company: {
    legalName: string;
    address: string;
    taxCode: string;
    hotline: string;
    email: string;
    zaloUrl: string;
    social: { facebook: string; youtube: string; tiktok: string };
  };
  navigation: { header: HeaderNavItem[]; footer: NavLink[] };
}

const fail = (path: string, message: string): never => {
  throw new Error(`site-settings.json: ${path} ${message}`);
};

function text(value: unknown, path: string, required = true): string {
  if (typeof value !== "string") return fail(path, "phải là chuỗi");
  const trimmed = value.trim();
  if (required && !trimmed) fail(path, "không được để trống");
  return trimmed;
}

/** Only site-relative paths and http(s) URLs may become hrefs; this rejects javascript: and similar schemes. */
export function safeHref(value: unknown, path: string, required = true): string {
  const href = text(value, path, required);
  if (!href) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const url = new URL(href);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    // Fall through to the error below.
  }
  return fail(path, "phải là đường dẫn bắt đầu bằng / hoặc URL http(s)");
}

function link(value: unknown, path: string): NavLink {
  const item = (value ?? {}) as Record<string, unknown>;
  return { label: text(item.label, `${path}.label`), url: safeHref(item.url, `${path}.url`), newTab: item.newTab === true };
}

function list(value: unknown, path: string): unknown[] {
  return Array.isArray(value) ? value : fail(path, "phải là mảng");
}

export function parseSiteSettings(input: unknown): SiteSettings {
  const root = (input ?? {}) as Record<string, any>;
  if (root.version !== 1) fail("version", "phải bằng 1");
  const company = root.company ?? {};
  const social = company.social ?? {};
  return {
    version: 1,
    site: {
      siteName: text(root.site?.siteName, "site.siteName"),
      defaultTitle: text(root.site?.defaultTitle, "site.defaultTitle"),
      defaultDescription: text(root.site?.defaultDescription, "site.defaultDescription"),
    },
    company: {
      legalName: text(company.legalName, "company.legalName"),
      address: text(company.address, "company.address"),
      taxCode: text(company.taxCode, "company.taxCode"),
      hotline: text(company.hotline, "company.hotline"),
      email: text(company.email ?? "", "company.email", false),
      zaloUrl: safeHref(company.zaloUrl, "company.zaloUrl"),
      social: {
        facebook: safeHref(social.facebook ?? "", "company.social.facebook", false),
        youtube: safeHref(social.youtube ?? "", "company.social.youtube", false),
        tiktok: safeHref(social.tiktok ?? "", "company.social.tiktok", false),
      },
    },
    navigation: {
      header: list(root.navigation?.header, "navigation.header").map((item, index) => {
        const path = `navigation.header[${index}]`;
        return { ...link(item, path), children: list((item as Record<string, unknown>).children ?? [], `${path}.children`).map((child, childIndex) => link(child, `${path}.children[${childIndex}]`)) };
      }),
      footer: list(root.navigation?.footer, "navigation.footer").map((item, index) => link(item, `navigation.footer[${index}]`)),
    },
  };
}

export const siteSettings = parseSiteSettings(siteSettingsJson);
