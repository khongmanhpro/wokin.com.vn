import { ResponsiveBackground } from "@/components/ResponsiveBackground";

export function StaticHero({ title, image, eyebrow }: { title: string; image: string; eyebrow?: string }) {
  return <section className="static-hero">
    <ResponsiveBackground src={image} priority />
    <div className="static-hero-overlay" />
    <div className="container-wokin static-hero-content">
      <h1>{eyebrow && <><span className="eyebrow">{eyebrow}</span>{" "}</>}<span className="static-hero-title">{title}</span></h1>
    </div>
  </section>;
}
