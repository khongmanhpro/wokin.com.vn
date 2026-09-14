import { ResponsiveProductImage } from "@/components/ResponsiveProductImage";
import { responsiveImageMetadata } from "@/lib/responsive-images";

// Server-only: resolves WebP derivatives for full-bleed decorative backgrounds.
export function ResponsiveBackground({ src, priority = false }: { src: string; priority?: boolean }) {
  return <ResponsiveProductImage image={{ src, alt: "", ...responsiveImageMetadata(src) }} alt="" fill sizes="100vw" priority={priority} />;
}
