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
  blobToDataUrl,
  loadRecordingLibrary,
  saveRecordingLibrary,
} from './lib/recordingLibrary.js'
import { analyzeTranscript } from './services/coachApi.js'
import {
  coachingDimensions as initialDimensions,
  coachingMoments as initialMoments,
  roadmapSteps,
  sessionSnapshot as initialSnapshot,
} from './data/spanishCoach.js'

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
    snapshot: initialSnapshot,
    dimensions: initialDimensions,
    moments: initialMoments,
  })
  const [activeMomentId, setActiveMomentId] = useState(initialMoments[0].id)
  const [recordingLibrary, setRecordingLibrary] = useState(() =>
    loadRecordingLibrary(),
  )
  const [selectedRecordingId, setSelectedRecordingId] = useState('')
  const analyzedSessionKeyRef = useRef('')

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
        const audioDataUrl = await blobToDataUrl(audioBlob)

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
        setRecordingLibrary((current) => {
          const nextItem = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            title: analysis.sessionSnapshot.title,
            transcript: finalTranscript,
            audioDataUrl,
            snapshot: analysis.sessionSnapshot,
            dimensions: analysis.coachingDimensions,
            moments: analysis.coachingMoments,
            stats: analysis.sessionSnapshot.stats,
          }
          const nextLibrary = [nextItem, ...current].slice(0, 20)
          saveRecordingLibrary(nextLibrary)
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
      const nextLibrary = current.filter((item) => item.id !== recordingId)
      saveRecordingLibrary(nextLibrary)

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
          {analysisState.dimensions.map((dimension) => (
            <FeedbackDimensionCard key={dimension.title} dimension={dimension} />
          ))}
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
