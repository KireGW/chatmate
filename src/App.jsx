import { useEffect, useRef, useState } from 'react'
import './App.css'
import { HeroPanel } from './components/HeroPanel.jsx'
import { SectionTitle } from './components/SectionTitle.jsx'
import { FeedbackDimensionCard } from './components/FeedbackDimensionCard.jsx'
import { RecordingLibrary } from './components/RecordingLibrary.jsx'
import { useSpeechCoach } from './hooks/useSpeechCoach.js'
import {
  createLibraryRecordingAudioUrl,
  loadRecordingLibrary,
  revokeRecordingLibraryUrls,
  saveRecordingLibrary,
} from './lib/recordingLibrary.js'
import { analyzeRecording } from './services/coachApi.js'

const emptySnapshot = {
  title: 'No recording yet',
  transcript: '',
  insight:
    'Record a Spanish speaking turn to receive structured, pedagogically focused feedback on grammar, flow, idiomacy, and lexical choice.',
  waveform: [10, 16, 12, 18, 14, 20, 14, 11, 17, 13, 19, 12, 16, 10, 14, 11],
  stats: [],
}

function createPendingSnapshot() {
  return {
    title: 'Latest recording',
    transcript: '',
    insight:
      'Recording saved. Press Analyze to produce a fuller diagnostic reading of the speaking turn.',
    waveform: [10, 16, 12, 18, 14, 20, 14, 11, 17, 13, 19, 12, 16, 10, 14, 11],
    stats: [],
  }
}

function formatRecordingTitle(value) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function createRecordingSummary(snapshot) {
  if (typeof snapshot?.title === 'string' && snapshot.title.trim()) {
    return snapshot.title.trim()
  }

  if (typeof snapshot?.insight === 'string' && snapshot.insight.trim()) {
    const firstSentence = snapshot.insight.trim().split(/(?<=[.!?])\s+/)[0]
    return firstSentence || snapshot.insight.trim()
  }

  return 'Summary available after analysis.'
}

function createExcerpt(text, maxLength = 140) {
  const cleaned = text.trim().replace(/\s+/g, ' ')

  if (!cleaned) {
    return ''
  }

  if (cleaned.length <= maxLength) {
    return cleaned
  }

  return `${cleaned.slice(0, maxLength).trimEnd()}...`
}

function estimateAnalysisProgress(elapsedSeconds) {
  if (elapsedSeconds <= 0) {
    return 3
  }

  const projected = Math.round(100 * (1 - Math.exp(-elapsedSeconds / 22)))
  return Math.max(3, Math.min(96, projected))
}

const canonicalDimensions = [
  {
    key: 'grammar',
    title: 'Grammatical Acuteness',
    score: '01',
    match: /grammatical acuteness|grammar|dimension 1/i,
  },
  {
    key: 'flow',
    title: 'Flow',
    score: '02',
    match: /flow|dimension 2/i,
  },
  {
    key: 'idiomacy',
    title: 'Idiomacy',
    score: '03',
    match: /idiomacy|idiomatic|dimension 3/i,
  },
  {
    key: 'vocabulary',
    title: 'Vocabulary Range',
    score: '04',
    match: /vocabulary range|vocabulary|lexical|dimension 4/i,
  },
]

function normalizeDisplayedDimensions(dimensions) {
  return canonicalDimensions.map((canonical, index) => {
    const matched =
      dimensions.find((dimension) => canonical.match.test(dimension?.title || '')) ||
      dimensions[index] ||
      {}

    return {
      ...matched,
      title: canonical.title,
      score: matched?.score || canonical.score,
      description:
        matched?.description ||
        'This area has been identified as part of the coaching profile for the current recording.',
      signals:
        Array.isArray(matched?.signals) && matched.signals.length
          ? matched.signals
          : ['Detailed evidence for this dimension was not returned.'],
    }
  })
}

