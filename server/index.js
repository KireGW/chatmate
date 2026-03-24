import process from 'node:process'
import express from 'express'
import { analyzeSpanishTranscript } from './analyzeSpanish.js'

const app = express()
const port = Number(process.env.PORT || 3001)

app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.post('/api/analyze', (request, response) => {
  const transcript = request.body?.transcript

  if (typeof transcript !== 'string' || !transcript.trim()) {
    response.status(400).json({
      error: 'A non-empty transcript is required.',
    })
    return
  }

  response.json(analyzeSpanishTranscript(transcript))
})

app.listen(port, () => {
  console.log(`Chatmate API listening on http://localhost:${port}`)
})
