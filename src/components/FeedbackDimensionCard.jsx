export function FeedbackDimensionCard({ dimension }) {
  return (
    <article className="dimension-card">
      <p className="dimension-score">{dimension.score}</p>
      <h3>{dimension.title}</h3>
      <p>{dimension.description}</p>
      <ul>
        {dimension.signals.map((signal) => (
          <li key={signal}>{signal}</li>
        ))}
      </ul>
    </article>
  )
}
