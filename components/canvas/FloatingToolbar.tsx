'use client'

import { useState, useEffect, useCallback } from 'react'
import { AddLarge, Settings, ArrowUp, Image, DocumentHorizontal, DocumentVertical, FitToWidth } from '@carbon/icons-react'
import { PromptInput } from '@/components/cascade/PromptInput'
import { cn } from '@/lib/utils'
import { type ModelKey, AVAILABLE_MODELS } from '@/lib/models'
import * as motion from 'motion/react-client'

interface FloatingToolbarProps {
  prompt: string
  onPromptChange: (prompt: string) => void
  model: ModelKey
  onModelChange: (model: ModelKey) => void
  aspectRatio: string
  onAspectRatioChange: (ratio: string) => void
  imageSize: string
  onImageSizeChange: (size: string) => void
  numImages: number
  onNumImagesChange: (num: number) => void
  activeGenerationsCount: number
  onGenerate: () => void
  onOpenUpload: () => void
  onOpenSettings: () => void
  selectedImagesCount: number
}

const HISTORY_STORAGE_KEY = 'prompt-history'
const MAX_HISTORY_SIZE = 50

// Helper functions for localStorage
function loadPromptHistory(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Failed to load prompt history:', error)
    return []
  }
}

function savePromptHistory(history: string[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch (error) {
    console.error('Failed to save prompt history:', error)
  }
}

export function FloatingToolbar({
  prompt,
  onPromptChange,
  model,
  onModelChange,
  aspectRatio,
  onAspectRatioChange,
  imageSize,
  onImageSizeChange,
  numImages,
  onNumImagesChange,
  activeGenerationsCount,
  onGenerate,
  onOpenUpload,
  onOpenSettings,
  selectedImagesCount,
}: FloatingToolbarProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [promptHistory, setPromptHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [temporaryPrompt, setTemporaryPrompt] = useState<string>('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
    // Load history from localStorage
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPromptHistory(loadPromptHistory())
  }, [])

  const buttonLabel = selectedImagesCount > 0
    ? `Edit ${selectedImagesCount} image${selectedImagesCount > 1 ? 's' : ''}`
    : 'Generate'

  const modelConfig = AVAILABLE_MODELS[model]
  const availableAspectRatios = modelConfig?.aspectRatios || ['1:1']
  const availableImageSizes = modelConfig?.imageSizes || ['1K', '2K']

  const handleAspectRatioClick = () => {
    const currentIndex = availableAspectRatios.indexOf(aspectRatio as any)
    const nextIndex = (currentIndex + 1) % availableAspectRatios.length
    onAspectRatioChange(availableAspectRatios[nextIndex])
  }

  const handleImageSizeClick = () => {
    const currentIndex = availableImageSizes.indexOf(imageSize as any)
    const nextIndex = (currentIndex + 1) % availableImageSizes.length
    onImageSizeChange(availableImageSizes[nextIndex])
  }

  // Add prompt to history
  const addToHistory = useCallback((newPrompt: string) => {
    if (!newPrompt.trim()) return

    setPromptHistory((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter((p) => p !== newPrompt)
      // Add to beginning, keep max size
      const newHistory = [newPrompt, ...filtered].slice(0, MAX_HISTORY_SIZE)
      // Save to localStorage
      savePromptHistory(newHistory)
      return newHistory
    })
    // Reset history navigation
    setHistoryIndex(-1)
    setTemporaryPrompt('')
  }, [])

  // Handle arrow key navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()

        if (promptHistory.length === 0) return

        // Save current prompt when starting navigation
        if (historyIndex === -1) {
          setTemporaryPrompt(prompt)
        }

        const newIndex = Math.min(historyIndex + 1, promptHistory.length - 1)
        setHistoryIndex(newIndex)
        onPromptChange(promptHistory[newIndex])
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()

        if (historyIndex === -1) return

        if (historyIndex === 0) {
          // Return to temporary prompt
          setHistoryIndex(-1)
          onPromptChange(temporaryPrompt)
        } else {
          const newIndex = historyIndex - 1
          setHistoryIndex(newIndex)
          onPromptChange(promptHistory[newIndex])
        }
      }
    },
    [promptHistory, historyIndex, prompt, temporaryPrompt, onPromptChange]
  )

  // Wrap onGenerate to save prompt to history
  const handleGenerate = useCallback(() => {
    addToHistory(prompt)
    onGenerate()
  }, [prompt, onGenerate, addToHistory])

  // Determine if aspect ratio is horizontal or vertical
  const [width, height] = aspectRatio.split(':').map(Number)
  const isHorizontal = width >= height

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4">
      <div className="bg-card dark:bg-card rounded-2xl shadow-2xl backdrop-blur-xl border border-border">
        {/* Collapsed view - always visible */}
        <div>
          {/* Prompt input - full width */}
          <div className="px-1 pt-1">
            <PromptInput
              value={prompt}
              onChange={onPromptChange}
              onKeyDown={handleKeyDown}
              onSubmit={handleGenerate}
              placeholder={
                selectedImagesCount > 0
                  ? `Describe how to edit the selected image${selectedImagesCount > 1 ? 's' : ''}...`
                  : 'Describe the image you want to generate...'
              }
              maxLength={4000}
              animationKey={historyIndex >= 0 ? `history-${historyIndex}` : undefined}
              isMounted={isMounted}
            />
          </div>

          {/* All action buttons in a single row below */}
          <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-3">
            {/* Left side action buttons */}
            <div className="flex items-center gap-2">
              <motion.button
                onClick={onOpenUpload}
                className="p-2 rounded-lg bg-accent hover:brightness-110 transition-all shadow-sm"
                title="Upload images"
                whileHover={{ scale: 1.15 }}
                transition={{ duration: 0.1, ease: [0.4, 0, 0.2, 1] }}
              >
                <AddLarge size={20} />
              </motion.button>
              <button
                onClick={() => onNumImagesChange(numImages >= 4 ? 1 : numImages + 1)}
                className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Number of images to generate"
              >
                <Image size={20} />
                <span className="text-sm font-medium tabular-nums inline-block overflow-hidden">
                  <motion.span
                    key={numImages}
                    initial={isMounted ? { y: 20, opacity: 0 } : false}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="inline-block"
                  >
                    {numImages}
                  </motion.span>
                </span>
              </button>
              <button
                onClick={handleAspectRatioClick}
                disabled={selectedImagesCount > 0}
                className={`flex items-center gap-1.5 px-2 py-2 rounded-lg transition-colors ${
                  selectedImagesCount > 0
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-white/10'
                }`}
                title={
                  selectedImagesCount > 0
                    ? 'Edit mode uses 1:1 aspect ratio'
                    : `Aspect ratio: ${aspectRatio}`
                }
              >
                {isHorizontal ? (
                  <DocumentHorizontal size={20} />
                ) : (
                  <DocumentVertical size={20} />
                )}
                <span className="text-sm font-medium inline-block overflow-hidden">
                  <motion.span
                    key={aspectRatio}
                    initial={isMounted ? { y: 20, opacity: 0 } : false}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="inline-block"
                  >
                    {aspectRatio}
                  </motion.span>
                </span>
              </button>
              <button
                onClick={handleImageSizeClick}
                className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors"
                title={`Resolution: ${imageSize}`}
              >
                <FitToWidth size={20} />
                <span className="text-sm font-medium inline-block overflow-hidden">
                  <motion.span
                    key={imageSize}
                    initial={isMounted ? { y: 20, opacity: 0 } : false}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="inline-block"
                  >
                    {imageSize}
                  </motion.span>
                </span>
              </button>
              <button
                onClick={onOpenSettings}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Settings"
              >
                <Settings size={20} />
              </button>
            </div>

            {/* Right side: Generate/Edit button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              title={buttonLabel}
              className={cn(
                'p-3 rounded-full font-medium transition-all flex items-center justify-center -translate-y-2',
                'bg-primary text-primary-foreground hover:opacity-90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <ArrowUp size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
