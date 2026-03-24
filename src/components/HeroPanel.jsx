export function HeroPanel({
  audioUrl,
  isAnalyzing,
  isRecognitionSupported,
  isRecording,
  liveTranscript,
  onStartSession,
  onStopSession,
  sessionSnapshot,
  statusMessage,
}) {
  return (
    <section className="hero-panel">
      <div className="hero-copy">
        <p className="eyebrow">Chatmate</p>
        <h1>Speak Spanish out loud. Get feedback that actually teaches.</h1>
        <p className="hero-description">
          A language coach for spoken practice that listens to what you say and
          responds with thoughtful feedback on grammatical accuracy, flow,
          idiomacy, and vocabulary decisions.
        </p>

        <div className="hero-actions">
          <button
            type="button"
            className="primary-action"
            onClick={isRecording ? onStopSession : onStartSession}
            disabled={isAnalyzing}
          >
            {isRecording ? 'Stop session' : 'Start a Spanish session'}
          </button>
          <button
            type="button"
            className="secondary-action"
            onClick={isRecording ? onStopSession : onStartSession}
            disabled={isAnalyzing}
          >
            {isRecording ? 'Finish and analyze' : 'Start listening now'}
          </button>
        </div>

        <ul className="hero-pill-list" aria-label="Primary coaching outcomes">
          <li>Grammar with reasoning</li>
          <li>Flow and pacing cues</li>
          <li>Idiomacy and tone</li>
          <li>Vocabulary expansion</li>
        </ul>

        <div className="hero-status">
          <p>
            {isRecording
              ? 'Listening for Spanish speech right now.'
              : 'Ready to record a new speaking turn.'}
          </p>
          <p>
            {isAnalyzing
              ? 'Analyzing the last turn and generating coaching moments.'
              : isRecognitionSupported
                ? 'Live transcription is available in this browser.'
                : 'Live transcription is not available in this browser, but recording still works.'}
          </p>
          {statusMessage ? <p className="hero-status__alert">{statusMessage}</p> : null}
        </div>
      </div>

      <aside className="session-card" aria-label="Live session preview">
        <div className="session-card__header">
          <div>
            <p className="session-label">Live Spanish session</p>
            <h2>{sessionSnapshot.title}</h2>
          </div>
          <span className="live-indicator">
            {isRecording ? 'Listening' : isAnalyzing ? 'Analyzing' : 'Ready'}
          </span>
        </div>

        <div className="waveform" aria-hidden="true">
          {sessionSnapshot.waveform.map((height, index) => (
            <span
              key={index}
              className="waveform__bar"
              style={{
                height: `${height}px`,
                animationDelay: `${index * 60}ms`,
              }}
            />
          ))}
        </div>

        <div className="session-card__body">
          <div className="transcript-chip">
            <span className="chip-label">
              {isRecording ? 'Live transcript' : 'You said'}
            </span>
            <p>
              {liveTranscript ||
                sessionSnapshot.transcript ||
                'Your latest Spanish speaking turn will appear here.'}
            </p>
          </div>

          <div className="insight-panel">
            <span className="chip-label">Coach insight</span>
            <p>{sessionSnapshot.insight}</p>
          </div>
        </div>

        {audioUrl ? (
          <div className="audio-panel">
            <span className="chip-label">Session playback</span>
            <audio controls src={audioUrl} className="audio-player">
              Your browser does not support audio playback.
            </audio>
          </div>
        ) : null}

        <dl className="session-stats">
          {sessionSnapshot.stats.length ? (
            sessionSnapshot.stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))
          ) : (
            <div className="session-stats__empty">
              <dt>Library</dt>
              <dd>
                {audioUrl
                  ? 'This recording is ready to be analyzed.'
                  : 'Open a saved recording or make a new one to see stats.'}
              </dd>
            </div>
          )}
        </dl>
      </aside>
    </section>
  )
}
