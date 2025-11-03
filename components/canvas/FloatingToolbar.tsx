'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, AddFilled, Settings, ArrowUp } from '@carbon/icons-react'
import { PromptInput } from '@/components/playground/PromptInput'
import { ModelSelector } from '@/components/playground/ModelSelector'
import { ParameterControls } from '@/components/playground/ParameterControls'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import { type ModelKey } from '@/lib/models'

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
  const [isExpanded, setIsExpanded] = useState(false)

  const buttonLabel = selectedImagesCount > 0
    ? `Edit ${selectedImagesCount} image${selectedImagesCount > 1 ? 's' : ''}`
    : 'Generate'

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4">
      <div className="bg-zinc-100/70 dark:bg-zinc-800/70 rounded-2xl shadow-2xl backdrop-blur-[18px] backdrop-saturate-[1.8]">
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
              <button
                onClick={onOpenUpload}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="Upload images"
              >
                <AddFilled size={20} />
              </button>
              <ThemeToggle />
              <button
                onClick={onOpenSettings}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="Settings"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title={isExpanded ? 'Collapse settings' : 'Expand settings'}
              >
                {isExpanded ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronUp size={20} />
                )}
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

        {/* Expanded view - parameters */}
        {isExpanded && (
          <div className="border-t border-border p-4 space-y-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Model</label>
                <ModelSelector value={model} onChange={onModelChange} />
              </div>
            </div>

            <ParameterControls
              model={model}
              aspectRatio={aspectRatio}
              onAspectRatioChange={onAspectRatioChange}
              imageSize={imageSize}
              onImageSizeChange={onImageSizeChange}
              numImages={numImages}
              onNumImagesChange={onNumImagesChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
