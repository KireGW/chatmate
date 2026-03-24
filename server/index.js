import process from 'node:process'
import express from 'express'
import multer from 'multer'
import OpenAI from 'openai'
import { toFile } from 'openai/uploads'
import { analyzeSpanishTranscript } from '../src/lib/analyzeSpanish.js'

const app = express()
const port = Number(process.env.PORT || 3001)
const upload = multer({ storage: multer.memoryStorage() })
const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
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

app.post(
  '/api/analyze-recording',
  upload.single('file'),
  async (request, response) => {
    if (!client) {
      response.status(500).json({
        error:
          'OPENAI_API_KEY is missing on the server. Add it to analyze recordings with OpenAI.',
      })
      return
    }

    if (!request.file) {
      response.status(400).json({
        error: 'An audio file is required.',
      })
      return
    }

    try {
      const transcription = await client.audio.transcriptions.create({
        file: await toFile(
          request.file.buffer,
          request.file.originalname || 'recording.webm',
        ),
        model: 'gpt-4o-transcribe',
        language: 'es',
      })

      const transcript = transcription.text?.trim()

      if (!transcript) {
        response.status(502).json({
          error: 'Transcription completed, but no transcript was returned.',
        })
        return
      }

      const feedbackResponse = await client.responses.create({
        model: 'gpt-4.1',
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text:
                  'You are a Spanish speaking coach. Analyze a learner transcript and return structured feedback about grammar, flow, idiomacy, and vocabulary. Keep feedback constructive, specific, and practical.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Analyze this spoken Spanish transcript and return only JSON.\n\nTranscript:\n${transcript}`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'spanish_feedback',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                sessionSnapshot: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    title: { type: 'string' },
                    transcript: { type: 'string' },
                    insight: { type: 'string' },
                    stats: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          label: { type: 'string' },
                          value: { type: 'string' },
                        },
                        required: ['label', 'value'],
                      },
                    },
                  },
                  required: ['title', 'transcript', 'insight', 'stats'],
                },
                coachingDimensions: {
                  type: 'array',
                  minItems: 4,
                  maxItems: 4,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      title: { type: 'string' },
                      score: { type: 'string' },
                      description: { type: 'string' },
                      signals: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                    required: ['title', 'score', 'description', 'signals'],
                  },
                },
                coachingMoments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      id: { type: 'string' },
                      label: { type: 'string' },
                      focus: { type: 'string' },
                      original: { type: 'string' },
                      revision: { type: 'string' },
                      why: { type: 'string' },
                      reframe: { type: 'string' },
                      drill: { type: 'string' },
                      category: { type: 'string' },
                    },
                    required: [
                      'id',
                      'label',
                      'focus',
                      'original',
                      'revision',
                      'why',
                      'reframe',
                      'drill',
                      'category',
                    ],
                  },
                },
              },
              required: [
                'sessionSnapshot',
                'coachingDimensions',
                'coachingMoments',
              ],
            },
          },
        },
      })

      const parsed = JSON.parse(feedbackResponse.output_text)
      response.json({
        ...parsed,
        sessionSnapshot: {
          ...parsed.sessionSnapshot,
          transcript,
          waveform: [14, 24, 18, 34, 20, 38, 27, 16, 31, 22, 29, 18, 26, 16, 22, 14],
        },
      })
    } catch (error) {
      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'OpenAI analysis failed for this recording.',
      })
    }
  },
)

app.listen(port, () => {
  console.log(`Chatmate API listening on http://localhost:${port}`)
})
