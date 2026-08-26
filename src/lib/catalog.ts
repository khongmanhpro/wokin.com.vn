import categoriesJson from "@/data/categories.json";
import datesJson from "@/data/product_dates.json";
import manifestJson from "@/data/image_manifest.json";
import productsJson from "@/data/products.json";
import translationsJson from "@/data/products_vi.json";
import glossaryJson from "@/data/vi-glossary.json";

export interface ProductImage {
  src: string;
  alt: string;
}

export interface ProductCategory {
  name: string;
  slug: string;
}

export interface ProductAttribute {
  id?: number;
  name: string;
  options?: string[];
}

interface RawProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  categories: ProductCategory[];
  images: ProductImage[];
  short_description: string;
  description: string;
  attributes: ProductAttribute[];
}

interface ProductTranslation {
  id: number;
  sku: string;
  name_en: string;
  name_vi: string;
  slug_vi: string;
}

interface ProductDate {
  id: number;
  date: string;
  slug: string;
}

interface ManifestEntry {
  sku: string;
  images: string[];
}

export interface Product extends Omit<RawProduct, "name" | "images"> {
  name: string;
  nameEn: string;
  slugVi: string;
  images: ProductImage[];
  date: string;
}

export interface Category {
  id: number;
  name: string;
  nameVi: string;
  slug: string;
  count: number;
  parent: number;
  image: string;
}

interface Glossary {
  categories: Record<string, string>;
  ui: Record<string, string>;
  marketing: Record<string, string>;
  terms: [string, string][];
  spec_labels: Record<string, string>;
}

export const glossary = glossaryJson as unknown as Glossary;
const rawProducts = productsJson as RawProduct[];
const rawCategories = categoriesJson as Omit<Category, "nameVi" | "image">[];
const translations = translationsJson as ProductTranslation[];
const dates = datesJson as ProductDate[];
const manifest = manifestJson as Record<string, ManifestEntry>;

const translationById = new Map(translations.map((item) => [item.id, item]));
const dateById = new Map(dates.map((item) => [item.id, item.date]));

export const products: Product[] = rawProducts.map((raw) => {
  const translated = translationById.get(raw.id);
  if (!translated) throw new Error(`Thiếu bản dịch sản phẩm ID ${raw.id}`);
  const localImages = manifest[raw.slug]?.images ?? [];
  return {
    ...raw,
    name: translated.name_vi,
    nameEn: raw.name,
    slugVi: translated.slug_vi,
    date: dateById.get(raw.id) ?? "1970-01-01T00:00:00",
    images: localImages.length
      ? localImages.map((src, index) => ({
          src: src.startsWith("/") ? src : `/${src}`,
          alt: `${translated.name_vi}${index ? ` - ảnh ${index + 1}` : ""}`,
        }))
      : raw.images.map((image, index) => ({
          src: image.src,
          alt: `${translated.name_vi}${index ? ` - ảnh ${index + 1}` : ""}`,
        })),
  };
});

const productByViSlug = new Map(products.map((product) => [product.slugVi, product]));
const productByOriginalSlug = new Map(products.map((product) => [product.slug, product]));

export const categories: Category[] = rawCategories.map((category) => {
  const representative = products.find((product) =>
    product.categories.some((item) => item.slug === category.slug),
  );
  return {
    ...category,
    nameVi: glossary.categories[category.slug] ?? category.name,
    image: representative?.images[0]?.src ?? "/images/logo.png",
  };
});

if (products.length !== 1357) throw new Error(`Sai số lượng sản phẩm: ${products.length}`);
if (categories.length !== 30) throw new Error(`Sai số lượng danh mục: ${categories.length}`);
if (new Set(products.map((product) => product.slugVi)).size !== products.length) {
  throw new Error("slug_vi sản phẩm không duy nhất");
}

export function getAllProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return productByViSlug.get(slug) ?? productByOriginalSlug.get(slug);
}

export function getProductsByCategory(slug: string): Product[] {
  return products.filter((product) =>
    product.categories.some((category) => category.slug === slug),
  );
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getNewProducts(n = 24): Product[] {
  return [...products]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n);
}

export function getRelated(product: Product, n = 4): Product[] {
  const categorySlugs = new Set(product.categories.map((category) => category.slug));
  return products
    .filter(
      (candidate) =>
        candidate.id !== product.id &&
        candidate.categories.some((category) => categorySlugs.has(category.slug)),
    )
    .slice(0, n);
}

export function searchAll(query: string): Product[] {
  const normalized = query.trim().toLocaleLowerCase("vi");
  if (!normalized) return [];
  return products
    .filter((product) =>
      [product.name, product.nameEn, product.sku].some((value) =>
        value.toLocaleLowerCase("vi").includes(normalized),
      ),
    )
    .slice(0, 12);
}

export function categoryName(slug: string): string {
  return glossary.categories[slug] ?? slug;
}

export function productDescription(product: Product): string {
  const category = product.categories[0] ? categoryName(product.categories[0].slug) : "dụng cụ";
  return `${product.name}, mã ${product.sku}, thuộc danh mục ${category}. Thông số kỹ thuật và hình ảnh sản phẩm WOKIN dành cho thợ chuyên nghiệp.`;
}

