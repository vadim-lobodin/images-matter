'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useEffect, useRef } from 'react'
import { AddLarge, Settings, ArrowUp, Image as ImageIcon, DocumentHorizontal, DocumentVertical, FitToWidth, AiLabel, AiGenerate, Close, ImageReference } from '@carbon/icons-react'
import { PromptInput } from '@/components/cascade/PromptInput'
import { cn } from '@/lib/utils'
import { type ModelKey, AVAILABLE_MODELS, getModelsForApiMode } from '@/lib/models'
import * as motion from 'motion/react-client'
import { useHydrated } from '@/lib/use-hydrated'
import { BlobImage } from '@/components/ui/BlobImage'
import {
  RECIPE_INFLUENCE_LABELS,
  type AppliedRecipe,
  type Recipe,
  type RecipeInfluence,
} from '@/lib/recipes'

const RecipeMenu = dynamic(
  () => import('@/components/cascade/RecipeMenu').then((module) => module.RecipeMenu),
  { ssr: false }
)

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
  apiMode: 'litellm' | 'gemini'
  activeRecipe: AppliedRecipe | null
  onRecipeApply: (recipe: Recipe) => void
  onRecipeRemove: () => void
  onRecipeInfluenceChange: (influence: RecipeInfluence) => void
  onRecipeUpdated: (recipe: Recipe) => void
  onRecipeDeleted: (id: string) => void
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

