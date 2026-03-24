function formatDate(value) {
  return new Intl.DateTimeFormat('sv-SE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function RecordingLibrary({
  isLoading,
  items,
  onDeleteRecording,
  onOpenRecording,
  selectedRecordingId,
}) {
  return (
    <div className="library-shell">
      {isLoading ? (
        <article className="analysis-card" role="status">
          <p className="chip-label">Bibliotek</p>
          <p>Loading your saved recordings...</p>
        </article>
      ) : items.length ? (
        <div className="library-list">
          {items.map((item) => {
            const isActive = item.id === selectedRecordingId

            return (
              <article
                key={item.id}
                className={`library-card${isActive ? ' is-active' : ''}`}
              >
                <div className="library-card__toolbar">
                  <span className="library-card__date">
                    {formatDate(item.createdAt)}
                  </span>
                  <button
                    type="button"
                    className="library-delete"
                    onClick={() => onDeleteRecording(item.id)}
                    aria-label={`Delete recording ${item.title}`}
                  >
                    Remove
                  </button>
                </div>

                <button
                  type="button"
                  className="library-card__button"
                  onClick={() => onOpenRecording(item.id)}
                >
                  <div className="library-card__header">
                    <div>
                      <p className="chip-label">Recording</p>
                      <h3>{item.title}</h3>
                    </div>
                  </div>

                  <p className="library-card__transcript">{item.transcript}</p>

                  <dl className="library-card__stats">
                    {item.stats.map((stat) => (
                      <div key={stat.label}>
                        <dt>{stat.label}</dt>
                        <dd>{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                </button>

                {item.audioUrl ? (
                  <audio controls src={item.audioUrl} className="audio-player">
                    Your browser does not support audio playback.
                  </audio>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <article className="analysis-card" role="status">
          <p className="chip-label">Bibliotek</p>
          <p>
            Inga sparade inspelningar hittades i den här webbläsaren ännu. När
            du spelar in något sparas det här med en automatisk titel.
          </p>
        </article>
      )}
    </div>
  )
}
