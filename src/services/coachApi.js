const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''

export async function analyzeRecording({ audioBlob, language = 'es' }) {
  if (!audioBlob) {
    throw new Error('No recording is available to analyze.')
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => {
    controller.abort()
  }, 90000)

  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.webm')
  formData.append('language', language)

  let response

  try {
    response = await fetch(`${apiBaseUrl}/api/analyze-recording`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'The analysis timed out. Please try a shorter recording or check whether the local model stack is still running.',
      )
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }

  if (!response.ok) {
    let message = 'The analysis service is unavailable right now.'

    try {
      const payload = await response.json()

      if (typeof payload?.error === 'string' && payload.error.trim()) {
        message = payload.error
      }
    } catch {
      // Keep the default message when the error response is not JSON.
    }

    throw new Error(message)
  }

  return response.json()
}
