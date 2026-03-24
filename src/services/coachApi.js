import { analyzeSpanishTranscript } from '../lib/analyzeSpanish.js'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''

export async function analyzeRecording({ audioBlob, transcript }) {
  if (audioBlob) {
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
      formData.append('language', 'es')

      const response = await fetch(`${apiBaseUrl}/api/analyze-recording`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        return response.json()
      }
    } catch {
      // Fall back to local transcript-only analysis when the backend is unavailable.
    }
  }

  if (typeof transcript === 'string' && transcript.trim()) {
    return analyzeSpanishTranscript(transcript)
  }

  throw new Error(
    'Analysis requires the backend service for audio transcription, or a transcript fallback.',
  )
}
