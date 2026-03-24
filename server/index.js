import process from 'node:process'
import os from 'node:os'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import express from 'express'
import multer from 'multer'

const execFileAsync = promisify(execFile)
const app = express()
const port = Number(process.env.PORT || 3001)
const upload = multer({ storage: multer.memoryStorage() })
const ollamaApiUrl = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434'
const ollamaModel = process.env.OLLAMA_MODEL || 'gpt-oss:20b'
const projectPythonBin = path.join(process.cwd(), '.venv', 'bin', 'python3')

app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    ollamaApiUrl,
    ollamaModel,
    whisperModelSize: process.env.WHISPER_MODEL_SIZE || 'small',
    pythonBin: process.env.PYTHON_BIN || projectPythonBin,
  })
})

async function transcribeAudioFile(audioPath, language) {
  const scriptPath = path.join(process.cwd(), 'server', 'transcribe_audio.py')
  const pythonBin = process.env.PYTHON_BIN || projectPythonBin
  const { stdout } = await execFileAsync(pythonBin, [scriptPath, audioPath, language], {
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  })
  const parsed = JSON.parse(stdout)
  return parsed.text?.trim() || ''
}

function normalizeMoment(moment, index, transcript) {
  const focus = moment?.focus || 'Language feedback'
  const why = moment?.why || 'This moment highlights a pattern worth practicing.'
  const reframe =
    moment?.reframe ||
    'Try to notice the meaning pattern first, then choose a more natural Spanish structure.'
  const drill =
    moment?.drill || 'Say the improved version aloud three times in a fresh sentence.'

  if (isWritingFocusedAdvice([focus, why, reframe, drill].join(' '))) {
    return {
      id: moment?.id || `moment-${index + 1}`,
      label: moment?.label || `Moment ${String(index + 1).padStart(2, '0')}`,
      focus: 'Shaping clearer spoken units',
      original: moment?.original || transcript,
      revision: moment?.revision || transcript,
      why:
        'The issue here is not really punctuation. It is that too many ideas are being carried at once, which makes the spoken message harder to follow.',
      reframe:
        'Instead of thinking about written correctness, think about landing one complete spoken idea at a time before moving to the next one.',
      drill:
        'Say the same idea again in two short spoken sentences, with a clear pause between them.',
      category: moment?.category || 'Flow + clarity',
    }
  }

  return {
    id: moment?.id || `moment-${index + 1}`,
    label: moment?.label || `Moment ${String(index + 1).padStart(2, '0')}`,
    focus,
    original: moment?.original || transcript,
    revision: moment?.revision || transcript,
    why,
    reframe,
    drill,
    category: moment?.category || 'General coaching',
  }
}

function normalizeDimension(dimension, index) {
  const description = dimension?.description || 'Analysis unavailable for this dimension.'
  const signals =
    Array.isArray(dimension?.signals) && dimension.signals.length
      ? dimension.signals.slice(0, 3).map((signal) =>
          isWritingFocusedAdvice(signal)
            ? 'Focus on what makes the spoken message harder to follow, not on written-style polish.'
            : signal,
        )
      : ['No specific signals were returned by the analysis model.']

  return {
    title: dimension?.title || `Dimension ${index + 1}`,
    score: dimension?.score || `0${index + 1}`,
    description: isWritingFocusedAdvice(description)
      ? 'This dimension should focus on spoken clarity and listener effort rather than written-language conventions.'
      : description,
    signals,
  }
}

function isWritingFocusedAdvice(text) {
  return /\bpunctuation|capitalization|comma|period|full stop|written language|written form|spelling|orthography|acento escrito|puntuación\b/i.test(
    text,
  )
}

function parseJsonFromModel(content) {
  const trimmed = content.trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)

    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim())
    }

    const firstBrace = trimmed.indexOf('{')
    const lastBrace = trimmed.lastIndexOf('}')

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
    }

    throw new Error('Model response did not contain valid JSON.')
  }
}

function summarizeModelPayload(modelFeedback) {
  return {
    hasSessionSnapshot: Boolean(modelFeedback?.sessionSnapshot),
    dimensions: Array.isArray(modelFeedback?.coachingDimensions)
      ? modelFeedback.coachingDimensions.length
      : 0,
    moments: Array.isArray(modelFeedback?.coachingMoments)
      ? modelFeedback.coachingMoments.length
      : 0,
  }
}

