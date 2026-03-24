const fillerWords = ['eh', 'este', 'pues', 'mmm', 'bueno']
const englishMarkers = [' i ', ' so ', ' but ', ' because ', ' like ']

function extractSnippet(text, pattern, radius = 48) {
  const match = pattern instanceof RegExp ? text.match(pattern) : null

  if (!match || match.index === undefined) {
    return text.trim().replace(/\s+/g, ' ')
  }

  const start = Math.max(0, match.index - radius)
  const end = Math.min(text.length, match.index + match[0].length + radius)
  return text
    .slice(start, end)
    .trim()
    .replace(/\s+/g, ' ')
}

function buildRuleBasedIssues(text) {
  const issues = []
  const lower = text.toLowerCase()

  const articleCionMatch = text.match(/\bun ([a-záéíóúñ]+ción)\b/i)

  if (articleCionMatch) {
    issues.push({
      id: 'article-cion',
      focus: 'Gender agreement with feminine nouns',
      original: extractSnippet(text, /\bun ([a-záéíóúñ]+ción)\b/i),
      revision: extractSnippet(
        text.replace(/\bun ([a-záéíóúñ]+ción)\b/i, 'una $1'),
        /\buna ([a-záéíóúñ]+ción)\b/i,
      ),
      why:
        'This kind of error often happens when the article is chosen too quickly from habit before the noun pattern is fully processed. In Spanish, many abstract nouns ending in "-ción" are feminine.',
      reframe:
        'When you hear yourself say a noun ending in "-ción", pause internally and check for a feminine frame first: "la", "una", "esta".',
      drill:
        'Say aloud: "una grabación", "una conversación", "una situación", "una explicación".',
      category: 'Grammar',
      dimension: 'grammar',
      signal: `Article-noun mismatch detected in "${articleCionMatch[0]}"`,
    })
  }

  if (/\byo quieres\b/i.test(text)) {
    issues.push({
      id: 'yo-quieres',
      focus: 'Subject-verb agreement with yo',
      original: extractSnippet(text, /\byo quieres\b/i),
      revision: extractSnippet(text.replace(/\byo quieres\b/gi, 'yo quiero'), /\byo quiero\b/i),
      why:
        'The speaker has the right meaning, but the verb ending is still being pulled from a different subject pattern. This usually means person endings are not fully automatic under pressure.',
      reframe:
        'Lock the subject first. If the sentence begins with "yo", listen mentally for the first-person ending before the rest of the clause continues.',
      drill:
        'Repeat: "yo quiero", "yo necesito", "yo pienso", "yo veo" until the first-person ending feels automatic.',
      category: 'Grammar',
      dimension: 'grammar',
      signal: 'First-person subject paired with a second-person verb ending',
    })
  }

  if (/\bmuchos cosas\b/i.test(lower)) {
    issues.push({
      id: 'muchos-cosas',
      focus: 'Plural agreement inside the noun phrase',
      original: extractSnippet(text, /\bmuchos cosas\b/i),
      revision: extractSnippet(text.replace(/\bmuchos cosas\b/gi, 'muchas cosas'), /\bmuchas cosas\b/i),
      why:
        'This kind of agreement error usually appears when the speaker is planning meaning quickly and the adjective is not updated after the noun arrives.',
      reframe:
        'Treat the article, adjective, and noun as one unit. Once "cosas" is in place, the rest of the phrase should swing feminine plural with it.',
      drill:
        'Practice short chunks: "muchas cosas", "muchas ideas", "muchas palabras", "muchas dudas".',
      category: 'Grammar',
      dimension: 'grammar',
      signal: 'Plural adjective does not agree with the feminine noun it modifies',
    })
  }

  if (/\bcosas\b/i.test(lower)) {
    issues.push({
      id: 'cosas-vocabulary',
      focus: 'Leaning on catch-all vocabulary',
      original: extractSnippet(text, /\bcosas\b/i),
      revision: extractSnippet(text.replace(/\bcosas\b/i, 'aspectos'), /\baspectos\b/i),
      why:
        'Generic words like "cosas" help keep the sentence alive, but they often hide that a more precise noun has not come to mind yet.',
      reframe:
        'When you hear yourself reaching for "cosa" or "cosas", ask what kind of thing you actually mean: idea, error, detalle, aspecto, problema.',
      drill:
        'Retell the same idea without using "cosa" and replace it with three more specific nouns.',
      category: 'Vocabulary',
      dimension: 'vocabulary',
      signal: 'A catch-all noun is carrying meaning that could be expressed more precisely',
    })
  }

  if (!/[.!?]/.test(text) && text.trim().split(/\s+/).length > 28) {
    issues.push({
      id: 'long-sentence-flow',
      focus: 'Trying to carry too much meaning in one sentence',
      original: extractSnippet(text, /\b\w+\b/, 120),
      revision:
        'Creo que necesito una grabación más larga. Así puedo ver mejor qué errores debo corregir.',
      why:
        'When a speaker tries to hold too many ideas in one breath, grammar and word choice both get less stable. The problem is often planning load, not only knowledge.',
      reframe:
        'Do not solve the whole thought in one sentence. Land the main point first, then add the next idea in a second sentence.',
      drill:
        'Take one long answer and split it into two short sentences before saying it again.',
      category: 'Flow',
      dimension: 'flow',
      signal: 'A long run-on structure is increasing planning pressure',
    })
  }

  if (countMatches(` ${lower} `, fillerWords.map((word) => ` ${word} `)) > 1) {
    issues.push({
      id: 'filler-flow',
      focus: 'Using fillers to buy planning time',
      original: extractSnippet(text, /\b(?:eh|este|pues|mmm|bueno)\b/i),
      revision:
        'Reduce the filler and restart with a shorter clause that you can fully control in Spanish.',
      why:
        'Fillers are often not the real problem. They usually appear when the next chunk is not ready yet.',
      reframe:
        'Instead of filling the silence, shorten the next sentence and restart with a simpler structure you can finish cleanly.',
      drill:
        'Answer the same question again with one sentence only, no filler words allowed.',
      category: 'Flow',
      dimension: 'flow',
      signal: 'Repeated filler words suggest hesitation and planning pressure',
    })
  }

  if (countMatches(` ${lower} `, englishMarkers) > 0) {
    issues.push({
      id: 'english-fallback',
      focus: 'Falling back to English chunks',
      original: extractSnippet(text, /\b(?:i|so|but|because|like)\b/i),
      revision: text
        .replaceAll(/\bso\b/gi, 'así que')
        .replaceAll(/\bbut\b/gi, 'pero')
        .replaceAll(/\bbecause\b/gi, 'porque')
        .replaceAll(/\blike\b/gi, 'como'),
      why:
        'The switch into English usually means the full Spanish connector or phrase is missing as a chunk, not that only one isolated word is unknown.',
      reframe:
        'Memorize connector chunks as ready-made pieces: "así que", "pero", "porque", "entonces". They help you stay inside Spanish while planning the rest.',
      drill:
        'Retell the same answer using only Spanish connectors: "pero", "porque", "entonces", "así que".',
      category: 'Flow + vocabulary',
      dimension: 'flow',
      signal: 'The sentence leaves Spanish when connector chunks are not available quickly enough',
    })
  }

  return issues
}

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
  const issues = buildRuleBasedIssues(text)
  const grammarIssues = issues.filter((issue) => issue.dimension === 'grammar').length
  const flowIssues = issues.filter((issue) => issue.dimension === 'flow').length
  const vocabularyIssues = issues.filter((issue) => issue.dimension === 'vocabulary').length
  const fillerPenalty = countMatches(lower, fillerWords.map((word) => ` ${word} `)) * 4
  const englishPenalty = countMatches(lower, englishMarkers) * 12
  const accentPenalty = /cafe|asi|llegue|pare|cafeteria|vacia/i.test(text) ? 8 : 0
  const grammarPenalty = (/\bfue muy llena\b/i.test(text) ? 12 : 0) + grammarIssues * 10
  const flowPenalty = flowIssues * 9
  const vocabularyPenalty = vocabularyIssues * 8

  return [
    {
      label: 'Grammar',
      value: `${clamp(92 - grammarPenalty - accentPenalty / 2, 58, 96)}%`,
    },
    {
      label: 'Flow',
      value: `${clamp(88 - fillerPenalty - englishPenalty / 2 - flowPenalty, 52, 95)}%`,
    },
    {
      label: 'Idiomacy',
      value: `${clamp(82 - englishPenalty - grammarPenalty / 2, 48, 93)}%`,
    },
    {
      label: 'Vocabulary',
      value: `${clamp(84 - englishPenalty / 2 - vocabularyPenalty, 55, 94)}%`,
    },
  ]
}

