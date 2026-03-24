export const sessionSnapshot = {
  title: 'Ordering coffee and making small talk',
  transcript: 'Ayer no fui al cafe porque estaba muy ocupado con mi trabajo.',
  insight:
    'Strong message overall. The next layer is idiomacy: "cafe" needs the accent, and "ocupado con mi trabajo" is correct but can sound flatter than a more natural spoken phrasing in context.',
  waveform: [16, 28, 20, 36, 22, 42, 30, 18, 38, 24, 34, 20, 31, 17, 26, 15],
  stats: [
    { label: 'Grammar', value: '86%' },
    { label: 'Flow', value: '74%' },
    { label: 'Idiomacy', value: '67%' },
    { label: 'Vocabulary', value: '71%' },
  ],
}

export const coachingDimensions = [
  {
    title: 'Grammatical Acuteness',
    score: '01',
    description:
      'Catch tense, agreement, and preposition issues while explaining the rule and the mental pattern behind the mistake.',
    signals: [
      'Tense consistency in narration',
      'Gender and number agreement',
      'Ser vs estar and por vs para choices',
    ],
  },
  {
    title: 'Flow',
    score: '02',
    description:
      'Notice pacing, sentence shape, and hesitation points so the learner can sound more natural and less translated from English.',
    signals: [
      'Overly literal sentence structure',
      'Pauses around uncertain forms',
      'Chunking ideas into natural phrases',
    ],
  },
  {
    title: 'Idiomacy',
    score: '03',
    description:
      'Show when something is technically correct but not how a native speaker would usually express it in the same setting.',
    signals: [
      'Register and tone fit',
      'Natural collocations',
      'Everyday spoken alternatives',
    ],
  },
  {
    title: 'Vocabulary Range',
    score: '04',
    description:
      'Suggest better-fitting synonyms and nearby expressions to help the learner say more precise things with confidence.',
    signals: [
      'Word choice precision',
      'Nuance between close synonyms',
      'Upgrade paths for common verbs',
    ],
  },
]

export const coachingMoments = [
  {
    id: 'moment-1',
    label: 'Moment 01',
    focus: 'Past tense and accent marks',
    original: 'Ayer no fui al cafe porque estaba muy ocupado con mi trabajo.',
    revision: 'Ayer no fui al café porque estuve hasta arriba de trabajo.',
    why:
      'You built the sentence correctly, but the phrasing stays close to English. Spanish often prefers a chunk like "estar hasta arriba de trabajo" to sound more lived-in and conversational.',
    reframe:
      'When the meaning is "I was swamped," do not search word by word. Search for a ready-made Spanish chunk that carries the whole situation naturally.',
    drill:
      'Say three alternatives out loud: "estuve muy ocupado", "andaba full de trabajo", and "estuve hasta arriba de trabajo." Notice the change in tone.',
    category: 'Idiomacy + vocabulary',
  },
  {
    id: 'moment-2',
    label: 'Moment 02',
    focus: 'Ser vs estar',
    original: 'La cafeteria fue muy llena cuando llegue.',
    revision: 'La cafetería estaba muy llena cuando llegué.',
    why:
      'This kind of slip appears when a permanent-state verb choice is carried over into a temporary scene description. The place is not essentially full; it was full at that moment.',
    reframe:
      'Ask whether you are defining the thing or describing its condition right now. If it is a condition in a scene, "estar" is usually the better first instinct.',
    drill:
      'Contrast pairs aloud: "es tranquila / esta tranquila", "es abierta / esta abierta", "es vacía / esta vacía."',
    category: 'Grammar',
  },
  {
    id: 'moment-3',
    label: 'Moment 03',
    focus: 'Connector choice and flow',
    original: 'Quise practicar, pero I got nervous, so pare.',
    revision: 'Quise practicar, pero me puse nervioso, así que paré.',
    why:
      'The switch back into English usually signals that a connective phrase is missing, not just a single word. You needed a whole bridge to keep the sentence moving.',
    reframe:
      'When your sentence breaks, ask for the connector first: "así que", "por eso", "entonces". Those bridges often unlock the rest of the thought.',
    drill:
      'Retell one short story using a different connector each time: "así que", "entonces", and "por eso".',
    category: 'Flow',
  },
]

export const roadmapSteps = [
  {
    title: 'Capture and segment speech',
    description:
      'Record a learner turn, split it into thought-sized moments, and surface the moments that are most useful to coach instead of showing every tiny slip.',
  },
  {
    title: 'Diagnose the deeper cause',
    description:
      'Label whether the issue comes from grammar knowledge, transfer from English, limited chunks, weak lexical range, or uncertainty under pressure.',
  },
  {
    title: 'Teach the mental model',
    description:
      'Respond with a short explanation that tells the learner what native-speaker instinct to borrow, not only what correction to memorize.',
  },
  {
    title: 'Turn insight into repetition',
    description:
      'Offer drills, contrastive examples, and next-session goals so improvement compounds across repeated Spanish conversations.',
  },
]
