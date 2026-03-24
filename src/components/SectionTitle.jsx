export function SectionTitle({ eyebrow, title, description, id }) {
  return (
    <header className="section-title">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      <p className="section-description">{description}</p>
    </header>
  )
}
