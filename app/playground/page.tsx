'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { FloatingToolbar } from '@/components/canvas/FloatingToolbar'
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
  createLoadingPlaceholders: null as any,
  getPositionNearSelection: null as any,
  getDimensionsFromAspectRatio: null as any,
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
  const [activeGenerationsCount, setActiveGenerationsCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [helpersLoaded, setHelpersLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load canvas helpers dynamically on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/canvas/canvasHelpers').then((mod) => {
        canvasHelpers.addImagesToCanvas = mod.addImagesToCanvas
        canvasHelpers.extractImageDataFromShapes = mod.extractImageDataFromShapes
        canvasHelpers.getSelectionCenter = mod.getSelectionCenter
        canvasHelpers.getViewportCenter = mod.getViewportCenter
        canvasHelpers.addImageToCanvas = mod.addImageToCanvas
        canvasHelpers.createLoadingPlaceholders = mod.createLoadingPlaceholders
        canvasHelpers.getPositionNearSelection = mod.getPositionNearSelection
        canvasHelpers.getDimensionsFromAspectRatio = mod.getDimensionsFromAspectRatio
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

    // Increment active generation counter
    setActiveGenerationsCount(prev => prev + 1)
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

        // Step 1: Create loading placeholders immediately near selection
        const dimensions = canvasHelpers.getDimensionsFromAspectRatio(aspectRatio, imageSize)
        const nearbyPos = canvasHelpers.getPositionNearSelection(editor, selectedImages, dimensions)
        const placeholderIds = canvasHelpers.createLoadingPlaceholders(
          editor,
          numImages,
          nearbyPos,
          {
            prompt,
            model,
            aspectRatio,
            resolution: imageSize,
          }
        )

        console.log('Created', placeholderIds.length, 'loading placeholders for edit mode')

        // Step 2: Make multiple parallel API calls (one per image)
        const { editGeminiImage } = await import('@/lib/litellm-client')

        const requests = Array.from({ length: numImages }, (_, index) =>
          editGeminiImage({
            model,
            prompt,
            images: inputImages,
            aspectRatio,
            imageSize,
            numImages: 1, // Each request generates only 1 image
            apiKey: credentials.apiKey,
            baseURL: credentials.proxyUrl,
          })
            .then((response) => {
              const imageUrls = extractImagesFromResponse(response)
              if (imageUrls.length > 0 && index < placeholderIds.length) {
                // Update the corresponding placeholder
                editor.updateShape<GeneratedImageShape>({
                  id: placeholderIds[index],
                  type: 'generated-image',
                  props: {
                    imageData: imageUrls[0],
                    isLoading: false,
                  },
                })
                console.log(`Updated placeholder ${index + 1}/${numImages}`)
                return imageUrls[0]
              }
              throw new Error('No image in response')
            })
            .catch((error) => {
              console.error(`Request ${index + 1}/${numImages} failed:`, error)
              // Remove failed placeholder
              if (index < placeholderIds.length) {
                editor.deleteShape(placeholderIds[index] as any)
              }
              return null
            })
        )

        // Wait for all requests to complete
        const results = await Promise.allSettled(requests)
        const successfulImages = results
          .map((r) => (r.status === 'fulfilled' ? r.value : null))
          .filter((url): url is string => url !== null)

        if (successfulImages.length === 0) {
          throw new Error('All image generation requests failed')
        }

        console.log(`Successfully generated ${successfulImages.length}/${numImages} images`)

        // Save to history
        await addToHistory({
          mode: 'edit',
          model,
          prompt,
          images: successfulImages.map((url) => ({ url })),
        })
      } else {
        // Generate mode - no selection

        // Step 1: Create loading placeholders immediately
        const centerPos = canvasHelpers.getViewportCenter(editor)
        const placeholderIds = canvasHelpers.createLoadingPlaceholders(
          editor,
          numImages,
          centerPos,
          {
            prompt,
            model,
            aspectRatio,
            resolution: imageSize,
          }
        )

        console.log('Created', placeholderIds.length, 'loading placeholders')

        // Step 2: Make multiple parallel API calls (one per image)
        const { generateGeminiImage } = await import('@/lib/litellm-client')

        const requests = Array.from({ length: numImages }, (_, index) =>
          generateGeminiImage({
            model,
            prompt,
            aspectRatio,
            imageSize,
            numImages: 1, // Each request generates only 1 image
            apiKey: credentials.apiKey,
            baseURL: credentials.proxyUrl,
          })
            .then((response) => {
              const imageUrls = extractImagesFromResponse(response)
              if (imageUrls.length > 0 && index < placeholderIds.length) {
                // Update the corresponding placeholder
                editor.updateShape<GeneratedImageShape>({
                  id: placeholderIds[index],
                  type: 'generated-image',
                  props: {
                    imageData: imageUrls[0],
                    isLoading: false,
                  },
                })
                console.log(`Updated placeholder ${index + 1}/${numImages}`)
                return imageUrls[0]
              }
              throw new Error('No image in response')
            })
            .catch((error) => {
              console.error(`Request ${index + 1}/${numImages} failed:`, error)
              // Remove failed placeholder
              if (index < placeholderIds.length) {
                editor.deleteShape(placeholderIds[index] as any)
              }
              return null
            })
        )

        // Wait for all requests to complete
        const results = await Promise.allSettled(requests)
        const successfulImages = results
          .map((r) => (r.status === 'fulfilled' ? r.value : null))
          .filter((url): url is string => url !== null)

        if (successfulImages.length === 0) {
          throw new Error('All image generation requests failed')
        }

        console.log(`Successfully generated ${successfulImages.length}/${numImages} images`)

        // Save to history
        await addToHistory({
          mode: 'generate',
          model,
          prompt,
          images: successfulImages.map((url) => ({ url })),
        })
      }

      // Clear prompt after successful generation
      setPrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
      // Decrement active generation counter
      setActiveGenerationsCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleImagesUploaded = async (images: string[]) => {
    if (!editor || !helpersLoaded) return

    // Add uploaded images to canvas at viewport center
    const centerPos = canvasHelpers.getViewportCenter(editor)
    const spacing = 50

    await Promise.all(
      images.map((imageData, index) => {
        const offset = (index - (images.length - 1) / 2) * (512 + spacing)
        return canvasHelpers.addImageToCanvas(
          editor,
          imageData,
          { x: centerPos.x + offset, y: centerPos.y },
          { prompt: 'Uploaded image' }
        )
      })
    )
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !editor || !helpersLoaded) return

    const files = Array.from(e.target.files).filter((file) =>
      file.type.startsWith('image/')
    )

    const base64Images = await Promise.all(
      files.map((file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      })
    )

    await handleImagesUploaded(base64Images)

    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleHistoryImagesSelected = async (images: string[]) => {
    if (!editor || !helpersLoaded) return

    // Add history images to canvas at viewport center
    const centerPos = canvasHelpers.getViewportCenter(editor)
    await canvasHelpers.addImagesToCanvas(editor, images, centerPos, {
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
        activeGenerationsCount={activeGenerationsCount}
        onGenerate={handleGenerate}
        onOpenHistory={() => setShowHistory(true)}
        onOpenUpload={() => fileInputRef.current?.click()}
        onOpenSettings={() => setShowSettings(true)}
        selectedImagesCount={selectedImages.length}
      />

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
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
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectImages={handleHistoryImagesSelected}
      />

      <ApiSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
}
