'use client'

import { CloudRegistry, TrashCan } from '@carbon/icons-react'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import * as motion from 'motion/react-client'
import { AnimatePresence } from 'motion/react'
import {
  deleteHistoryItem,
  getAllHistory,
  type HistoryItem,
} from '@/lib/history-store'

interface HistoryModalProps {
  isOpen: boolean
  onSelectImages: (images: string[]) => void
  onHistoryCountChange?: (count: number) => void
  reloadTrigger?: number
}

export function HistoryModal({ isOpen, onSelectImages, onHistoryCountChange, reloadTrigger }: HistoryModalProps) {
  const [history, setHistory] = useState<HistoryItem[] | null>(null)
  const [displayLimit, setDisplayLimit] = useState(20) // Show only first 20 items initially
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const loadHistory = useCallback(() => {
    getAllHistory()
      .then((items) => {
        setHistory(items)
        setDisplayLimit(20)
        onHistoryCountChange?.(items.length)
      })
      .catch((error) => {
        console.error('Failed to load history:', error)
        setHistory([]) // Set empty array on error so panel still shows
        onHistoryCountChange?.(0)
      })
  }, [onHistoryCountChange])

  useEffect(() => {
    if (isOpen) loadHistory()
  }, [isOpen, loadHistory])

  // Reload history when reloadTrigger changes (e.g., after clear all)
  useEffect(() => {
    if (isOpen && reloadTrigger !== undefined && reloadTrigger > 0) {
      loadHistory()
    }
  }, [reloadTrigger, isOpen, loadHistory])

  // Handle scroll for infinite loading
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!history || isLoadingMore) return

    const target = e.currentTarget
    const { scrollTop, scrollHeight, clientHeight } = target

    // Load more when within 200px of bottom
    if (scrollHeight - scrollTop <= clientHeight + 200) {
      if (displayLimit < history.length) {
        setIsLoadingMore(true)
        // Simulate small delay for smooth UX
        setTimeout(() => {
          setDisplayLimit(prev => Math.min(prev + 20, history.length))
          setIsLoadingMore(false)
        }, 100)
      }
    }
  }, [history, displayLimit, isLoadingMore])

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
          } catch {
            // Element already removed, ignore
          }
        }, 0)
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && history !== null ? (
      <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }}
      className="fixed top-16 right-4 bottom-4 w-full sm:w-80 z-40 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/70 backdrop-blur-[18px] backdrop-saturate-[1.8] shadow-2xl flex flex-col"
    >
      {/* Content */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:transition-colors relative"
        onScroll={handleScroll}
      >
          <AnimatePresence mode="wait">
            {history.length === 0 ? (
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
              {history.slice(0, displayLimit).map((item, index) => {
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
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.25,
                      // Cap animation delay at 20 items to prevent excessive stagger
                      delay: Math.min(index, 20) * 0.02,
                      ease: [0.4, 0, 0.2, 1]
                    }}
                    style={{ transform: 'translateY(0)' }}
                    className="group relative rounded-lg overflow-hidden bg-muted cursor-grab active:cursor-grabbing transition-colors"
                    onClick={() => handleSelectItem(item)}
                    draggable
                    onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, item)}
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
      ) : null}
    </AnimatePresence>
  )
}