const sortedTermPairs = [...glossary.terms].sort((a, b) => b[0].length - a[0].length);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function translateText(text: string): string {
  let output = text
    .replace(/STOCK NO\./gi, glossary.ui["STOCK NO."])
    .replace(/QTY\.\/CARTON/gi, glossary.ui["QTY./CARTON"])
    .replace(/Brushless Motor/gi, "Động cơ không chổi than")
    .replace(/CE approval/gi, "Chứng nhận CE")
    .replace(/Soft start/gi, "Khởi động êm")
    .replace(/variable speed/gi, "điều tốc")
    .replace(/Blowing Speed/gi, "Tốc độ thổi")
    .replace(/Blowing Volume/gi, "Lưu lượng thổi")
    .replace(/3-Speed control for versatility to switch/gi, "Điều khiển 3 cấp tốc độ linh hoạt")
    .replace(/Folding handle design; 2-in-1 design makes blower &amp; vacuum can be switched at will/gi, "Tay cầm gập; thiết kế 2 trong 1 cho phép chuyển đổi chế độ thổi và hút")
    .replace(/With (\d+)pc dust bag/gi, "Kèm $1 túi chứa bụi")
    .replace(/Tool Only: Battery and Charger not included/gi, "Chỉ thân máy: không kèm pin và bộ sạc");
  for (const [source, target] of Object.entries(glossary.spec_labels).sort(
    (a, b) => b[0].length - a[0].length,
  )) {
    output = output.replace(new RegExp(escapeRegExp(source), "gi"), target);
  }
  for (const [source, target] of sortedTermPairs) {
    output = output.replace(new RegExp(escapeRegExp(source), "gi"), target);
  }
  return output
    .replace(/Brushless Motor/gi, "Động cơ không chổi than")
    .replace(/CE approval/gi, "Chứng nhận CE")
    .replace(/Soft start/gi, "Khởi động êm")
    .replace(/variable speed/gi, "điều tốc")
    .replace(/Blowing Speed/gi, "Tốc độ thổi")
    .replace(/Blowing Volume/gi, "Lưu lượng thổi")
    .replace(/3-Speed control for versatility to switch/gi, "Điều khiển 3 cấp tốc độ linh hoạt")
    .replace(/Folding handle design; 2-in-1 design makes (?:blower|máy thổi) &amp; vacuum can be switched at will/gi, "Tay cầm gập; thiết kế 2 trong 1 cho phép chuyển đổi chế độ thổi và hút")
    .replace(/With (\d+)pc dust bag/gi, "Kèm $1 túi chứa bụi")
    .replace(/Tool Only/gi, "Chỉ thân máy")
    .replace(/(?:Battery|Pin) and Charger not included/gi, "không kèm pin và bộ sạc")
    .replace(/color box/gi, "hộp màu")
    .replace(/\bSIZE\b/gi, "KÍCH THƯỚC")
    .replace(/\bTANK\b/gi, "BÌNH CHỨA")
    .replace(/\bMAX\. RPM\b/gi, "VÒNG\/PHÚT TỐI ĐA")
    .replace(/With (\d+)pc/gi, "Kèm $1 chi tiết");
}

const englishRemainder = /\b(?:and|with|for|from|into|only|not|included|material|steel|iron|aluminum|handle|packing|size|speed|design|motor|control|suitable|surface|blade|cutting|voltage|power|length|diameter|approval|soft|start|blowing|volume|dust|bag|variable|switch|makes|can|will|color|box|chrome|finish|made|high|quality|plastic|rubber|packed|feature|features)\b/i;

function metricSummary(text: string): string {
  const metrics = text.match(/\d+(?:[.,/×x*–-]\d+)*(?:\s?(?:V|W|kW|Hz|rpm|N[.·]?m|mm|cm|m|kg|g|L|min|bar|psi|A|Ah|mAh|°C|°|%|pcs?))?/gi) ?? [];
  return [...new Set(metrics)].join(" · ");
}

function translateSpecLine(rawLine: string): string {
  const raw = rawLine.replace(/&nbsp;|&#160;/gi, " ").replace(/&gt;/gi, ">").trim();
  if (!raw) return "";
  const translated = translateText(raw);
  if (!englishRemainder.test(translated)) return translated.replace(/^>\s*/, "&gt; ");
  const metrics = metricSummary(raw);
  const [rawLabel] = raw.replace(/^>\s*/, "").split(":", 1);
  const translatedLabel = translateText(rawLabel).trim();
  const label = englishRemainder.test(translatedLabel) || translatedLabel === rawLabel
    ? (raw.includes(":") ? "Thông số kỹ thuật" : "Đặc tính kỹ thuật")
    : translatedLabel;
  return `&gt; ${label}${metrics ? `: ${metrics}` : ""}`;
}

export function translatedSpecHtml(html: string): string {
  const withoutScripts = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  const allowed = withoutScripts
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<(?!\/?(?:p|br|table|tbody|thead|tr|td|th|strong|em)\b)[^>]*>/gi, "")
    .replace(/<(p|br|table|tbody|thead|tr|td|th|strong|em)\b[^>]*>/gi, "<$1>");
  const paragraph = allowed.match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? "";
  const lines = paragraph
    .split(/<br\s*\/?\s*>/i)
    .map((line) => translateSpecLine(line.replace(/<[^>]+>/g, "")))
    .filter(Boolean);
  const table = allowed.match(/<table>[\s\S]*?<\/table>/i)?.[0] ?? "";
  const translatedTable = table
    .split(/(<[^>]+>)/g)
    .map((part) => (part.startsWith("<") ? part : translateText(part)))
    .join("");
  return `${lines.length ? `<p>${lines.join("<br>")}</p>` : ""}${translatedTable}`;
}
