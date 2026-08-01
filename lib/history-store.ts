import type { RecipeSnapshot } from './recipes'

export interface HistoryItem {
  id: string
  timestamp: number
  mode: 'generate' | 'edit' | 'variations'
  model: string
  prompt?: string
  recipe?: RecipeSnapshot
  images: Array<{ url?: string; b64_json?: string }>
}

const DB_NAME = 'ImageGenerationDB'
const STORE_NAME = 'history'
const DB_VERSION = 1
const MAX_HISTORY_ITEMS = 50

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

export async function getAllHistory(): Promise<HistoryItem[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).index('timestamp').openCursor(null, 'prev')
    const items: HistoryItem[] = []

    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        items.push(cursor.value as HistoryItem)
        cursor.continue()
      } else {
        resolve(items)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function clearAllHistory(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function addToHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>): Promise<void> {
  const historyItem: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  }

  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).add(historyItem)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    const allItems = await getAllHistory()
    await Promise.all(allItems.slice(MAX_HISTORY_ITEMS).map((oldItem) => deleteHistoryItem(oldItem.id)))
  } catch (error) {
    console.error('Failed to save to history:', error)
  }
}