function mergeModelFeedback(transcript, modelFeedback) {
  return {
    sessionSnapshot: {
      ...modelFeedback?.sessionSnapshot,
      title: modelFeedback?.sessionSnapshot?.title || 'Spanish speaking analysis',
      transcript,
      insight:
        modelFeedback?.sessionSnapshot?.insight ||
        'The recording was analyzed, but the model returned incomplete summary text.',
      waveform:
        Array.isArray(modelFeedback?.sessionSnapshot?.waveform) &&
        modelFeedback.sessionSnapshot.waveform.length
          ? modelFeedback.sessionSnapshot.waveform
          : [14, 24, 18, 34, 20, 38, 27, 16, 31, 22, 29, 18, 26, 16, 22, 14],
      stats:
        Array.isArray(modelFeedback?.sessionSnapshot?.stats) &&
        modelFeedback.sessionSnapshot.stats.length
          ? modelFeedback.sessionSnapshot.stats
          : [],
    },
    coachingDimensions:
      Array.isArray(modelFeedback?.coachingDimensions) &&
      modelFeedback.coachingDimensions.length
        ? modelFeedback.coachingDimensions.map((dimension, index) =>
            normalizeDimension(dimension, index),
          )
        : [],
    coachingMoments:
      Array.isArray(modelFeedback?.coachingMoments) &&
      modelFeedback.coachingMoments.length
        ? modelFeedback.coachingMoments.map((moment, index) =>
            normalizeMoment(moment, index, transcript),
          )
        : [],
  }
}

async function requestOllamaFeedback(transcript) {
  console.log('[analyze] requesting Ollama feedback')
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
            'You are a Spanish speaking coach. Return only JSON with keys sessionSnapshot, coachingDimensions, and coachingMoments. Every field must reflect the specific transcript, not generic product copy. Be constructive, concise, and explain patterns behind the errors. Judge spoken language like an experienced teacher, not like a rigid grammar checker. Natural hesitation, brief repetition, self-repair, and ordinary thinking pauses are acceptable unless they materially reduce clarity or make the speaker difficult to follow. Focus criticism on the factors that most affect intelligibility, precision, and listener effort. Avoid placeholders and avoid mentioning apps, products, local analysis, future versions, or AI systems.',
        },
        {
          role: 'user',
          content: `Analyze this spoken Spanish transcript and return valid JSON.

Transcript:
${transcript}

Schema expectations:
- sessionSnapshot: { title, transcript, insight, stats[{label, value}] }
- coachingDimensions: 4 items for grammar, flow, idiomacy, vocabulary
- coachingMoments: up to 4 items with { id, label, focus, original, revision, why, reframe, drill, category }

Additional rules:
- The insight must summarize this recording specifically in 1-2 sentences.
- Each coaching dimension description must refer to what happened in this recording.
- Each dimension needs 2-3 concrete signals taken from this transcript.
- Each coaching moment must quote or closely paraphrase a real example from the transcript in "original" and give a stronger version in "revision".
- Focus on why the learner likely made the error and how to think differently next time.
- Do not over-penalize normal spoken behavior such as short pauses, minor repetition, or self-correction when the message remains easy to follow.
- In the Flow dimension, only flag hesitations or repetition when they noticeably increase listener effort or break coherence.
- Prefer high-signal feedback over nitpicking. Emphasize the errors or patterns that most interfere with comprehension, precision, or natural expression.
- Treat this as spoken-language coaching, not written-language correction. Do not give advice about punctuation, capitalization, or written formatting unless the point is explicitly about how ideas are being chunked in speech.
- Use the exact titles: "Grammatical Acuteness", "Flow", "Idiomacy", "Vocabulary Range".`,
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

  console.log('[analyze] Ollama response received')
  try {
    const parsed = parseJsonFromModel(content)
    console.log('[analyze] parsed model payload', summarizeModelPayload(parsed))
    return parsed
  } catch (error) {
    console.error('[analyze] failed to parse Ollama JSON', {
      error: error instanceof Error ? error.message : String(error),
      preview: content.slice(0, 1200),
    })
    throw error
  }
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
      console.log('[analyze] request received', {
        size: request.file.size,
        mimetype: request.file.mimetype,
        language,
      })
      await fs.writeFile(tempPath, request.file.buffer)
      console.log('[analyze] temporary file written')
      console.log('[analyze] starting transcription')
      const transcript = await transcribeAudioFile(tempPath, language)
      console.log('[analyze] transcription completed', {
        transcriptLength: transcript.length,
      })

      if (!transcript) {
        response.status(502).json({
          error: 'Transcription completed, but no transcript was returned.',
        })
        return
      }

      const modelFeedback = await requestOllamaFeedback(transcript)
      const merged = mergeModelFeedback(transcript, modelFeedback)
      console.log('[analyze] model output merged', {
        dimensions: merged.coachingDimensions.length,
        moments: merged.coachingMoments.length,
      })

      if (!merged.coachingDimensions.length || !merged.coachingMoments.length) {
        console.error('[analyze] incomplete model feedback', {
          transcript,
          modelSummary: summarizeModelPayload(modelFeedback),
          modelFeedback,
        })
        response.status(502).json({
          error: 'The analysis model returned incomplete feedback. Please try again.',
        })
        return
      }

      console.log('[analyze] response sent')
      response.json(merged)
    } catch (error) {
      console.error('[analyze] failed', error)
      response.status(502).json({
        error:
          error instanceof Error
            ? error.message
            : 'Audio transcription or model analysis failed.',
      })
    } finally {
      await fs.rm(tempPath, { force: true })
    }
  },
)

app.listen(port, () => {
  console.log(`Chatmate API listening on http://localhost:${port}`)
})
