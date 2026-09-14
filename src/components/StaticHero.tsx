import { ResponsiveBackground } from "@/components/ResponsiveBackground";

export function StaticHero({ title, image, eyebrow }: { title: string; image: string; eyebrow?: string }) {
  return <section className="static-hero">
    <ResponsiveBackground src={image} priority />
    <div className="static-hero-overlay" />
    <div className="container-wokin static-hero-content">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
    </div>
  </section>;
}
