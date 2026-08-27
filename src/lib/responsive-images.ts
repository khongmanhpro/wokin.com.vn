import imageMetadataJson from "@/data/image-metadata.generated.json";

export interface ResponsiveImageVariant {
  src: string;
  width: number;
}

export interface ResponsiveImageMetadata {
  height: number;
  variants: ResponsiveImageVariant[];
  width: number;
}

const imageMetadata = imageMetadataJson as unknown as Record<string, [number, number, string?]>;
const standardWidths = [320, 480, 640, 800, 1200] as const;

function derivativeWidths(sourceWidth: number): number[] {
  const cap = Math.min(sourceWidth, 1200);
  const widths = standardWidths.filter((width) => width <= cap);
  if (!widths.includes(cap as (typeof standardWidths)[number])) widths.push(cap as (typeof standardWidths)[number]);
  return widths;
}

function derivativeSrc(source: string, width: number): string {
  const relative = source.slice("/images/products/".length);
  const slash = relative.lastIndexOf("/");
  const directory = slash === -1 ? "" : relative.slice(0, slash + 1);
  const filename = slash === -1 ? relative : relative.slice(slash + 1);
  const extension = filename.lastIndexOf(".");
  const stem = extension === -1 ? filename : filename.slice(0, extension);
  return `/images/products-responsive/${directory}${stem}-w${width}.webp`;
}

export function responsiveImageMetadata(source: string): ResponsiveImageMetadata | undefined {
  const dimensions = imageMetadata[source];
  if (!dimensions || !source.startsWith("/images/products/")) return undefined;
  const [width, height] = dimensions;
  return {
    height,
    variants: derivativeWidths(width).map((variantWidth) => ({
      src: derivativeSrc(source, variantWidth),
      width: variantWidth,
    })),
    width,
  };
}