function App() {
  const {
    audioBlob,
    audioUrl,
    error: speechError,
    isFinalizingCapture,
    isRecording,
    startSession,
    stopSession,
    transcript,
  } = useSpeechCoach()
  const [analysisState, setAnalysisState] = useState({
    isLoading: false,
    error: '',
    snapshot: emptySnapshot,
    dimensions: [],
    moments: [],
  })
  const [isLibraryLoading, setIsLibraryLoading] = useState(true)
  const [recordingLibrary, setRecordingLibrary] = useState([])
  const [selectedRecordingId, setSelectedRecordingId] = useState('')
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false)
  const [transcriptModalRecording, setTranscriptModalRecording] = useState(null)
  const [analysisElapsedSeconds, setAnalysisElapsedSeconds] = useState(0)
  const feedbackSectionRef = useRef(null)
  const recordingLibraryRef = useRef([])

  useEffect(() => {
    recordingLibraryRef.current = recordingLibrary
  }, [recordingLibrary])

  useEffect(() => {
    let ignore = false

    async function initializeLibrary() {
      try {
        const items = await loadRecordingLibrary()

        if (ignore) {
          revokeRecordingLibraryUrls(items)
          return
        }

        setRecordingLibrary(items)
      } finally {
        if (!ignore) {
          setIsLibraryLoading(false)
        }
      }
    }

    initializeLibrary()

    return () => {
      ignore = true
      revokeRecordingLibraryUrls(recordingLibraryRef.current)
    }
  }, [])

  useEffect(() => {
    if (!recordingLibrary.length || selectedRecordingId) {
      return
    }

    const latestRecording = recordingLibrary[0]
    openRecordingState(latestRecording)
  }, [recordingLibrary, selectedRecordingId])

  useEffect(() => {
    if (!audioBlob) {
      return
    }

    const trimmedTranscript = transcript.trim()
    const pendingSnapshot = {
      ...createPendingSnapshot(),
      transcript: trimmedTranscript,
    }
    const pendingItem = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      title: formatRecordingTitle(new Date().toISOString()),
      summary: 'Summary available after analysis.',
      transcript: trimmedTranscript,
      audioBlob,
      audioUrl: createLibraryRecordingAudioUrl(audioBlob),
      snapshot: pendingSnapshot,
      dimensions: [],
      moments: [],
      stats: [],
      status: 'saved',
    }

    setRecordingLibrary((current) => {
      const nextLibrary = [pendingItem, ...current].slice(0, 20)
      const removedItems = [pendingItem, ...current].slice(20)

      removedItems.forEach((item) => {
        if (item.audioUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(item.audioUrl)
        }
      })

      return nextLibrary
    })

    openRecordingState(pendingItem)
  }, [audioBlob, transcript])

  useEffect(() => {
    if (!isLibraryLoading) {
      saveRecordingLibrary(recordingLibrary)
    }
  }, [isLibraryLoading, recordingLibrary])

  const selectedRecording =
    recordingLibrary.find((item) => item.id === selectedRecordingId) ?? null
  const hasFeedback = Boolean(selectedRecording?.status === 'analyzed')
  const displayedDimensions = normalizeDisplayedDimensions(analysisState.dimensions)
  const analysisProgressPercent = estimateAnalysisProgress(analysisElapsedSeconds)
  const statusMessage =
    speechError ||
    analysisState.error ||
    (isFinalizingCapture
      ? 'Finishing the recording and saving it on this device. Analyze will unlock in a moment.'
      : '') ||
    (selectedRecording?.status === 'saved'
      ? 'This recording is saved locally. Press Analyze to process it and generate feedback.'
      : '')

  useEffect(() => {
    if (!hasFeedback || analysisState.isLoading || !feedbackSectionRef.current) {
      return
    }

    feedbackSectionRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [analysisState.isLoading, hasFeedback])

  useEffect(() => {
    if (!analysisState.isLoading) {
      setAnalysisElapsedSeconds(0)
      return
    }

    const startedAt = Date.now()
    const intervalId = window.setInterval(() => {
      setAnalysisElapsedSeconds(Math.max(1, Math.floor((Date.now() - startedAt) / 1000)))
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [analysisState.isLoading])

  useEffect(() => {
    if (!isTranscriptOpen) {
      setTranscriptModalRecording(null)
      return
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeTranscriptModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isTranscriptOpen])

  function openRecordingState(recording) {
    setSelectedRecordingId(recording.id)
    setAnalysisState({
      isLoading: false,
      error: '',
      snapshot: recording.snapshot,
      dimensions: recording.dimensions,
      moments: recording.moments,
    })
  }

  function openRecording(recordingId) {
    const selected = recordingLibrary.find((item) => item.id === recordingId)

    if (!selected) {
      return
    }

    openRecordingState(selected)
  }

  function openTranscript(recordingId) {
    const selected = recordingLibrary.find((item) => item.id === recordingId)

    if (!selected?.transcript) {
      return
    }

    setTranscriptModalRecording(selected)
    setIsTranscriptOpen(true)
  }

  function closeTranscriptModal() {
    setIsTranscriptOpen(false)
    setTranscriptModalRecording(null)
  }

  function deleteRecording(recordingId) {
    setRecordingLibrary((current) => {
      const removedItem = current.find((item) => item.id === recordingId)
      const nextLibrary = current.filter((item) => item.id !== recordingId)

      if (removedItem?.audioUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(removedItem.audioUrl)
      }

      if (transcriptModalRecording?.id === recordingId) {
        setTranscriptModalRecording(null)
        setIsTranscriptOpen(false)
      }

      if (selectedRecordingId === recordingId) {
        const fallback = nextLibrary[0]

        if (fallback) {
          openRecordingState(fallback)
        } else {
          setSelectedRecordingId('')
          setAnalysisState({
            isLoading: false,
            error: '',
            snapshot: emptySnapshot,
            dimensions: [],
            moments: [],
          })
        }
      }

      return nextLibrary
    })
  }

  async function analyzeSelectedRecording(recordingId) {
    const recordingToAnalyze = recordingId
      ? recordingLibrary.find((item) => item.id === recordingId) ?? null
      : selectedRecording

    if (!recordingToAnalyze) {
      setAnalysisState((current) => ({
        ...current,
        error: 'Select a recording first.',
      }))
      return
    }

    const finalTranscript = recordingToAnalyze.transcript.trim()

    if (recordingToAnalyze.id !== selectedRecordingId) {
      openRecordingState(recordingToAnalyze)
    }

    setAnalysisState((current) => ({
      ...current,
      isLoading: true,
      error: '',
    }))

    setRecordingLibrary((current) =>
      current.map((item) =>
        item.id === recordingToAnalyze.id
          ? {
              ...item,
              status: 'analyzing',
            }
          : item,
      ),
    )

    try {
      const analysis = await analyzeRecording({
        audioBlob: selectedRecording.audioBlob,
        transcript: finalTranscript,
      })

      setRecordingLibrary((current) =>
        current.map((item) => {
          if (item.id !== recordingToAnalyze.id) {
            return item
          }

          return {
            ...item,
            title: item.title || formatRecordingTitle(item.createdAt),
            summary: createRecordingSummary(analysis.sessionSnapshot),
            transcript: finalTranscript,
            snapshot: analysis.sessionSnapshot,
            dimensions: analysis.coachingDimensions,
            moments: analysis.coachingMoments,
            stats: analysis.sessionSnapshot.stats,
            status: 'analyzed',
          }
        }),
      )

      setAnalysisState({
        isLoading: false,
        error: '',
        snapshot: analysis.sessionSnapshot,
        dimensions: analysis.coachingDimensions,
        moments: analysis.coachingMoments,
      })
    } catch (error) {
      setRecordingLibrary((current) =>
        current.map((item) =>
          item.id === recordingToAnalyze.id
            ? {
                ...item,
                status: 'saved',
              }
            : item,
        ),
      )

      setAnalysisState((current) => ({
        ...current,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to analyze the selected recording.',
      }))
    }
  }

  return (
    <main className="app-shell">
      <HeroPanel
        audioUrl={audioUrl}
        hasSelectedRecording={Boolean(selectedRecording)}
        isAnalyzing={analysisState.isLoading}
        isFinalizingCapture={isFinalizingCapture}
        isRecording={isRecording}
        onAnalyze={analyzeSelectedRecording}
        onStartSession={startSession}
        onStopSession={stopSession}
        selectedRecording={selectedRecording}
        sessionSnapshot={analysisState.snapshot}
        statusMessage={statusMessage}
        analysisElapsedSeconds={analysisElapsedSeconds}
        analysisProgressPercent={analysisProgressPercent}
      />

      {hasFeedback ? (
        <section
          ref={feedbackSectionRef}
          className="section-grid"
          aria-labelledby="results-title"
        >
          <SectionTitle
            eyebrow="Analysis"
            title="A diagnostic reading of this speaking turn"
            description="The analysis below is designed to go beyond correction and explain the underlying patterns shaping grammatical accuracy, flow, idiomacy, and vocabulary choice."
            id="results-title"
          />

          {analysisState.snapshot.transcript ? (
            <div className="analysis-toolbar">
              <button
                type="button"
                className="secondary-action analysis-toolbar__button"
                onClick={() => setIsTranscriptOpen(true)}
              >
                View full transcript
              </button>
            </div>
          ) : null}

          <div className="dimension-grid">
            {displayedDimensions.map((dimension) => (
              <FeedbackDimensionCard key={dimension.title} dimension={dimension} />
            ))}
          </div>

          <div className="coaching-grid">
            {analysisState.moments.map((moment) => (
              <article key={moment.id} className="analysis-card coaching-card">
                <p className="chip-label">{moment.category}</p>
                <h3>{moment.focus}</h3>
                <div className="analysis-example-grid">
                  <div>
                    <p className="chip-label">From your recording</p>
                    <p className="analysis-quote">"{createExcerpt(moment.original)}"</p>
                  </div>
                  <div>
                    <p className="chip-label">Stronger Spanish</p>
                    <p className="analysis-quote analysis-quote--accent">
                      "{createExcerpt(moment.revision)}"
                    </p>
                  </div>
                </div>
                <div className="analysis-grid">
                  <div>
                    <p className="chip-label">Why it happened</p>
                    <p>{moment.why}</p>
                  </div>
                  <div>
                    <p className="chip-label">How to think instead</p>
                    <p>{moment.reframe}</p>
                  </div>
                  <div>
                    <p className="chip-label">Practice cue</p>
                    <p>{moment.drill}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="section-grid" aria-labelledby="analyze-help-title">
          <SectionTitle
            eyebrow="Next step"
            title="Record a speaking turn, then generate the analysis"
            description="Once you stop recording, press Analyze to produce a structured commentary on what happened in the Spanish, why those patterns appeared, and how to think more effectively the next time you speak."
            id="analyze-help-title"
          />
        </section>
      )}

      <section className="section-grid" aria-labelledby="library-title">
        <SectionTitle
          eyebrow="Library"
          title="Previous recordings"
          description="Use the archive to replay older recordings, reopen their analysis, read the transcript, or remove them from this device."
          id="library-title"
        />

        <RecordingLibrary
          isLoading={isLibraryLoading}
          items={recordingLibrary}
          onAnalyzeRecording={analyzeSelectedRecording}
          onDeleteRecording={deleteRecording}
          onOpenRecording={openRecording}
          onOpenTranscript={openTranscript}
          selectedRecordingId={selectedRecordingId}
        />
      </section>

      {isTranscriptOpen ? (
        <div
          className="transcript-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transcript-title"
        >
          <button
            type="button"
            className="transcript-modal__backdrop"
            aria-label="Close transcript"
            onClick={closeTranscriptModal}
          />
          <div className="transcript-modal__panel">
            <div className="transcript-modal__header">
              <div>
                <p className="eyebrow">Transcript</p>
                <h2 id="transcript-title">
                  {transcriptModalRecording?.title || 'Full transcript'}
                </h2>
              </div>
              <button
                type="button"
                className="secondary-action transcript-modal__close"
                onClick={closeTranscriptModal}
              >
                Close
              </button>
            </div>
            <div className="transcript-modal__body">
              <p>{transcriptModalRecording?.transcript || analysisState.snapshot.transcript}</p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default App
