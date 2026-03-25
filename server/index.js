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

app.use((request, response, next) => {
  response.header('Access-Control-Allow-Origin', '*')
  response.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.header('Access-Control-Allow-Headers', 'Content-Type')

  if (request.method === 'OPTIONS') {
    response.sendStatus(204)
    return
  }

  next()
})

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
  return {
    text: parsed.text?.trim() || '',
    segments: Array.isArray(parsed.segments) ? parsed.segments : [],
  }
}

function formatMs(value) {
  return `${Math.round(value)} ms`
}

function countWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function buildDeliveryProfile(transcript, segments) {
  if (!segments.length) {
    return {
      speakingRateWpm: null,
      averagePauseMs: null,
      longestPauseMs: null,
      longPauseCount: 0,
      segmentCount: 0,
      coverageSeconds: null,
      notes: [
        'Timing data was limited, so delivery analysis should stay cautious and focus on broad pacing rather than precise pause behavior.',
      ],
    }
  }

  const orderedSegments = segments
    .filter((segment) => Number.isFinite(segment.start) && Number.isFinite(segment.end))
    .sort((left, right) => left.start - right.start)

  const firstStart = orderedSegments[0]?.start ?? 0
  const lastEnd = orderedSegments.at(-1)?.end ?? 0
  const coverageSeconds = Math.max(lastEnd - firstStart, 0)
  const wordCount = countWords(transcript)
  const speakingRateWpm =
    coverageSeconds > 0 ? Math.round((wordCount / coverageSeconds) * 60) : null

  const pauses = []

  for (let index = 1; index < orderedSegments.length; index += 1) {
    const pauseSeconds = orderedSegments[index].start - orderedSegments[index - 1].end

    if (pauseSeconds > 0.08) {
      pauses.push(pauseSeconds)
    }
  }

  const averagePauseMs = pauses.length
    ? (pauses.reduce((total, value) => total + value, 0) / pauses.length) * 1000
    : 0
  const longestPauseMs = pauses.length ? Math.max(...pauses) * 1000 : 0
  const longPauseCount = pauses.filter((pause) => pause >= 1.2).length
  const densePauseCount = pauses.filter((pause) => pause >= 0.55).length
  const longestStretchSeconds = orderedSegments.reduce(
    (longest, segment) => Math.max(longest, segment.end - segment.start),
    0,
  )

  const notes = []

  if (speakingRateWpm !== null) {
    if (speakingRateWpm < 85) {
      notes.push(
        `Speaking rate is on the slower side at about ${speakingRateWpm} words per minute, which may reflect careful monitoring or frequent planning pauses.`,
      )
    } else if (speakingRateWpm > 165) {
      notes.push(
        `Speaking rate is relatively fast at about ${speakingRateWpm} words per minute, so delivery feedback should check whether ideas are landing cleanly or getting compressed.`,
      )
    } else {
      notes.push(
        `Speaking rate is roughly ${speakingRateWpm} words per minute, which sits in a workable conversational range if the ideas are still landing clearly.`,
      )
    }
  }

  if (longPauseCount > 0) {
    notes.push(
      `${longPauseCount} longer pause${longPauseCount === 1 ? '' : 's'} crossed about 1.2 seconds, which may be relevant if they interrupted listener tracking.`,
    )
  } else if (densePauseCount > 0) {
    notes.push(
      `${densePauseCount} medium pause${densePauseCount === 1 ? '' : 's'} appeared in the turn, so the model should assess whether the pacing still felt coherent overall.`,
    )
  } else {
    notes.push('Pauses were generally short, so delivery feedback should not overstate hesitation unless chunking still felt overloaded.')
  }

  if (longestStretchSeconds >= 8) {
    notes.push(
      `The longest uninterrupted stretch lasted about ${longestStretchSeconds.toFixed(1)} seconds, which may signal that too many ideas were packed into one spoken unit.`,
    )
  }

  return {
    speakingRateWpm,
    averagePauseMs: Number.isFinite(averagePauseMs) ? Math.round(averagePauseMs) : null,
    longestPauseMs: Number.isFinite(longestPauseMs) ? Math.round(longestPauseMs) : null,
    longPauseCount,
    segmentCount: orderedSegments.length,
    coverageSeconds: Number.isFinite(coverageSeconds) ? Number(coverageSeconds.toFixed(2)) : null,
    notes,
  }
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
        'The issue here is that too many ideas are being carried at once, which makes the spoken message harder to follow.',
      reframe:
        'Think about landing one complete spoken idea at a time before moving to the next one.',
      drill:
        'Say the same idea again in two short spoken sentences, with a clear pause between them.',
      category: moment?.category || 'Delivery + clarity',
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
  return /\bpunctuation|capitalization|comma|period|full stop|written language|written form|spelling|orthography|acento escrito|puntuación|accent mark|accent marks|orthographic|orthography\b/i.test(
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

function getCoachingLanguage(language) {
  return language === 'fr' ? 'French' : 'Spanish'
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

async function requestOllamaFeedback(transcript, deliveryProfile, language) {
  console.log('[analyze] requesting Ollama feedback')
  const coachingLanguage = getCoachingLanguage(language)
  const deliveryContext = [
    deliveryProfile?.speakingRateWpm !== null
      ? `- Estimated speaking rate: ${deliveryProfile.speakingRateWpm} words per minute`
      : '- Estimated speaking rate: unavailable',
    deliveryProfile?.averagePauseMs !== null
      ? `- Average pause: ${formatMs(deliveryProfile.averagePauseMs)}`
      : '- Average pause: unavailable',
    deliveryProfile?.longestPauseMs !== null
      ? `- Longest pause: ${formatMs(deliveryProfile.longestPauseMs)}`
      : '- Longest pause: unavailable',
    `- Long pauses over about 1.2s: ${deliveryProfile?.longPauseCount ?? 0}`,
    `- Speech segments detected: ${deliveryProfile?.segmentCount ?? 0}`,
    ...(Array.isArray(deliveryProfile?.notes) ? deliveryProfile.notes.map((note) => `- ${note}`) : []),
  ].join('\n')

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
            `You are a ${coachingLanguage} speaking coach. Return only JSON with keys sessionSnapshot, coachingDimensions, and coachingMoments. Every field must reflect the specific transcript and timing profile, not generic product copy. Write all coaching commentary in English, but keep learner examples and revisions in ${coachingLanguage}. Be constructive, concise, and explain patterns behind the errors. Judge spoken language like an experienced teacher, not like a rigid grammar checker. Natural hesitation, brief repetition, self-repair, and ordinary thinking pauses are acceptable unless they materially reduce clarity or make the speaker difficult to follow. Focus criticism on the factors that most affect intelligibility, precision, and listener effort. Avoid placeholders and avoid mentioning apps, products, local analysis, future versions, or AI systems.`,
        },
        {
          role: 'user',
          content: `Analyze this spoken ${coachingLanguage} transcript and return valid JSON.

Transcript:
${transcript}

Delivery timing profile:
${deliveryContext}

Schema expectations:
- sessionSnapshot: { title, transcript, insight, stats[{label, value}] }
- coachingDimensions: 4 items for grammar, delivery, idiomacy, vocabulary
- coachingMoments: up to 4 items with { id, label, focus, original, revision, why, reframe, drill, category }

Additional rules:
- The insight must summarize this recording specifically in 1-2 sentences.
- Each coaching dimension description must refer to what happened in this recording.
- Each dimension needs 2-3 concrete signals taken from this transcript.
- The Delivery dimension should use the timing profile above to discuss pace, pause distribution, chunking, and listener effort.
- Each coaching moment must quote or closely paraphrase a real example from the transcript in "original" and give a stronger version in "revision".
- Focus on why the learner likely made the error and how to think differently next time.
- Do not over-penalize normal spoken behavior such as short pauses, minor repetition, or self-correction when the message remains easy to follow.
- In the Delivery dimension, only flag pacing or pauses when they noticeably increase listener effort or break coherence.
- Prefer high-signal feedback over nitpicking. Emphasize the errors or patterns that most interfere with comprehension, precision, or natural expression.
- Treat this as spoken-language coaching only. Do not give advice about punctuation, capitalization, spelling, accent marks, orthography, or written formatting.
- Do not comment on pronunciation quality.
- Use the exact titles: "Grammatical Acuteness", "Delivery", "Idiomacy", "Vocabulary Range".`,
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
      const transcription = await transcribeAudioFile(tempPath, language)
      const transcript = transcription.text
      const deliveryProfile = buildDeliveryProfile(transcript, transcription.segments)
      console.log('[analyze] transcription completed', {
        transcriptLength: transcript.length,
        segmentCount: transcription.segments.length,
      })

      if (!transcript) {
        response.status(502).json({
          error: 'Transcription completed, but no transcript was returned.',
        })
        return
      }

      const modelFeedback = await requestOllamaFeedback(transcript, deliveryProfile, language)
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
