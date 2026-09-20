export function WokinErrorState({ description, title }: { description: string; title: string }) {
  return <section className="wokin-state wokin-state--error" role="alert">
    <h2>{title}</h2>
    <p>{description}</p>
  </section>
}
