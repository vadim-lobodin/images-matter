'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, History, Upload, Settings, Sparkles } from 'lucide-react'
import { PromptInput } from '@/components/playground/PromptInput'
import { ModelSelector } from '@/components/playground/ModelSelector'
import { ParameterControls } from '@/components/playground/ParameterControls'
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
  isLoading: boolean
  onGenerate: () => void
  onOpenHistory: () => void
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
  isLoading,
  onGenerate,
  onOpenHistory,
  onOpenUpload,
  onOpenSettings,
  selectedImagesCount,
}: FloatingToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const buttonLabel = selectedImagesCount > 0
    ? `Edit ${selectedImagesCount} image${selectedImagesCount > 1 ? 's' : ''}`
    : 'Generate'

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl backdrop-blur-sm">
        {/* Collapsed view - always visible */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Left side: Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onOpenUpload}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="Upload images"
              >
                <Upload className="w-5 h-5" />
              </button>
              <button
                onClick={onOpenHistory}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="History"
              >
                <History className="w-5 h-5" />
              </button>
              <button
                onClick={onOpenSettings}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Center: Prompt input */}
            <div className="flex-1 min-w-0">
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

            {/* Right side: Generate button and expand toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onGenerate}
                disabled={isLoading || !prompt.trim()}
                className={cn(
                  'px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2',
                  'bg-primary text-primary-foreground hover:opacity-90',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Sparkles className="w-4 h-4" />
                {isLoading ? 'Generating...' : buttonLabel}
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title={isExpanded ? 'Collapse settings' : 'Expand settings'}
              >
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded view - parameters */}
        {isExpanded && (
          <div className="border-t border-border p-4 space-y-4 animate-in slide-in-from-top-2">
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
