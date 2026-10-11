import { categories, categoryHref } from "@/lib/catalog";
import { siteSettings } from "@/lib/site-settings";
import { absolutePageUrl, HOME_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";

// llms.txt (https://llmstxt.org): a plain summary that helps AI assistants describe and cite the site.
export function GET() {
  const { company } = siteSettings;
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${HOME_DESCRIPTION}`,
    "",
    `Website chính thức của thương hiệu dụng cụ WOKIN tại Việt Nam, do ${company.legalName} vận hành. Toàn bộ nội dung bằng tiếng Việt.`,
    "",
    "## Trang chính",
    "",
    `- [Danh mục sản phẩm](${absolutePageUrl("/san-pham")}): ${categories.length} danh mục dụng cụ cầm tay, máy dụng cụ và thiết bị`,
    `- [Hệ pin GP20V](${absolutePageUrl("/gp20v")}): máy dụng cụ dùng chung một loại pin 20V Li-Ion`,
    `- [Sản phẩm mới](${absolutePageUrl("/san-pham-moi")})`,
    `- [Giới thiệu WOKIN](${absolutePageUrl("/gioi-thieu")})`,
    `- [Tuyển đại lý phân phối](${absolutePageUrl("/nha-phan-phoi")})`,
    `- [Liên hệ, tư vấn, báo giá](${absolutePageUrl("/lien-he")})`,
    "",
    "## Danh mục sản phẩm",
    "",
    ...categories.map((category) => `- [${category.nameVi}](${absolutePageUrl(categoryHref(category.slug))}): ${category.count} sản phẩm`),
    "",
    "## Liên hệ",
    "",
    `- Công ty: ${company.legalName}`,
    ...(company.address ? [`- Địa chỉ: ${company.address}`] : []),
    ...(company.hotline ? [`- Hotline/Zalo: ${company.hotline}`] : []),
    ...(company.taxCode ? [`- Mã số thuế: ${company.taxCode}`] : []),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
