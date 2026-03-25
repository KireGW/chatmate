const DATABASE_NAME = 'chatmate'
const DATABASE_VERSION = 1
const STORE_NAME = 'app-state'
const LIBRARY_RECORD_KEY = 'recording-library'
const DEFAULT_WAVEFORM = [10, 16, 12, 18, 14, 20, 14, 11, 17, 13, 19, 12, 16, 10, 14, 11]

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null)
      return
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Could not open IndexedDB storage.'))
  })
}

function readStoreValue(database, key) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(key)

    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(new Error('Could not load recordings from IndexedDB.'))
  })
}

function writeStoreValue(database, key, value) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error('Could not save recordings to IndexedDB.'))

    store.put(value, key)
  })
}

function normalizeRecording(item) {
  const snapshot = item?.snapshot ?? {}
  const dimensions = Array.isArray(item?.dimensions) ? item.dimensions : []
  const moments = Array.isArray(item?.moments) ? item.moments : []
  const stats = Array.isArray(item?.stats)
    ? item.stats
    : Array.isArray(snapshot?.stats)
      ? snapshot.stats
      : []

  return {
    id: item?.id || crypto.randomUUID(),
    createdAt: item?.createdAt || new Date().toISOString(),
    language: item?.language || 'es',
    title: item?.title || 'Untitled recording',
    summary:
      typeof item?.summary === 'string' && item.summary.trim()
        ? item.summary
        : snapshot?.title || 'Summary available after analysis.',
    transcript: typeof item?.transcript === 'string' ? item.transcript : '',
    audioBlob: item?.audioBlob instanceof Blob ? item.audioBlob : null,
    snapshot: {
      title: snapshot?.title || item?.title || 'Untitled recording',
      transcript:
        typeof snapshot?.transcript === 'string'
          ? snapshot.transcript
          : typeof item?.transcript === 'string'
            ? item.transcript
            : '',
      insight:
        snapshot?.insight ||
        'This recording is saved locally. Press Analyze to process it and generate feedback.',
      waveform: Array.isArray(snapshot?.waveform) && snapshot.waveform.length
        ? snapshot.waveform
        : DEFAULT_WAVEFORM,
      stats,
    },
    dimensions,
    moments,
    stats,
    status: item?.status || (moments.length ? 'analyzed' : 'saved'),
  }
}

function createClientRecording(item) {
  const normalized = normalizeRecording(item)

  return {
    ...normalized,
    audioUrl:
      normalized.audioBlob instanceof Blob
        ? URL.createObjectURL(normalized.audioBlob)
        : '',
  }
}

function stripClientFields(item) {
  return {
    id: item.id,
    createdAt: item.createdAt,
    language: item.language || 'es',
    title: item.title,
    summary: item.summary,
    transcript: item.transcript,
    audioBlob: item.audioBlob,
    snapshot: item.snapshot,
    dimensions: item.dimensions,
    moments: item.moments,
    stats: item.stats,
  }
}

export async function loadRecordingLibrary() {
  const database = await openDatabase()

  if (!database) {
    return []
  }

  const items = await readStoreValue(database, LIBRARY_RECORD_KEY)
  const library = Array.isArray(items) ? items : []
  return library.map(createClientRecording)
}

export async function saveRecordingLibrary(items) {
  const database = await openDatabase()

  if (!database) {
    return
  }

  await writeStoreValue(
    database,
    LIBRARY_RECORD_KEY,
    items.map(stripClientFields),
  )
}

export function createLibraryRecordingAudioUrl(blob) {
  return URL.createObjectURL(blob)
}

export function revokeRecordingLibraryUrls(items) {
  items.forEach((item) => {
    if (typeof item.audioUrl === 'string' && item.audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(item.audioUrl)
    }
  })
}
