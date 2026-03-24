import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { HeroPanel } from './components/HeroPanel.jsx'
import { SectionTitle } from './components/SectionTitle.jsx'
import { FeedbackDimensionCard } from './components/FeedbackDimensionCard.jsx'
import { TranscriptWorkbench } from './components/TranscriptWorkbench.jsx'
import { ImprovementRoadmap } from './components/ImprovementRoadmap.jsx'
import { RecordingLibrary } from './components/RecordingLibrary.jsx'
import { useSpeechCoach } from './hooks/useSpeechCoach.js'
import {
  createLibraryRecordingAudioUrl,
  loadRecordingLibrary,
  revokeRecordingLibraryUrls,
  saveRecordingLibrary,
} from './lib/recordingLibrary.js'
import { analyzeTranscript } from './services/coachApi.js'
import { roadmapSteps } from './data/spanishCoach.js'

const emptySnapshot = {
  title: 'No recording selected',
  transcript: '',
  insight:
    'Start a new recording or open one from your library to see transcript feedback here.',
  waveform: [10, 16, 12, 18, 14, 20, 14, 11, 17, 13, 19, 12, 16, 10, 14, 11],
  stats: [],
}

function App() {
  const {
    audioBlob,
    audioUrl,
    error: speechError,
    interimTranscript,
    isRecognitionSupported,
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
  const [activeMomentId, setActiveMomentId] = useState('')
  const [isLibraryLoading, setIsLibraryLoading] = useState(true)
  const [recordingLibrary, setRecordingLibrary] = useState([])
  const [selectedRecordingId, setSelectedRecordingId] = useState('')
  const analyzedSessionKeyRef = useRef('')
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
    setSelectedRecordingId(latestRecording.id)
    setAnalysisState({
      isLoading: false,
      error: '',
      snapshot: latestRecording.snapshot,
      dimensions: latestRecording.dimensions,
      moments: latestRecording.moments,
    })
    setActiveMomentId(latestRecording.moments[0]?.id ?? '')
  }, [recordingLibrary, selectedRecordingId])

  useEffect(() => {
    const finalTranscript = transcript.trim()
    const sessionKey = audioBlob ? `${audioBlob.size}-${finalTranscript}` : ''

    if (!finalTranscript || !audioBlob || analyzedSessionKeyRef.current === sessionKey) {
      return
    }

    analyzedSessionKeyRef.current = sessionKey

    let ignore = false

    async function runAnalysis() {
      setAnalysisState((current) => ({
        ...current,
        isLoading: true,
        error: '',
      }))

      try {
        const analysis = await analyzeTranscript(finalTranscript)

        if (ignore) {
          return
        }

        setAnalysisState({
          isLoading: false,
          error: '',
          snapshot: analysis.sessionSnapshot,
          dimensions: analysis.coachingDimensions,
          moments: analysis.coachingMoments,
        })
        setActiveMomentId(analysis.coachingMoments[0]?.id ?? '')
        const nextItem = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          title: analysis.sessionSnapshot.title,
          transcript: finalTranscript,
          audioBlob,
          audioUrl: createLibraryRecordingAudioUrl(audioBlob),
          snapshot: analysis.sessionSnapshot,
          dimensions: analysis.coachingDimensions,
          moments: analysis.coachingMoments,
          stats: analysis.sessionSnapshot.stats,
        }
        setRecordingLibrary((current) => {
          const nextLibrary = [nextItem, ...current].slice(0, 20)
          const removedItems = [nextItem, ...current].slice(20)

          removedItems.forEach((item) => {
            if (item.audioUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(item.audioUrl)
            }
          })

          setSelectedRecordingId(nextItem.id)
          return nextLibrary
        })
      } catch (error) {
        if (ignore) {
          return
        }

        analyzedSessionKeyRef.current = ''
        setAnalysisState((current) => ({
          ...current,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to analyze the latest speaking turn.',
        }))
      }
    }

    runAnalysis()

    return () => {
      ignore = true
    }
  }, [audioBlob, transcript])

  useEffect(() => {
    if (!isLibraryLoading) {
      saveRecordingLibrary(recordingLibrary)
    }
  }, [isLibraryLoading, recordingLibrary])

  const activeMoment = useMemo(() => {
    return (
      analysisState.moments.find((moment) => moment.id === activeMomentId) ??
      analysisState.moments[0] ??
      null
    )
  }, [activeMomentId, analysisState.moments])

  const liveTranscript = transcript || interimTranscript
  const statusMessage = speechError || analysisState.error

  function openRecording(recordingId) {
    const selected = recordingLibrary.find((item) => item.id === recordingId)

    if (!selected) {
      return
    }

    setSelectedRecordingId(recordingId)
    setAnalysisState({
      isLoading: false,
      error: '',
      snapshot: selected.snapshot,
      dimensions: selected.dimensions,
      moments: selected.moments,
    })
    setActiveMomentId(selected.moments[0]?.id ?? '')
  }

  function deleteRecording(recordingId) {
    setRecordingLibrary((current) => {
      const removedItem = current.find((item) => item.id === recordingId)
      const nextLibrary = current.filter((item) => item.id !== recordingId)

      if (removedItem?.audioUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(removedItem.audioUrl)
      }

      if (selectedRecordingId === recordingId) {
        const fallback = nextLibrary[0]

        if (fallback) {
          setSelectedRecordingId(fallback.id)
          setAnalysisState({
            isLoading: false,
            error: '',
            snapshot: fallback.snapshot,
            dimensions: fallback.dimensions,
            moments: fallback.moments,
          })
          setActiveMomentId(fallback.moments[0]?.id ?? '')
        } else {
          setSelectedRecordingId('')
        }
      }

      return nextLibrary
    })
  }

  return (
    <main className="app-shell">
      <HeroPanel
        audioUrl={audioUrl}
        isAnalyzing={analysisState.isLoading}
        isRecognitionSupported={isRecognitionSupported}
        isRecording={isRecording}
        liveTranscript={liveTranscript}
        onStartSession={startSession}
        onStopSession={stopSession}
        sessionSnapshot={analysisState.snapshot}
        statusMessage={statusMessage}
      />

      <section className="section-grid" aria-labelledby="dimensions-title">
        <SectionTitle
          eyebrow="Spanish-first coaching"
          title="Feedback that teaches you how to think in Spanish"
          description="Chatmate listens while you speak, then explains the deeper reason behind each issue across grammar, flow, idiomacy, and word choice."
          id="dimensions-title"
        />

        <div className="dimension-grid">
          {analysisState.dimensions.length ? (
            analysisState.dimensions.map((dimension) => (
              <FeedbackDimensionCard key={dimension.title} dimension={dimension} />
            ))
          ) : (
            <article className="analysis-card" role="status">
              <p className="chip-label">No feedback yet</p>
              <p>
                When you record a session, grammar, flow, idiomacy, and
                vocabulary feedback will appear here.
              </p>
            </article>
          )}
        </div>
      </section>

      <section
        className="section-grid section-grid--split"
        aria-labelledby="workbench-title"
      >
        <SectionTitle
          eyebrow="Session workbench"
          title="Replay a spoken moment and unpack what happened"
          description="Each speaking turn is turned into coachable moments with a stronger version, the hidden reason for the issue, and a concrete way to practice."
          id="workbench-title"
        />

        <TranscriptWorkbench
          activeMoment={activeMoment}
          coachingMoments={analysisState.moments}
          onSelectMoment={setActiveMomentId}
        />
      </section>

      <section
        className="section-grid section-grid--split"
        aria-labelledby="roadmap-title"
      >
        <SectionTitle
          eyebrow="Practice loop"
          title="Build sharper instincts, not just cleaner sentences"
          description="This prototype already captures speech, produces a transcript, and returns structured coaching. The next step is swapping the heuristic backend for a stronger AI analysis pipeline."
          id="roadmap-title"
        />

        <ImprovementRoadmap roadmapSteps={roadmapSteps} />
      </section>

      <section
        className="section-grid section-grid--split"
        aria-labelledby="library-title"
      >
        <SectionTitle
          eyebrow="Recording library"
          title="Tidigare inspelningar, organiserade efter innehåll"
          description="Varje inspelning sparas lokalt i webbläsaren med en automatisk titel baserad på vad du pratade om, så att du snabbt kan hitta tillbaka till rätt session."
          id="library-title"
        />

        <RecordingLibrary
          isLoading={isLibraryLoading}
          items={recordingLibrary}
          onDeleteRecording={deleteRecording}
          onOpenRecording={openRecording}
          selectedRecordingId={selectedRecordingId}
        />
      </section>
    </main>
  )
}

export default App
