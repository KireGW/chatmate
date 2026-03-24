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

  if (status === 'analyzing') {
    return 'Analyzing'
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
  onOpenTranscript,
  onRenameRecording,
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
                      <p className="chip-label">Recording timestamp</p>
                      <h3>{item.title}</h3>
                      <p className="library-card__summary">
                        {item.summary || 'Summary available after analysis.'}
                      </p>
                    </div>
                  </div>
                </button>

                {item.audioUrl ? (
                  <div className="library-card__audio">
                    <audio controls src={item.audioUrl} className="audio-player">
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                ) : null}

                <div className="library-card__actions">
                  <button
                    type="button"
                    className="library-analyze"
                    onClick={() => onAnalyzeRecording(item.id)}
                    disabled={item.status === 'analyzing'}
                  >
                    {item.status === 'analyzing' ? 'Analyzing...' : 'Analyze'}
                  </button>
                  <button
                    type="button"
                    className="library-secondary"
                    onClick={() => onOpenRecording(item.id)}
                  >
                    Open analysis
                  </button>
                  <button
                    type="button"
                    className="library-secondary"
                    onClick={() => onRenameRecording(item.id)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="library-secondary"
                    onClick={() => onOpenTranscript(item.id)}
                    disabled={!item.transcript}
                  >
                    Transcript
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
