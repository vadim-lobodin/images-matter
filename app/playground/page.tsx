'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { FloatingToolbar } from '@/components/canvas/FloatingToolbar'
import { ImageUploadZone } from '@/components/canvas/ImageUploadZone'
import { HistoryModal, addToHistory } from '@/components/canvas/HistoryModal'
import { ApiSettings } from '@/components/playground/ApiSettings'
import { type ModelKey } from '@/lib/models'
import type { GeneratedImageShape } from '@/lib/canvas/ImageShape'
import type { Editor } from '@tldraw/tldraw'

// Dynamically import TldrawCanvas to avoid SSR issues
const TldrawCanvas = dynamic(
  () => import('@/components/canvas/TldrawCanvas').then((mod) => mod.TldrawCanvas),
  { ssr: false }
)

// Dynamically import canvas helpers to avoid tldraw SSR issues
const canvasHelpers = {
  addImagesToCanvas: null as any,
  extractImageDataFromShapes: null as any,
  getSelectionCenter: null as any,
  getViewportCenter: null as any,
  addImageToCanvas: null as any,
}

// Helper to get API credentials from localStorage
function getApiCredentials() {
  if (typeof window === 'undefined') return null
  const apiKey = localStorage.getItem('litellm_api_key')
  const proxyUrl = localStorage.getItem('litellm_proxy_url')
  return apiKey && proxyUrl ? { apiKey, proxyUrl } : null
}

