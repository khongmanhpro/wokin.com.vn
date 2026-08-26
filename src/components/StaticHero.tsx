import Image from "next/image";

export function StaticHero({ title, image, eyebrow }: { title: string; image: string; eyebrow?: string }) {
  return <section className="static-hero">
    <Image src={image} alt="" fill sizes="100vw" priority />
    <div className="static-hero-overlay" />
    <div className="container-wokin static-hero-content">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
    </div>
  </section>;
}