function buildInsight(text) {
  const lower = text.toLowerCase()
  const issues = buildRuleBasedIssues(text)
  const notes = []

  if (issues.some((issue) => issue.dimension === 'grammar')) {
    notes.push('This recording shows real grammar instability, especially in agreement or verb-shape choices that tend to slip when speech planning is under pressure.')
  }

  if (lower.includes('fue muy llena')) {
    notes.push('The main grammatical pressure point is a temporary-state description that leans toward ser instead of estar.')
  }

  if (/cafe|asi|llegue|pare|cafeteria|vacia/i.test(text)) {
    notes.push('The recording also suggests written-form cleanup around accent placement.')
  }

  if (countMatches(` ${lower} `, englishMarkers) > 0) {
    notes.push('Flow seems to break where Spanish connector chunks are not fully available yet.')
  }

  if (lower.includes('ocupado con mi trabajo') || lower.includes('muy ')) {
    notes.push('Some phrasing is understandable but still slightly literal, which points to idiomacy and vocabulary growth as the next step.')
  }

  if (!notes.length) {
    notes.push('The recording is understandable and fairly stable, so the next gains come from sounding more natural and more precise rather than only more correct.')
  }

  return notes.slice(0, 2).join(' ')
}

function buildDimensions(text) {
  const lower = text.toLowerCase()
  const issues = buildRuleBasedIssues(text)
  const grammarIssues = issues.filter((issue) => issue.dimension === 'grammar')
  const flowIssues = issues.filter((issue) => issue.dimension === 'flow')
  const vocabularyIssues = issues.filter((issue) => issue.dimension === 'vocabulary')

  return [
    {
      title: 'Grammatical Acuteness',
      score: '01',
      description:
        grammarIssues.length
          ? 'This recording shows clear grammar slippage inside the sentence, which suggests the structure is not yet stable enough to hold under speaking pressure.'
          : lower.includes('fue muy llena')
          ? 'This recording shows a grammar choice that is understandable but still points to a deeper ser-vs-estar distinction.'
          : /cafe|asi|llegue|pare|cafeteria|vacia/i.test(text)
            ? 'The grammar is mostly stable here, but the recording still reveals written-form details that affect polished Spanish.'
            : 'The grammar in this recording is fairly stable, so the next step is sharpening precision rather than repairing major structure.',
      signals: [
        grammarIssues[0]?.signal ||
          (lower.includes('fue muy llena')
          ? 'Temporary-state phrasing flagged around ser vs estar'
          : 'Verb-state choices look mostly stable in this turn'),
        grammarIssues[1]?.signal ||
          (/cafe|asi|llegue|pare|cafeteria|vacia/i.test(text)
          ? 'Accent marks are worth another pass'
          : 'Accent placement appears steady in this sample'),
        grammarIssues[2]?.signal ||
          (lower.includes('fue muy llena')
          ? 'The error suggests a meaning-choice issue, not only a missing form'
          : grammarIssues.length
            ? 'Several small grammar choices are competing at once, which is typical when monitoring overloads speaking fluency.'
            : 'No major agreement breakdown stands out in this turn'),
      ],
    },
    {
      title: 'Flow',
      score: '02',
      description:
        flowIssues.length
          ? 'Flow is being affected by planning load in this recording. The sentence tries to carry more meaning than the current spoken control can support cleanly.'
          : countMatches(` ${lower} `, englishMarkers) > 0
          ? 'Flow weakens where the sentence slips toward English, which usually means the full Spanish chunk is not fully automatic yet.'
          : lower.includes('...')
            ? 'The pacing in this recording suggests hesitation points that interrupt the thought before it fully lands.'
            : 'Flow is relatively steady in this recording, with only a few places where the phrasing could move more naturally.',
      signals: [
        flowIssues[0]?.signal ||
          (lower.includes('...')
          ? 'Long pause markers suggest hesitation'
          : 'Sentence rhythm stayed fairly continuous'),
        flowIssues[1]?.signal ||
          (countMatches(` ${lower} `, fillerWords.map((word) => ` ${word} `)) > 0
          ? 'Detected filler words that may interrupt pacing'
          : 'Few filler cues detected'),
        flowIssues[2]?.signal ||
          (countMatches(` ${lower} `, englishMarkers) > 0
          ? 'English fallback points to missing connector chunks under pressure'
          : flowIssues.length
            ? 'Reducing sentence length would likely improve fluency immediately'
            : 'The thought generally stays moving in Spanish'),
      ],
    },
    {
      title: 'Idiomacy',
      score: '03',
      description:
        lower.includes('ocupado con mi trabajo')
          ? 'The sentence makes sense, but part of it still sounds assembled from direct equivalents instead of natural Spanish chunks.'
          : lower.includes('muy ')
            ? 'The wording is clear, but it leans on broad, safe language where more native-like phrasing could carry more nuance.'
            : 'The phrasing is understandable and mostly stable, but there is still room to sound less translated and more idiomatic.',
      signals: [
        countMatches(` ${lower} `, englishMarkers) > 0
          ? 'English code-switching suggests missing Spanish chunks'
          : 'The turn stayed in Spanish throughout',
        lower.includes('ocupado con mi trabajo')
          ? 'A more conversational chunk could replace a literal phrasing'
          : 'The phrasing is a reasonable starting point for spoken Spanish',
        lower.includes('muy ')
          ? 'General intensifiers may be carrying too much of the expression'
          : 'The next gains come from chunking, not only correctness',
      ],
    },
    {
      title: 'Vocabulary Range',
      score: '04',
      description:
        vocabularyIssues.length
          ? 'This recording leans on broad, catch-all vocabulary in places where a more precise noun or phrase would carry the meaning more clearly.'
          : lower.includes('muy ')
          ? 'This recording relies on general-purpose wording, which is often a sign that stronger or more precise vocabulary has not become automatic yet.'
          : countMatches(` ${lower} `, englishMarkers) > 0
            ? 'Vocabulary range narrows when a missing Spanish word or connector forces a switch back toward English.'
            : 'Vocabulary is workable here, and the next improvement is choosing words that carry more nuance and specificity.',
      signals: [
        vocabularyIssues[0]?.signal ||
          (lower.includes('muy ')
          ? 'Repeated general intensifiers suggest room for richer wording'
          : 'Vocabulary variety is starting to open up'),
        vocabularyIssues[1]?.signal ||
          (countMatches(` ${lower} `, englishMarkers) > 0
          ? 'A missing Spanish word or connector caused a fallback to English'
          : 'No obvious lexical fallback to English in this sample'),
        vocabularyIssues[2]?.signal ||
          (lower.includes('ocupado con mi trabajo')
          ? 'A more natural chunk could replace a word-by-word choice'
          : vocabularyIssues.length
            ? 'The main gain here is naming the exact idea instead of reaching for a placeholder noun'
            : 'The main opportunity is precision, not basic comprehension'),
      ],
    },
  ]
}

function buildMoments(text) {
  const lower = text.toLowerCase()
  const issues = buildRuleBasedIssues(text)
  const moments = []

  issues.forEach((issue, index) => {
    moments.push({
      id: issue.id,
      label: `Moment ${String(index + 1).padStart(2, '0')}`,
      focus: issue.focus,
      original: issue.original,
      revision: issue.revision,
      why: issue.why,
      reframe: issue.reframe,
      drill: issue.drill,
      category: issue.category,
    })
  })

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
        ? text.replace(/ocupado con mi trabajo/gi, 'hasta arriba de trabajo')
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
      insight: buildInsight(cleanedTranscript),
      waveform: [14, 24, 18, 34, 20, 38, 27, 16, 31, 22, 29, 18, 26, 16, 22, 14],
      stats: buildStats(cleanedTranscript),
    },
    coachingDimensions: buildDimensions(cleanedTranscript),
    coachingMoments: buildMoments(cleanedTranscript),
  }
}
