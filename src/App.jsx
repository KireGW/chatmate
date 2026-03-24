import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { HeroPanel } from './components/HeroPanel.jsx'
import { SectionTitle } from './components/SectionTitle.jsx'
import { FeedbackDimensionCard } from './components/FeedbackDimensionCard.jsx'
import { TranscriptWorkbench } from './components/TranscriptWorkbench.jsx'
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
  title: 'No recording selected',
  transcript: '',
  insight:
    'Record something in Spanish, then select it and press Analyze to generate feedback from the server.',
  waveform: [10, 16, 12, 18, 14, 20, 14, 11, 17, 13, 19, 12, 16, 10, 14, 11],
  stats: [],
}

function createPendingSnapshot() {
  return {
    title: 'New recording',
    transcript: '',
    insight:
      'This recording has been saved locally. Press Analyze to process it and generate feedback.',
    waveform: [10, 16, 12, 18, 14, 20, 14, 11, 17, 13, 19, 12, 16, 10, 14, 11],
    stats: [],
  }
}

function App() {
  const {
    audioBlob,
    audioUrl,
    error: speechError,
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
      title: trimmedTranscript ? 'New recording' : 'Untitled recording',
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

  const activeMoment = useMemo(() => {
    return (
      analysisState.moments.find((moment) => moment.id === activeMomentId) ??
      analysisState.moments[0] ??
      null
    )
  }, [activeMomentId, analysisState.moments])

  const selectedRecording =
    recordingLibrary.find((item) => item.id === selectedRecordingId) ?? null
  const hasFeedback = Boolean(selectedRecording?.status === 'analyzed')
  const statusMessage =
    speechError ||
    analysisState.error ||
    (selectedRecording?.status === 'saved'
      ? 'This recording is saved locally. Press Analyze to process it and generate feedback.'
      : '')

  function openRecordingState(recording) {
    setSelectedRecordingId(recording.id)
    setAnalysisState({
      isLoading: false,
      error: '',
      snapshot: recording.snapshot,
      dimensions: recording.dimensions,
      moments: recording.moments,
    })
    setActiveMomentId(recording.moments[0]?.id ?? '')
  }

  function openRecording(recordingId) {
    const selected = recordingLibrary.find((item) => item.id === recordingId)

    if (!selected) {
      return
    }

    openRecordingState(selected)
  }

  async function analyzeSelectedRecording() {
    if (!selectedRecording) {
      setAnalysisState((current) => ({
        ...current,
        error: 'Select a recording first.',
      }))
      return
    }

    const finalTranscript = selectedRecording.transcript.trim()

    setAnalysisState((current) => ({
      ...current,
      isLoading: true,
      error: '',
    }))

    try {
      const analysis = await analyzeRecording({
        audioBlob: selectedRecording.audioBlob,
        transcript: finalTranscript,
      })

      setRecordingLibrary((current) =>
        current.map((item) => {
          if (item.id !== selectedRecording.id) {
            return item
          }

          return {
            ...item,
            title: analysis.sessionSnapshot.title,
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
      setActiveMomentId(analysis.coachingMoments[0]?.id ?? '')
    } catch (error) {
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
          setActiveMomentId('')
        }
      }

      return nextLibrary
    })
  }

  return (
    <main className="app-shell">
      <HeroPanel
        audioUrl={audioUrl}
        hasSelectedRecording={Boolean(selectedRecording)}
        isAnalyzing={analysisState.isLoading}
        isRecording={isRecording}
        onAnalyze={analyzeSelectedRecording}
        onStartSession={startSession}
        onStopSession={stopSession}
        selectedRecording={selectedRecording}
        sessionSnapshot={analysisState.snapshot}
        statusMessage={statusMessage}
      />

      <section
        className="section-grid section-grid--split"
        aria-labelledby="library-title"
      >
        <SectionTitle
          eyebrow="Recording library"
          title="Record first, analyze when you are ready"
          description="Each recording is saved locally on this device. Select one from the library and press Analyze to upload it for transcription and Spanish feedback."
          id="library-title"
        />

        <RecordingLibrary
          isLoading={isLibraryLoading}
          items={recordingLibrary}
          onAnalyzeRecording={analyzeSelectedRecording}
          onDeleteRecording={deleteRecording}
          onOpenRecording={openRecording}
          selectedRecordingId={selectedRecordingId}
        />
      </section>

      {hasFeedback ? (
        <>
          <section className="section-grid" aria-labelledby="dimensions-title">
            <SectionTitle
              eyebrow="Feedback"
              title="What to improve in this recording"
              description="The analysis focuses on grammar, flow, idiomacy, and vocabulary for the selected Spanish recording."
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
              eyebrow="Explanation"
              title="See what happened and why"
              description="Each coaching moment shows the original phrasing, a stronger alternative, and the thinking pattern behind the correction."
              id="workbench-title"
            />

            <TranscriptWorkbench
              activeMoment={activeMoment}
              coachingMoments={analysisState.moments}
              onSelectMoment={setActiveMomentId}
            />
          </section>
        </>
      ) : (
        <section className="section-grid" aria-labelledby="analyze-help-title">
          <SectionTitle
            eyebrow="Next step"
            title="Analyze a saved recording to get feedback"
            description="Once a recording is selected, press Analyze to upload it to the server, transcribe it, and generate feedback."
            id="analyze-help-title"
          />
        </section>
      )}
    </main>
  )
}

export default App
