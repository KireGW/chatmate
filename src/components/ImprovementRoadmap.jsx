export function ImprovementRoadmap({ roadmapSteps }) {
  return (
    <div className="roadmap">
      {roadmapSteps.map((step, index) => (
        <article key={step.title} className="roadmap-step">
          <span className="roadmap-step__index">0{index + 1}</span>
          <div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        </article>
      ))}
    </div>
  )
}
