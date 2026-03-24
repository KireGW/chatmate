export function FeedbackDimensionCard({ dimension }) {
  return (
    <article className="dimension-card">
      <div className="dimension-card__header">
        <p className="dimension-score">{dimension.score}</p>
        <h3>{dimension.title}</h3>
      </div>
      <p className="dimension-card__description">{dimension.description}</p>
      <ul>
        {dimension.signals.map((signal) => (
          <li key={signal}>{signal}</li>
        ))}
      </ul>
    </article>
  )
}
