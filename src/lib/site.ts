import { siteSettings } from "@/lib/site-settings";

export const SITE_NAME = siteSettings.site.siteName;
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wokin.vn";
export const HOME_TITLE = siteSettings.site.defaultTitle;
export const HOME_DESCRIPTION = siteSettings.site.defaultDescription;

export const staticPages = [
  "",
  "/san-pham",
  "/san-pham-moi",
  "/gp20v",
  "/gioi-thieu",
  "/lien-he",
  "/nha-phan-phoi",
  "/chinh-sach-bao-mat",
  "/chinh-sach-cookie",
] as const;

export function absoluteUrl(path = ""): string {
  return new URL(path, SITE_URL).toString();
}

export function absolutePageUrl(path = "/"): string {
  const url = new URL(path, SITE_URL);
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.toString();
}
