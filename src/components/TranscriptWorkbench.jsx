export function TranscriptWorkbench({
  activeMoment,
  coachingMoments,
  onSelectMoment,
}) {
  if (!activeMoment || !coachingMoments.length) {
    return (
      <div className="workbench workbench--empty">
        <article className="analysis-card" role="status">
          <p className="chip-label">Waiting for speech</p>
          <p>
            Start a Spanish speaking turn, then stop recording to generate
            coaching moments here.
          </p>
        </article>
      </div>
    )
  }

  return (
    <div className="workbench">
      <div className="moment-list" role="tablist" aria-label="Coaching moments">
        {coachingMoments.map((moment) => {
          const isActive = moment.id === activeMoment.id

          return (
            <button
              key={moment.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`moment-button${isActive ? ' is-active' : ''}`}
              onClick={() => onSelectMoment(moment.id)}
            >
              <span>{moment.label}</span>
              <strong>{moment.focus}</strong>
            </button>
          )
        })}
      </div>

      <article className="analysis-card" role="tabpanel">
        <div className="analysis-row">
          <div>
            <p className="chip-label">Original</p>
            <p className="analysis-quote">"{activeMoment.original}"</p>
          </div>
          <div>
            <p className="chip-label">Stronger Spanish</p>
            <p className="analysis-quote analysis-quote--accent">
              "{activeMoment.revision}"
            </p>
          </div>
        </div>

        <div className="analysis-grid">
          <div>
            <p className="chip-label">Why it happened</p>
            <p>{activeMoment.why}</p>
          </div>
          <div>
            <p className="chip-label">How to think instead</p>
            <p>{activeMoment.reframe}</p>
          </div>
          <div>
            <p className="chip-label">Quick drill</p>
            <p>{activeMoment.drill}</p>
          </div>
          <div>
            <p className="chip-label">Main category</p>
            <p>{activeMoment.category}</p>
          </div>
        </div>
      </article>
    </div>
  )
}
