export async function analyzeTranscript(transcript) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript,
      language: 'es',
    }),
  })

  if (!response.ok) {
    throw new Error('The coaching service could not analyze this speaking turn.')
  }

  return response.json()
}
