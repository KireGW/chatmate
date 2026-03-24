import process from 'node:process'
import os from 'node:os'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import express from 'express'
import multer from 'multer'
import { analyzeSpanishTranscript } from '../src/lib/analyzeSpanish.js'

const execFileAsync = promisify(execFile)
const app = express()
const port = Number(process.env.PORT || 3001)
const upload = multer({ storage: multer.memoryStorage() })
const ollamaApiUrl = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434'
const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:7b-instruct'

app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    ollamaApiUrl,
    ollamaModel,
    whisperModelSize: process.env.WHISPER_MODEL_SIZE || 'small',
  })
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

function buildFallbackAnalysis(transcript) {
  return analyzeSpanishTranscript(transcript)
}

async function transcribeAudioFile(audioPath, language) {
  const scriptPath = path.join(process.cwd(), 'server', 'transcribe_audio.py')
  const { stdout } = await execFileAsync('python3', [scriptPath, audioPath, language], {
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  })
  const parsed = JSON.parse(stdout)
  return parsed.text?.trim() || ''
}

function normalizeMoment(moment, index, transcript) {
  return {
    id: moment?.id || `moment-${index + 1}`,
    label: moment?.label || `Moment ${String(index + 1).padStart(2, '0')}`,
    focus: moment?.focus || 'Language feedback',
    original: moment?.original || transcript,
    revision: moment?.revision || transcript,
    why: moment?.why || 'This moment highlights a pattern worth practicing.',
    reframe:
      moment?.reframe ||
      'Try to notice the meaning pattern first, then choose a more natural Spanish structure.',
    drill:
      moment?.drill || 'Say the improved version aloud three times in a fresh sentence.',
    category: moment?.category || 'General coaching',
  }
}

function mergeModelFeedback(transcript, modelFeedback) {
  const fallback = buildFallbackAnalysis(transcript)

  return {
    sessionSnapshot: {
      ...fallback.sessionSnapshot,
      ...modelFeedback?.sessionSnapshot,
      transcript,
      waveform: fallback.sessionSnapshot.waveform,
      stats:
        Array.isArray(modelFeedback?.sessionSnapshot?.stats) &&
        modelFeedback.sessionSnapshot.stats.length
          ? modelFeedback.sessionSnapshot.stats
          : fallback.sessionSnapshot.stats,
    },
    coachingDimensions:
      Array.isArray(modelFeedback?.coachingDimensions) &&
      modelFeedback.coachingDimensions.length
        ? modelFeedback.coachingDimensions
        : fallback.coachingDimensions,
    coachingMoments:
      Array.isArray(modelFeedback?.coachingMoments) &&
      modelFeedback.coachingMoments.length
        ? modelFeedback.coachingMoments.map((moment, index) =>
            normalizeMoment(moment, index, transcript),
          )
        : fallback.coachingMoments,
  }
}

async function requestOllamaFeedback(transcript) {
  const response = await fetch(`${ollamaApiUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ollamaModel,
      stream: false,
      format: 'json',
      messages: [
        {
          role: 'system',
          content:
            'You are a Spanish speaking coach. Return only JSON with keys sessionSnapshot, coachingDimensions, and coachingMoments. Be constructive and concise. The learner wants feedback on grammar, flow, idiomacy, and vocabulary.',
        },
        {
          role: 'user',
          content: `Analyze this spoken Spanish transcript and return valid JSON.

Transcript:
${transcript}

Schema expectations:
- sessionSnapshot: { title, transcript, insight, stats[{label, value}] }
- coachingDimensions: 4 items for grammar, flow, idiomacy, vocabulary
- coachingMoments: up to 4 items with { id, label, focus, original, revision, why, reframe, drill, category }`,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}.`)
  }

  const payload = await response.json()
  const content = payload?.message?.content

  if (!content) {
    throw new Error('Ollama returned no feedback content.')
  }

  return JSON.parse(content)
}

app.post(
  '/api/analyze-recording',
  upload.single('file'),
  async (request, response) => {
    if (!request.file) {
      response.status(400).json({
        error: 'An audio file is required.',
      })
      return
    }

    const language = typeof request.body?.language === 'string' ? request.body.language : 'es'
    const tempPath = path.join(
      os.tmpdir(),
      `chatmate-${Date.now()}-${request.file.originalname || 'recording.webm'}`,
    )

    try {
      await fs.writeFile(tempPath, request.file.buffer)
      const transcript = await transcribeAudioFile(tempPath, language)

      if (!transcript) {
        response.status(502).json({
          error: 'Transcription completed, but no transcript was returned.',
        })
        return
      }

      try {
        const modelFeedback = await requestOllamaFeedback(transcript)
        response.json(mergeModelFeedback(transcript, modelFeedback))
      } catch {
        response.json(buildFallbackAnalysis(transcript))
      }
    } catch (error) {
      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Audio transcription or feedback failed.',
      })
    } finally {
      await fs.rm(tempPath, { force: true })
    }
  },
)

app.listen(port, () => {
  console.log(`Chatmate API listening on http://localhost:${port}`)
})
