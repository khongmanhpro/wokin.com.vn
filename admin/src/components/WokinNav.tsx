const plannedItems = ['Pages', 'SEO', 'Releases', 'Audit']

export function WokinNav() {
  return (
    <nav className="wokin-planned-nav" aria-label="Planned admin areas">
      <p className="wokin-planned-nav__label">Planned</p>
      <ul>
        {plannedItems.map((item) => (
          <li key={item}>
            <span aria-disabled="true" title="Available in a later roadmap phase">
              {item}
              <small>Later phase</small>
            </span>
          </li>
        ))}
      </ul>
    </nav>
  )
}
