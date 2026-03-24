export function HeroPanel({
  audioUrl,
  hasSelectedRecording,
  isAnalyzing,
  isRecording,
  onAnalyze,
  onStartSession,
  onStopSession,
  selectedRecording,
  sessionSnapshot,
  statusMessage,
}) {
  return (
    <section className="hero-panel">
      <div className="hero-copy">
        <p className="eyebrow">Chatmate</p>
        <h1>Record your Spanish. Analyze it when you are ready.</h1>
        <p className="hero-description">
          A simple speaking workflow: make a recording, save it to your library,
          and press Analyze to get structured Spanish feedback.
        </p>

        <div className="hero-actions">
          <button
            type="button"
            className="primary-action"
            onClick={isRecording ? onStopSession : onStartSession}
            disabled={isAnalyzing}
          >
            {isRecording ? 'Stop recording' : 'Start recording'}
          </button>

          <button
            type="button"
            className="secondary-action"
            onClick={onAnalyze}
            disabled={isRecording || isAnalyzing || !hasSelectedRecording}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze selected recording'}
          </button>
        </div>

        <div className="hero-status">
          <p>
            {isRecording
              ? 'Recording in progress.'
              : hasSelectedRecording
                ? 'A recording is selected.'
                : 'No recording selected yet.'}
          </p>
          {statusMessage ? <p className="hero-status__alert">{statusMessage}</p> : null}
        </div>
      </div>

      <aside className="session-card" aria-label="Selected recording preview">
        <div className="session-card__header">
          <div>
            <p className="session-label">Selected recording</p>
            <h2>{sessionSnapshot.title}</h2>
          </div>
          <span className="live-indicator">
            {isRecording
              ? 'Recording'
              : isAnalyzing
                ? 'Analyzing'
                : selectedRecording?.status === 'analyzed'
                  ? 'Feedback ready'
                  : 'Saved'}
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
            <span className="chip-label">Transcript</span>
            <p>
              {sessionSnapshot.transcript ||
                'When a transcript is available, it will appear here.'}
            </p>
          </div>

          <div className="insight-panel">
            <span className="chip-label">Status</span>
            <p>{sessionSnapshot.insight}</p>
          </div>
        </div>

        {audioUrl || selectedRecording?.audioUrl ? (
          <div className="audio-panel">
            <span className="chip-label">Session playback</span>
            <audio
              controls
              src={audioUrl || selectedRecording?.audioUrl}
              className="audio-player"
            >
              Your browser does not support audio playback.
            </audio>
          </div>
        ) : null}
      </aside>
    </section>
  )
}
