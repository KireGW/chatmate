export function HeroPanel({
  analysisElapsedSeconds,
  analysisProgressPercent,
  audioUrl,
  canAnalyze,
  hasSelectedRecording,
  isAnalyzing,
  isFinalizingCapture,
  isRecording,
  onAnalyze,
  onRenameRecording,
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
        <h1>A speaking coach for deeper Spanish analysis.</h1>
        <p className="hero-description">
          Chatmate is designed to diagnose spoken Spanish with more than surface
          correction. It listens for patterns in grammatical control, delivery,
          idiomacy, and vocabulary range, then explains why those patterns are
          appearing and how to reason your way toward stronger speech.
        </p>

        <div className="hero-actions">
          <button
            type="button"
            className={`primary-action${isRecording ? ' primary-action--recording' : ''}`}
            onClick={isRecording ? onStopSession : onStartSession}
            disabled={isAnalyzing || isFinalizingCapture}
          >
            {isRecording ? 'Stop recording' : 'New recording'}
          </button>
        </div>

        <div className="hero-status">
          <p>
            {isRecording
              ? 'Recording in progress.'
              : isFinalizingCapture
                ? 'Saving the recording.'
              : canAnalyze
                ? 'Recording ready to analyze.'
              : hasSelectedRecording
                  ? 'Recording selected, but still preparing.'
                : 'Start a new recording to hear how your Spanish is landing.'}
          </p>
          <p>
            {isAnalyzing
              ? 'Uploading audio, transcribing it, and preparing a structured analysis.'
              : isRecording
                ? 'Press Stop recording when this speaking turn is complete.'
                : isFinalizingCapture
                  ? 'The recording is being finalized and will appear in Current recording in a moment.'
                : canAnalyze
                    ? ''
                    : hasSelectedRecording
                      ? 'Current recording is still being prepared before analysis becomes available.'
                      : 'Record one speaking turn to create your first sample. Once it is saved, Current recording will appear with playback and analysis controls.'}
          </p>
          {statusMessage ? <p className="hero-status__alert">{statusMessage}</p> : null}
        </div>
      </div>

      {hasSelectedRecording ? (
        <aside
          className="session-card"
          aria-label="Recording window"
        >
          <div className="session-card__header">
            <div>
              <div className="session-card__meta-row">
                <p className="session-label">Selected recording</p>
                <button
                  type="button"
                  className="session-card__rename"
                  onClick={() => onRenameRecording(selectedRecording?.id)}
                >
                  Rename
                </button>
              </div>
              <div className="session-card__title-row">
                <h2>{selectedRecording?.title || 'Current speaking sample'}</h2>
              </div>
              {audioUrl || selectedRecording?.audioUrl ? (
                <div className="audio-panel audio-panel--compact">
                  <span className="chip-label">Playback</span>
                  <audio
                    controls
                    src={audioUrl || selectedRecording?.audioUrl}
                    className="audio-player"
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              ) : null}
            </div>
            <span className="live-indicator">
              {isAnalyzing
                ? 'Analyzing'
                : selectedRecording?.status === 'analyzing'
                  ? 'Analyzing'
                : selectedRecording?.status === 'analyzed'
                  ? 'Feedback ready'
                : 'Saved'}
            </span>
          </div>

          <div className="session-card__actions">
            <button
              type="button"
              className="secondary-action session-card__analyze"
              onClick={() => onAnalyze(selectedRecording?.id)}
              disabled={
                isRecording || isAnalyzing || isFinalizingCapture || !canAnalyze
              }
            >
              {isFinalizingCapture ? 'Saving recording...' : isAnalyzing ? 'Analyzing...' : 'Analyze this recording'}
            </button>

            {isFinalizingCapture ? (
              <div className="analysis-progress analysis-progress--inline" role="status" aria-live="polite">
                <div className="analysis-progress__header">
                  <span className="analysis-progress__dot" />
                  <div>
                    <p className="chip-label">Preparing recording</p>
                    <p className="analysis-progress__time">
                      Finalizing the audio file before analysis becomes available.
                    </p>
                  </div>
                </div>
                <div className="analysis-progress__bar" aria-hidden="true">
                  <span className="analysis-progress__bar-fill" style={{ width: '28%' }} />
                </div>
              </div>
            ) : null}

            {isAnalyzing ? (
              <div className="analysis-progress analysis-progress--inline" role="status" aria-live="polite">
                <div className="analysis-progress__header">
                  <span className="analysis-progress__dot" />
                  <div>
                    <p className="chip-label">Estimated progress</p>
                    <p className="analysis-progress__time">
                      {analysisElapsedSeconds > 0
                        ? `${analysisElapsedSeconds}s elapsed`
                        : 'Starting now'}
                    </p>
                  </div>
                  <strong className="analysis-progress__percent">
                    {analysisProgressPercent}%
                  </strong>
                </div>
                <div className="analysis-progress__bar" aria-hidden="true">
                  <span
                    className="analysis-progress__bar-fill"
                    style={{ width: `${analysisProgressPercent}%` }}
                  />
                </div>
                <div className="analysis-progress__steps">
                  <p className="analysis-progress__step is-active">
                    1. Uploading the recording
                  </p>
                  <p className="analysis-progress__step is-active">
                    2. Transcribing the Spanish
                  </p>
                  <p className="analysis-progress__step is-active">
                    3. Generating the coaching analysis
                  </p>
                </div>
                <div>
                  <p>
                    Estimated progress only. Local transcription and model analysis
                    can be slower on the first run.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="insight-panel">
            <span className="chip-label">Overview</span>
            <p>{sessionSnapshot.insight}</p>
          </div>
        </aside>
      ) : null}
    </section>
  )
}
