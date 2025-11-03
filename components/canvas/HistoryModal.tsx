'use client'

import { CloudRegistry, TrashCan } from '@carbon/icons-react'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import * as motion from 'motion/react-client'
import { AnimatePresence } from 'motion/react'

export interface HistoryItem {
  id: string
  timestamp: number
  mode: 'generate' | 'edit' | 'variations'
  model: string
  prompt?: string
  images: Array<{ url?: string; b64_json?: string }>
}

interface HistoryModalProps {
  isOpen: boolean
  onSelectImages: (images: string[]) => void
  onHistoryCountChange?: (count: number) => void
  reloadTrigger?: number
}

// IndexedDB helper functions
const DB_NAME = 'ImageGenerationDB'
const STORE_NAME = 'history'
const DB_VERSION = 1

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

async function getAllHistory(): Promise<HistoryItem[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('timestamp')
    const request = index.openCursor(null, 'prev') // Descending order

    const items: HistoryItem[] = []

    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        items.push(cursor.value)
        cursor.continue()
      } else {
        resolve(items)
      }
    }

    request.onerror = () => reject(request.error)
  })
}

async function deleteHistoryItem(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function clearAllHistory(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export function HistoryModal({ isOpen, onSelectImages, onHistoryCountChange, reloadTrigger }: HistoryModalProps) {
  const [history, setHistory] = useState<HistoryItem[] | null>(null)
  const [shouldRender, setShouldRender] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const loadHistory = useCallback(() => {
    getAllHistory()
      .then((items) => {
        setHistory(items)
        onHistoryCountChange?.(items.length)
      })
      .catch((error) => {
        console.error('Failed to load history:', error)
        setHistory([]) // Set empty array on error so panel still shows
        onHistoryCountChange?.(0)
      })
  }, [onHistoryCountChange])

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      setShouldRender(true)
      // Load history when modal opens
      loadHistory()
    } else if (shouldRender) {
      // Wait for exit animation before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false)
        setHistory(null)
      }, 300) // Match panel exit duration
      return () => clearTimeout(timer)
    }
  }, [isOpen, shouldRender, loadHistory])

  // Reload history when reloadTrigger changes (e.g., after clear all)
  useEffect(() => {
    if (isOpen && reloadTrigger !== undefined && reloadTrigger > 0) {
      // Trigger clearing animation
      setIsClearing(true)
      // Wait for individual item animations and grid exit to complete
      const itemCount = history?.length || 0
      const itemExitDuration = 250 + itemCount * 20 // Individual items fade out
      const gridExitDuration = 200 // Grid container exit
      const totalDuration = itemExitDuration + gridExitDuration
      setTimeout(() => {
        loadHistory()
        setIsClearing(false)
      }, totalDuration)
    }
  }, [reloadTrigger, isOpen, loadHistory, history?.length])

  const deleteItem = async (id: string) => {
    if (!history) return
    await deleteHistoryItem(id)
    const newHistory = history.filter((item) => item.id !== id)
    setHistory(newHistory)
    onHistoryCountChange?.(newHistory.length)
  }


  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const getImageUrls = (item: HistoryItem): string[] => {
    return item.images
      .map((img) => {
        if (img.url) return img.url
        if (img.b64_json) {
          // Check if already has data URL prefix
          if (img.b64_json.startsWith('data:')) return img.b64_json
          return `data:image/png;base64,${img.b64_json}`
        }
        return null
      })
      .filter((url): url is string => url !== null)
  }

  const handleSelectItem = (item: HistoryItem) => {
    const imageUrls = getImageUrls(item)
    if (imageUrls.length > 0) {
      onSelectImages(imageUrls)
    }
  }

  const handleDragStart = (e: React.DragEvent, item: HistoryItem) => {
    const imageUrls = getImageUrls(item)
    if (imageUrls.length > 0) {
      // Store the first image URL for drag and drop
      e.dataTransfer.setData('text/plain', imageUrls[0])
      e.dataTransfer.effectAllowed = 'copy'

      // Create a clean drag preview with just the image (no card, no hover effects)
      const imgElement = e.currentTarget.querySelector('img')
      if (imgElement) {
        // Clone the image to avoid the hover state
        const dragPreview = imgElement.cloneNode(true) as HTMLImageElement
        dragPreview.style.position = 'absolute'
        dragPreview.style.top = '-9999px' // Position off-screen
        dragPreview.style.left = '-9999px'
        dragPreview.style.width = `${imgElement.width}px`
        dragPreview.style.height = `${imgElement.height}px`
        dragPreview.style.border = 'none'
        dragPreview.style.borderRadius = '8px'
        dragPreview.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'

        document.body.appendChild(dragPreview)

        // Set the cloned image as drag preview
        e.dataTransfer.setDragImage(dragPreview, dragPreview.width / 2, dragPreview.height / 2)

        // Clean up the preview after drag starts
        setTimeout(() => {
          try {
            if (dragPreview.parentNode) {
              document.body.removeChild(dragPreview)
            }
          } catch (err) {
            // Element already removed, ignore
          }
        }, 0)
      }
    }
  }

  if (!shouldRender || history === null) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={isOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }}
      className="fixed top-16 right-4 bottom-4 w-full sm:w-80 z-40 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/70 backdrop-blur-[18px] backdrop-saturate-[1.8] shadow-2xl flex flex-col"
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:transition-colors relative">
          <AnimatePresence mode="wait">
            {history.length === 0 && !isClearing ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center h-full text-center absolute inset-0"
              >
                <CloudRegistry size={24} className="text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Your generation history will appear here
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid gap-4 grid-cols-2"
              >
              {history.map((item, index) => {
                const imageUrl =
                  item.images[0]?.url ||
                  (item.images[0]?.b64_json
                    ? item.images[0].b64_json.startsWith('data:')
                      ? item.images[0].b64_json
                      : `data:image/png;base64,${item.images[0].b64_json}`
                    : '')

                // Skip if no image URL
                if (!imageUrl) {
                  return null
                }

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={
                      isClearing
                        ? { opacity: 0, scale: 0.9 }
                        : isOpen
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0, scale: 0.9 }
                    }
                    transition={{
                      duration: 0.25,
                      delay: isClearing ? index * 0.02 : isOpen ? index * 0.02 : 0,
                      ease: [0.4, 0, 0.2, 1]
                    }}
                    style={{ transform: 'translateY(0)' }}
                    className="group relative rounded-lg overflow-hidden bg-muted cursor-grab active:cursor-grabbing transition-colors"
                    onClick={() => handleSelectItem(item)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                  >
                    <div className="relative aspect-square w-full">
                      <Image
                        src={imageUrl}
                        alt="History item"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs text-white font-medium truncate mb-1">
                        {item.prompt || `${item.mode} - ${item.model}`}
                      </p>
                      <p className="text-xs text-white/70">{formatDate(item.timestamp)}</p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteItem(item.id)
                      }}
                      className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      aria-label="Delete"
                    >
                      <TrashCan size={12} className="text-white" />
                    </button>

                    {item.images.length > 1 && (
                      <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
                        +{item.images.length - 1}
                      </div>
                    )}
                  </motion.div>
                )
              })}
              </motion.div>
            )}
          </AnimatePresence>
      </div>
    </motion.div>
  )
}

// Export clearAllHistory helper for parent components
export { clearAllHistory }

// Helper function to add item to history (to be called from main page)
export async function addToHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>) {
  const historyItem: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  }

  try {
    const db = await openDB()

    // Add the new item
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.add(historyItem)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    // Keep only last 50 items (clean up old ones)
    const allItems = await getAllHistory()
    if (allItems.length > 50) {
      const itemsToDelete = allItems.slice(50)
      await Promise.all(itemsToDelete.map((item) => deleteHistoryItem(item.id)))
    }
  } catch (error) {
    console.error('Failed to save to history:', error)
  }
}
