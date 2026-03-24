const DATABASE_NAME = 'chatmate'
const DATABASE_VERSION = 1
const STORE_NAME = 'app-state'
const LIBRARY_RECORD_KEY = 'recording-library'

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

function createClientRecording(item) {
  return {
    ...item,
    audioUrl: item.audioBlob instanceof Blob ? URL.createObjectURL(item.audioBlob) : '',
  }
}

function stripClientFields(item) {
  return {
    id: item.id,
    createdAt: item.createdAt,
    title: item.title,
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