export default function PlaygroundPage() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [model, setModel] = useState<ModelKey>('vertex_ai/gemini-2.5-flash-image')
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [imageSize, setImageSize] = useState('1K')
  const [numImages, setNumImages] = useState(1)
  const [selectedImages, setSelectedImages] = useState<GeneratedImageShape[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [helpersLoaded, setHelpersLoaded] = useState(false)

  // Load canvas helpers dynamically on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/canvas/canvasHelpers').then((mod) => {
        canvasHelpers.addImagesToCanvas = mod.addImagesToCanvas
        canvasHelpers.extractImageDataFromShapes = mod.extractImageDataFromShapes
        canvasHelpers.getSelectionCenter = mod.getSelectionCenter
        canvasHelpers.getViewportCenter = mod.getViewportCenter
        canvasHelpers.addImageToCanvas = mod.addImageToCanvas
        setHelpersLoaded(true)
      })
    }
  }, [])

  // Helper to extract images as data URLs from response
  const extractImagesFromResponse = (response: any): string[] => {
    const images = response.choices.flatMap((choice: any) => {
      if (choice.message.images && choice.message.images.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return choice.message.images.map((imageData: any) => {
          let dataUrl: string

          if (typeof imageData === 'object' && imageData.image_url?.url) {
            dataUrl = imageData.image_url.url
          } else if (typeof imageData === 'string') {
            dataUrl = imageData
          } else if (typeof imageData === 'object') {
            dataUrl = imageData.url || imageData.b64_json || imageData.data || ''
          } else {
            dataUrl = String(imageData)
          }

          // Ensure data URL format
          if (!dataUrl.startsWith('data:')) {
            dataUrl = `data:image/png;base64,${dataUrl}`
          }

          return dataUrl
        })
      }
      return []
    })

    return images
  }

  const handleGenerate = async () => {
    if (!editor || !helpersLoaded) {
      setError('Canvas is still loading, please wait...')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const credentials = getApiCredentials()

      if (!credentials) {
        throw new Error('Please configure your API credentials in Settings')
      }

      // Determine if this is generate or edit based on selection
      const isEdit = selectedImages.length > 0

      console.log('Generate clicked:', { isEdit, selectedCount: selectedImages.length })

      if (isEdit) {
        // Edit mode - use selected images
        const inputImages = await canvasHelpers.extractImageDataFromShapes(selectedImages, editor)
        console.log('Input images extracted:', inputImages.length, 'from', selectedImages.length, 'selected')

        if (inputImages.length === 0) {
          throw new Error('Failed to extract image data from selected images. Please try again or use the Upload button.')
        }

        if (inputImages.length < selectedImages.length) {
          console.warn(`Only ${inputImages.length} of ${selectedImages.length} images could be extracted`)
        }

        const { editGeminiImage } = await import('@/lib/litellm-client')

        const response = await editGeminiImage({
          model,
          prompt,
          images: inputImages,
          aspectRatio,
          imageSize,
          numImages,
          apiKey: credentials.apiKey,
          baseURL: credentials.proxyUrl,
        })

        const imageUrls = extractImagesFromResponse(response)

        if (imageUrls.length === 0) {
          throw new Error('No images were generated')
        }

        // Add images to canvas near selection
        const centerPos = canvasHelpers.getSelectionCenter(editor, selectedImages)
        canvasHelpers.addImagesToCanvas(editor, imageUrls, centerPos, {
          prompt,
          model,
          aspectRatio,
          resolution: imageSize,
        })

        // Save to history
        await addToHistory({
          mode: 'edit',
          model,
          prompt,
          images: imageUrls.map((url) => ({ url })),
        })
      } else {
        // Generate mode - no selection
        const { generateGeminiImage } = await import('@/lib/litellm-client')

        const response = await generateGeminiImage({
          model,
          prompt,
          aspectRatio,
          imageSize,
          numImages,
          apiKey: credentials.apiKey,
          baseURL: credentials.proxyUrl,
        })

        const imageUrls = extractImagesFromResponse(response)

        if (imageUrls.length === 0) {
          throw new Error('No images were generated')
        }

        // Add images to canvas at viewport center
        const centerPos = canvasHelpers.getViewportCenter(editor)
        canvasHelpers.addImagesToCanvas(editor, imageUrls, centerPos, {
          prompt,
          model,
          aspectRatio,
          resolution: imageSize,
        })

        // Save to history
        await addToHistory({
          mode: 'generate',
          model,
          prompt,
          images: imageUrls.map((url) => ({ url })),
        })
      }

      // Clear prompt after successful generation
      setPrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImagesUploaded = (images: string[]) => {
    if (!editor || !helpersLoaded) return

    // Add uploaded images to canvas at viewport center
    const centerPos = canvasHelpers.getViewportCenter(editor)
    const spacing = 50

    images.forEach((imageData, index) => {
      const offset = (index - (images.length - 1) / 2) * (512 + spacing)
      canvasHelpers.addImageToCanvas(
        editor,
        imageData,
        { x: centerPos.x + offset, y: centerPos.y },
        { prompt: 'Uploaded image' }
      )
    })
  }

  const handleHistoryImagesSelected = (images: string[]) => {
    if (!editor || !helpersLoaded) return

    // Add history images to canvas at viewport center
    const centerPos = canvasHelpers.getViewportCenter(editor)
    canvasHelpers.addImagesToCanvas(editor, images, centerPos, {
      prompt: 'From history',
    })
  }

  // Debug logging
  console.log('PlaygroundPage render:', {
    editorLoaded: !!editor,
    helpersLoaded,
    selectedImagesCount: selectedImages.length,
  })

  return (
    <>
      {/* Main Canvas */}
      <TldrawCanvas
        onSelectionChange={(images) => {
          console.log('Parent received selection change:', images.length)
          setSelectedImages(images)
        }}
        onReady={(editorInstance) => {
          console.log('Editor ready')
          setEditor(editorInstance)
        }}
      />

      {/* Floating Toolbar */}
      <FloatingToolbar
        prompt={prompt}
        onPromptChange={setPrompt}
        model={model}
        onModelChange={setModel}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        imageSize={imageSize}
        onImageSizeChange={setImageSize}
        numImages={numImages}
        onNumImagesChange={setNumImages}
        isLoading={isLoading}
        onGenerate={handleGenerate}
        onOpenHistory={() => setShowHistory(true)}
        onOpenUpload={() => setShowUpload(true)}
        onOpenSettings={() => setShowSettings(true)}
        selectedImagesCount={selectedImages.length}
      />

      {/* Error notification */}
      {error && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div className="rounded-lg bg-destructive/90 backdrop-blur-sm border border-destructive p-4 shadow-2xl">
            <p className="text-sm text-white font-medium">Error</p>
            <p className="text-sm text-white/90 mt-1">{error}</p>
            {(error.includes('credentials') ||
              error.includes('Settings') ||
              error.includes('API key')) && (
              <button
                onClick={() => setShowSettings(true)}
                className="mt-2 text-sm text-white hover:text-white/80 underline"
              >
                Open Settings
              </button>
            )}
            <button
              onClick={() => setError(null)}
              className="absolute top-2 right-2 text-white/70 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ImageUploadZone
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onImagesUploaded={handleImagesUploaded}
      />

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectImages={handleHistoryImagesSelected}
      />

      <ApiSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
}
