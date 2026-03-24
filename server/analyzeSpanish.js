const fillerWords = ['eh', 'este', 'pues', 'mmm', 'bueno']
const englishMarkers = [' i ', ' so ', ' but ', ' because ', ' like ']

function toTitleCase(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function buildSessionTitle(text) {
  const lower = text.toLowerCase()
  const phraseRules = [
    ['cafe', 'Talking about coffee plans'],
    ['cafetería', 'Talking about the cafe'],
    ['trabajo', 'Talking about work pressure'],
    ['nervioso', 'Talking about feeling nervous'],
    ['practicar', 'Talking about practice'],
    ['ayer', 'Talking about yesterday'],
  ]

  const matched = phraseRules.find(([pattern]) => lower.includes(pattern))

  if (matched) {
    return matched[1]
  }

  const snippet = text
    .replace(/[.!?]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join(' ')

  return snippet ? toTitleCase(snippet) : 'Spanish speaking turn'
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function countMatches(text, patterns) {
  return patterns.reduce((total, pattern) => {
    return total + (text.includes(pattern) ? 1 : 0)
  }, 0)
}

function buildStats(text) {
  const lower = ` ${text.toLowerCase()} `
  const fillerPenalty = countMatches(lower, fillerWords.map((word) => ` ${word} `)) * 4
  const englishPenalty = countMatches(lower, englishMarkers) * 12
  const accentPenalty = /cafe|asi|llegue|pare|cafeteria|vacia/i.test(text) ? 8 : 0
  const grammarPenalty = /\bfue muy llena\b/i.test(text) ? 12 : 0

  return [
    {
      label: 'Grammar',
      value: `${clamp(92 - grammarPenalty - accentPenalty / 2, 58, 96)}%`,
    },
    {
      label: 'Flow',
      value: `${clamp(88 - fillerPenalty - englishPenalty / 2, 52, 95)}%`,
    },
    {
      label: 'Idiomacy',
      value: `${clamp(82 - englishPenalty - grammarPenalty / 2, 48, 93)}%`,
    },
    {
      label: 'Vocabulary',
      value: `${clamp(84 - englishPenalty / 2, 55, 94)}%`,
    },
  ]
}

function buildDimensions(text) {
  const lower = text.toLowerCase()

  return [
    {
      title: 'Grammatical Acuteness',
      score: '01',
      description:
        'Grammar feedback is generated from the current turn and explains why a structure sounds off, not only which form to change.',
      signals: [
        lower.includes('fue muy llena')
          ? 'Temporary-state phrasing flagged around ser vs estar'
          : 'Verb-state choices look mostly stable in this turn',
        /cafe|asi|llegue|pare|cafeteria|vacia/i.test(text)
          ? 'Accent marks are worth another pass'
          : 'Accent placement appears steady in this sample',
        'Agreement and tense can be expanded with a model-based analyzer next',
      ],
    },
    {
      title: 'Flow',
      score: '02',
      description:
        'Flow focuses on hesitations, sentence breaks, and whether the learner keeps the thought moving in Spanish.',
      signals: [
        lower.includes('...')
          ? 'Long pause markers suggest hesitation'
          : 'Sentence rhythm stayed fairly continuous',
        countMatches(` ${lower} `, fillerWords.map((word) => ` ${word} `)) > 0
          ? 'Detected filler words that may interrupt pacing'
          : 'Few filler cues detected',
        'Connectors can be coached more deeply with timestamped transcription',
      ],
    },
    {
      title: 'Idiomacy',
      score: '03',
      description:
        'Idiomacy explains when a sentence is understandable but still sounds translated or less native-like.',
      signals: [
        countMatches(` ${lower} `, englishMarkers) > 0
          ? 'English code-switching suggests missing Spanish chunks'
          : 'The turn stayed in Spanish throughout',
        lower.includes('ocupado con mi trabajo')
          ? 'A more conversational chunk could replace a literal phrasing'
          : 'The phrasing is a reasonable starting point for spoken Spanish',
        'Future versions can adapt feedback by region and register',
      ],
    },
    {
      title: 'Vocabulary Range',
      score: '04',
      description:
        'Vocabulary coaching suggests stronger alternatives and explains the nuance between similar options.',
      signals: [
        lower.includes('muy ')
          ? 'Repeated general intensifiers suggest room for richer wording'
          : 'Vocabulary variety is starting to open up',
        countMatches(` ${lower} `, englishMarkers) > 0
          ? 'A missing Spanish word or connector caused a fallback to English'
          : 'No obvious lexical fallback to English in this sample',
        'Next iteration can tailor synonym suggestions to topic and CEFR level',
      ],
    },
  ]
}

function buildMoments(text) {
  const lower = text.toLowerCase()
  const moments = []

  if (/cafe|cafeteria|asi|llegue|pare|vacia/i.test(text)) {
    moments.push({
      id: 'moment-accents',
      label: 'Moment 01',
      focus: 'Accent marks and polished written form',
      original: text,
      revision: text
        .replaceAll(/\bcafe\b/gi, 'café')
        .replaceAll(/\bcafeteria\b/gi, 'cafetería')
        .replaceAll(/\basi\b/gi, 'así')
        .replaceAll(/\bllegue\b/gi, 'llegué')
        .replaceAll(/\bpare\b/gi, 'paré')
        .replaceAll(/\bvacia\b/gi, 'vacía'),
      why:
        'When speech is converted to text, accent marks are often lost. In Spanish, those marks are not cosmetic; they can change pronunciation and sometimes meaning.',
      reframe:
        'After speaking, do a fast written pass asking: which words here normally carry an accent even if I did not hear it strongly in my own speech?',
      drill:
        'Read the corrected version aloud once, then write it from memory with the accents added.',
      category: 'Grammar + orthography',
    })
  }

  if (lower.includes('fue muy llena')) {
    moments.push({
      id: 'moment-ser-estar',
      label: `Moment 0${moments.length + 1}`,
      focus: 'Ser vs estar in scene descriptions',
      original: text,
      revision: text.replace(/fue muy llena/gi, 'estaba muy llena'),
      why:
        'This sounds like a transfer error from a more general idea of "to be." Spanish usually uses "estar" for a temporary condition in a specific moment or scene.',
      reframe:
        'Before choosing the verb, ask: am I defining what this thing is, or describing how it was at that moment? Scene conditions usually point to "estar."',
      drill:
        'Say three scene descriptions aloud: "el cafe estaba vacio", "la calle estaba tranquila", "la cafeteria estaba llena".',
      category: 'Grammar',
    })
  }

  if (countMatches(` ${lower} `, englishMarkers) > 0) {
    moments.push({
      id: 'moment-connectors',
      label: `Moment 0${moments.length + 1}`,
      focus: 'Staying in Spanish under pressure',
      original: text,
      revision: text
        .replaceAll(/\bso\b/gi, 'asi que')
        .replaceAll(/\bbut\b/gi, 'pero')
        .replaceAll(/\bbecause\b/gi, 'porque')
        .replaceAll(/\blike\b/gi, 'como'),
      why:
        'The jump into English usually means the full Spanish chunk is missing, not only one isolated word. Connectors are often the first pieces to disappear under pressure.',
      reframe:
        'When a sentence starts to collapse, reach for a bridge expression first: "asi que", "por eso", "entonces", "pero". That often buys enough structure to keep going in Spanish.',
      drill:
        'Retell the same idea three times using "asi que", "por eso", and "entonces" as your connector.',
      category: 'Flow + vocabulary',
    })
  }

  if (lower.includes('ocupado con mi trabajo') || lower.includes('muy ')) {
    moments.push({
      id: 'moment-idiomacy',
      label: `Moment 0${moments.length + 1}`,
      focus: 'Less literal and more natural wording',
      original: text,
      revision: lower.includes('ocupado con mi trabajo')
        ? text.replace(
            /ocupado con mi trabajo/gi,
            'hasta arriba de trabajo',
          )
        : text,
      why:
        'The sentence works, but it may still sound like a direct translation from English. Native-like speech often depends on ready-made chunks rather than word-by-word assembly.',
      reframe:
        'Ask yourself what a Spanish speaker would grab as a whole phrase for this situation, not just which dictionary equivalent matches each word.',
      drill:
        'Create two more ways to express the same idea using a different chunk or stronger adjective.',
      category: 'Idiomacy',
    })
  }

  if (!moments.length) {
    moments.push({
      id: 'moment-general',
      label: 'Moment 01',
      focus: 'Solid base, now sharpen expression',
      original: text,
      revision: text,
      why:
        'This turn is understandable and mostly stable. That means the next gains come from sounding more flexible and more native-like, not only from fixing errors.',
      reframe:
        'Once the message is clear, shift your attention from correctness alone to precision, rhythm, and how naturally the idea lands.',
      drill:
        'Say the same sentence again with one stronger verb and one more natural connector.',
      category: 'General coaching',
    })
  }

  return moments.slice(0, 4)
}

export function analyzeSpanishTranscript(transcript) {
  const cleanedTranscript = transcript.trim().replace(/\s+/g, ' ')

  return {
    sessionSnapshot: {
      title: buildSessionTitle(cleanedTranscript),
      transcript: cleanedTranscript,
      insight:
        'This coaching pass is generated locally from the captured transcript. It is designed to surface likely learning patterns now, and can later be replaced with a stronger AI-based transcript and analysis stack.',
      waveform: [14, 24, 18, 34, 20, 38, 27, 16, 31, 22, 29, 18, 26, 16, 22, 14],
      stats: buildStats(cleanedTranscript),
    },
    coachingDimensions: buildDimensions(cleanedTranscript),
    coachingMoments: buildMoments(cleanedTranscript),
  }
}
