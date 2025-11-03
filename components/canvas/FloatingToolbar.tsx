'use client'

import { useState, useEffect } from 'react'
import { AddLarge, Settings, ArrowUp, Image, DocumentHorizontal, DocumentVertical, FitToWidth } from '@carbon/icons-react'
import { PromptInput } from '@/components/playground/PromptInput'
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

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const buttonLabel = selectedImagesCount > 0
    ? `Edit ${selectedImagesCount} image${selectedImagesCount > 1 ? 's' : ''}`
    : 'Generate'

  const modelConfig = AVAILABLE_MODELS[model]
  const availableAspectRatios = modelConfig?.aspectRatios || ['1:1']
  const availableImageSizes = modelConfig?.imageSizes || ['1K', '2K']

  const handleAspectRatioClick = () => {
    const currentIndex = availableAspectRatios.indexOf(aspectRatio)
    const nextIndex = (currentIndex + 1) % availableAspectRatios.length
    onAspectRatioChange(availableAspectRatios[nextIndex])
  }

  const handleImageSizeClick = () => {
    const currentIndex = availableImageSizes.indexOf(imageSize)
    const nextIndex = (currentIndex + 1) % availableImageSizes.length
    onImageSizeChange(availableImageSizes[nextIndex])
  }

  // Determine if aspect ratio is horizontal or vertical
  const [width, height] = aspectRatio.split(':').map(Number)
  const isHorizontal = width >= height

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4">
      <div className="bg-neutral-100/70 dark:bg-neutral-800/70 rounded-2xl shadow-2xl backdrop-blur-[18px] backdrop-saturate-[1.8]">
        {/* Collapsed view - always visible */}
        <div className="pb-4">
          {/* Prompt input - full width */}
          <div className="px-1 pt-1">
            <PromptInput
              value={prompt}
              onChange={onPromptChange}
              placeholder={
                selectedImagesCount > 0
                  ? `Describe how to edit the selected image${selectedImagesCount > 1 ? 's' : ''}...`
                  : 'Describe the image you want to generate...'
              }
              maxLength={4000}
            />
          </div>

          {/* All action buttons in a single row below */}
          <div className="flex items-center justify-between gap-2 px-4 pt-3">
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
                className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-accent transition-colors"
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
                className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-accent transition-colors"
                title={`Aspect ratio: ${aspectRatio}`}
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
                className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-accent transition-colors"
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
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="Settings"
              >
                <Settings size={20} />
              </button>
            </div>

            {/* Right side: Generate/Edit button */}
            <button
              onClick={onGenerate}
              disabled={!prompt.trim()}
              title={buttonLabel}
              className={cn(
                'p-3 rounded-full font-medium transition-all flex items-center justify-center',
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
