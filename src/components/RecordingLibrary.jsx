function formatDate(value) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getStatusLabel(status) {
  if (status === 'analyzed') {
    return 'Feedback ready'
  }

  if (status === 'saved') {
    return 'Saved'
  }

  return 'Recording'
}

export function RecordingLibrary({
  isLoading,
  items,
  onAnalyzeRecording,
  onDeleteRecording,
  onOpenRecording,
  selectedRecordingId,
}) {
  return (
    <div className="library-shell">
      {isLoading ? (
        <article className="analysis-card" role="status">
          <p className="chip-label">Library</p>
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
                  <span className={`library-status library-status--${item.status || 'saved'}`}>
                    {getStatusLabel(item.status)}
                  </span>
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

                  <p className="library-card__transcript">
                    {item.transcript ||
                      'No transcript yet. This recording is saved locally, but feedback cannot be generated yet.'}
                  </p>
                </button>

                <div className="library-card__actions">
                  <button
                    type="button"
                    className="library-analyze"
                    onClick={onAnalyzeRecording}
                    disabled={!isActive}
                  >
                    Analyze
                  </button>
                  <button
                    type="button"
                    className="library-delete"
                    onClick={() => onDeleteRecording(item.id)}
                    aria-label={`Delete recording ${item.title}`}
                  >
                    Remove
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <article className="analysis-card" role="status">
          <p className="chip-label">Library</p>
          <p>
            No saved recordings were found in this browser yet. Record
            something and it will appear here.
          </p>
        </article>
      )}
    </div>
  )
}
