import type { ReactNode } from 'react'

export function WokinEmptyState({ description, title, children }: { description: string; title: string; children?: ReactNode }) {
  return <section className="wokin-state wokin-state--empty" role="status">
    <h2>{title}</h2>
    <p>{description}</p>
    {children}
  </section>
}
