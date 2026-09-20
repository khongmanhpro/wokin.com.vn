export const SITE_NAME = "WOKIN TOOLS Việt Nam";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wokin.vn";

export const staticPages = [
  "",
  "/san-pham",
  "/san-pham-moi",
  "/gp20v",
  "/gioi-thieu",
  "/lien-he",
  "/nha-phan-phoi",
] as const;

export function absoluteUrl(path = ""): string {
  return new URL(path, SITE_URL).toString();
}

export function absolutePageUrl(path = "/"): string {
  const url = new URL(path, SITE_URL);
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.toString();
}