function RecipeAttachmentPreview({ activeRecipe }: { activeRecipe: AppliedRecipe }) {
  return (
    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-black/5 dark:bg-white/5">
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <ImageReference size={17} />
      </div>
      {activeRecipe.recipe.image?.thumbnailBlob ? (
        <BlobImage
          blob={activeRecipe.recipe.image.thumbnailBlob}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </div>
  )
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
  apiMode,
  activeRecipe,
  onRecipeApply,
  onRecipeRemove,
  onRecipeInfluenceChange,
  onRecipeUpdated,
  onRecipeDeleted,
}: FloatingToolbarProps) {
  const isMounted = useHydrated()
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [promptHistory, setPromptHistory] = useState<string[]>(loadPromptHistory)
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [temporaryPrompt, setTemporaryPrompt] = useState<string>('')
  const [isRecipeMenuOpen, setIsRecipeMenuOpen] = useState(false)

  useEffect(() => {
    if (!isRecipeMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) setIsRecipeMenuOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsRecipeMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isRecipeMenuOpen])

  // Get models available for current API mode
  const availableModels = getModelsForApiMode(apiMode)
  const availableModelKeys = Object.keys(availableModels) as ModelKey[]

  const buttonLabel = selectedImagesCount > 0
    ? `Edit ${selectedImagesCount} image${selectedImagesCount > 1 ? 's' : ''}`
    : 'Generate'

  const modelConfig = AVAILABLE_MODELS[model]
  const availableAspectRatios = modelConfig?.aspectRatios || ['1:1']
  const availableImageSizes = modelConfig?.imageSizes || ['1K']

  const handleAspectRatioClick = () => {
    const currentIndex = availableAspectRatios.findIndex((ratio) => ratio === aspectRatio)
    const nextIndex = (currentIndex + 1) % availableAspectRatios.length
    onAspectRatioChange(availableAspectRatios[nextIndex])
  }

  const handleImageSizeClick = () => {
    const currentIndex = availableImageSizes.findIndex((size) => size === imageSize)
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
    <div ref={toolbarRef} className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4">
      {isRecipeMenuOpen ? (
        <div className="absolute bottom-full left-4 mb-3">
          <RecipeMenu
            apiMode={apiMode}
            activeRecipe={activeRecipe}
            onApply={onRecipeApply}
            onInfluenceChange={onRecipeInfluenceChange}
            onRecipeUpdated={onRecipeUpdated}
            onRecipeDeleted={onRecipeDeleted}
            onClose={() => setIsRecipeMenuOpen(false)}
          />
        </div>
      ) : null}
      <div className="bg-neutral-100/70 dark:bg-neutral-800/70 rounded-2xl shadow-2xl backdrop-blur-[18px] backdrop-saturate-[1.8]">
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

          {activeRecipe ? (
            <div className="flex min-w-0 px-4 pt-2">
              <div className="inline-flex min-w-0 max-w-full items-stretch overflow-hidden rounded-xl bg-white/55 shadow-sm dark:bg-white/10">
                <button
                  type="button"
                  onClick={() => setIsRecipeMenuOpen(true)}
                  className="flex min-w-0 items-center gap-2 py-1.5 pl-1.5 pr-2 text-left transition-colors hover:bg-white/50 dark:hover:bg-white/5"
                  aria-label={`Edit attached recipe ${activeRecipe.recipe.name}`}
                >
                  <RecipeAttachmentPreview activeRecipe={activeRecipe} />
                  <span className="min-w-0">
                    <span className="block max-w-48 truncate text-xs font-semibold">{activeRecipe.recipe.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {RECIPE_INFLUENCE_LABELS[activeRecipe.influence]} influence
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onRecipeRemove}
                  className="flex shrink-0 items-center border-l border-black/5 px-2 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:border-white/10 dark:hover:bg-white/10"
                  aria-label={`Remove recipe ${activeRecipe.recipe.name}`}
                  title="Remove recipe"
                >
                  <Close size={16} />
                </button>
              </div>
            </div>
          ) : null}

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
                type="button"
                onClick={() => setIsRecipeMenuOpen((open) => !open)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2 py-2 transition-colors',
                  activeRecipe
                    ? 'bg-white/55 shadow-sm hover:bg-white/75 dark:bg-white/10 dark:hover:bg-white/15'
                    : 'hover:bg-white/10'
                )}
                aria-label="Open recipe library"
                aria-expanded={isRecipeMenuOpen}
                title="Recipes"
              >
                <ImageReference size={20} />
                <span className="hidden text-sm font-medium sm:inline">Recipe</span>
              </button>
              <button
                onClick={() => {
                  if (availableModelKeys.length <= 1) return
                  const currentIndex = availableModelKeys.indexOf(model)
                  const nextIndex = (currentIndex + 1) % availableModelKeys.length
                  onModelChange(availableModelKeys[nextIndex])
                }}
                disabled={availableModelKeys.length <= 1}
                className={`flex items-center gap-1.5 px-2 py-2 rounded-lg transition-colors ${
                  availableModelKeys.length <= 1
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-white/10'
                }`}
                title={availableModelKeys.length <= 1 ? 'Only one model available' : `Model: ${modelConfig?.name || model}`}
              >
                {model.includes('gemini-3') ? (
                  <AiGenerate size={20} />
                ) : (
                  <AiLabel size={20} />
                )}
                <span className="text-sm font-medium inline-block overflow-hidden">
                  <motion.span
                    key={model}
                    initial={isMounted ? { y: 20, opacity: 0 } : false}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="inline-block"
                  >
                    {modelConfig?.shortName || modelConfig?.name || model}
                  </motion.span>
                </span>
              </button>
              <button
                onClick={() => onNumImagesChange(numImages >= 4 ? 1 : numImages + 1)}
                className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Number of images to generate"
              >
                <ImageIcon size={20} />
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
                disabled={availableAspectRatios.length <= 1}
                className={`flex items-center gap-1.5 px-2 py-2 rounded-lg transition-colors ${
                  availableAspectRatios.length <= 1
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-white/10'
                }`}
                title={availableAspectRatios.length <= 1 ? 'Only 1:1 supported' : `Aspect ratio: ${aspectRatio}`}
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
                disabled={availableImageSizes.length <= 1}
                className={`flex items-center gap-1.5 px-2 py-2 rounded-lg transition-colors ${
                  availableImageSizes.length <= 1
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-white/10'
                }`}
                title={availableImageSizes.length <= 1 ? 'Only 1K supported' : `Resolution: ${imageSize}`}
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
              disabled={!prompt.trim() || activeGenerationsCount > 0}
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
