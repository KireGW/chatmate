import { useEffect, useRef, useState } from 'react'

function getRecognitionConstructor() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useSpeechCoach() {
  const mediaRecorderRef = useRef(null)
  const recognitionRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const transcriptRef = useRef('')
  const [audioUrl, setAudioUrl] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  const [error, setError] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isRecognitionSupported] = useState(() =>
    Boolean(getRecognitionConstructor()),
  )
  const [isFinalizingCapture, setIsFinalizingCapture] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')

  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current

      if (recognition) {
        recognition.onresult = null
        recognition.onerror = null
        recognition.onend = null
        recognition.stop()
      }

      const recorder = mediaRecorderRef.current

      if (recorder && recorder.state !== 'inactive') {
        recorder.stop()
      }

      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  async function startSession() {
    setError('')
    setTranscript('')
    setInterimTranscript('')
    setAudioBlob(null)
    setIsFinalizingCapture(false)
    transcriptRef.current = ''

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl('')
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        if (!chunksRef.current.length) {
          setIsFinalizingCapture(false)
          return
        }

        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        const nextUrl = URL.createObjectURL(audioBlob)
        setAudioBlob(audioBlob)
        setAudioUrl(nextUrl)
        setIsFinalizingCapture(false)
        streamRef.current?.getTracks().forEach((track) => track.stop())
      }

      recorder.start()

      const Recognition = getRecognitionConstructor()

      if (Recognition) {
        const recognition = new Recognition()
        recognition.lang = 'es-ES'
        recognition.continuous = true
        recognition.interimResults = true
        recognition.maxAlternatives = 1

        recognition.onresult = (event) => {
          let nextFinal = ''
          let nextInterim = ''

          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const value = event.results[index][0]?.transcript ?? ''

            if (event.results[index].isFinal) {
              nextFinal += value
            } else {
              nextInterim += value
            }
          }

          if (nextFinal) {
            setTranscript((current) => `${current} ${nextFinal}`.trim())
          }

          setInterimTranscript(nextInterim.trim())
        }

        recognition.onerror = (event) => {
          setError(
            event.error === 'not-allowed'
              ? 'Microphone permission was denied.'
              : 'Speech recognition stopped unexpectedly. You can still play back the recording.',
          )
        }

        recognition.onend = () => {
          recognitionRef.current = null
        }

        recognition.start()
        recognitionRef.current = recognition
      } else {
        setError(
          'Live Spanish transcription is not supported in this browser yet. Recording still works, and the backend can be connected to real transcription next.',
        )
      }

      setIsRecording(true)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to start microphone capture.',
      )
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }

  function stopSession() {
    if (mediaRecorderRef.current?.state === 'recording') {
      setIsFinalizingCapture(true)
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    } else {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }

    setInterimTranscript('')
    setIsRecording(false)
  }

  return {
    audioBlob,
    audioUrl,
    error,
    interimTranscript,
    isFinalizingCapture,
    isRecognitionSupported,
    isRecording,
    startSession,
    stopSession,
    transcript,
  }
}
