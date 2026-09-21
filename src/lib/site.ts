export const SITE_NAME = "WOKIN TOOLS Việt Nam";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wokin.vn";
export const HOME_TITLE = "WOKIN TOOLS Việt Nam | Dụng cụ cầm tay & công nghiệp";
export const HOME_DESCRIPTION = "WOKIN TOOLS Việt Nam cung cấp dụng cụ cầm tay, máy dụng cụ, thiết bị công nghiệp và hệ pin GP20V cho xưởng, công trường và đội ngũ kỹ thuật.";

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
