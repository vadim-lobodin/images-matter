'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { FloatingToolbar } from '@/components/canvas/FloatingToolbar'
import { HistoryModal, addToHistory, clearAllHistory } from '@/components/canvas/HistoryModal'
import { ApiSettings } from '@/components/playground/ApiSettings'
import { SelectionBadges } from '@/components/canvas/SelectionBadges'
import { Row, CloseLarge } from '@carbon/icons-react'
import * as motion from 'motion/react-client'
import { type ModelKey } from '@/lib/models'
import type { GeneratedImageShape } from '@/lib/canvas/ImageShape'
import type { Editor, TLShapeId } from '@tldraw/tldraw'

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
  findEmptySpace: null as any,
}

// Helper to get API credentials from localStorage
function getApiCredentials() {
  if (typeof window === 'undefined') return null

  const apiMode = (localStorage.getItem('api_mode') || 'litellm') as 'litellm' | 'gemini'

  if (apiMode === 'gemini') {
    const apiKey = localStorage.getItem('gemini_api_key')
    return apiKey ? { mode: 'gemini' as const, apiKey } : null
  } else {
    const apiKey = localStorage.getItem('litellm_api_key')
    const proxyUrl = localStorage.getItem('litellm_proxy_url')
    return apiKey && proxyUrl ? { mode: 'litellm' as const, apiKey, proxyUrl } : null
  }
}

// Reusable empty map to avoid creating new instances
const EMPTY_MAP = new Map<TLShapeId, number>()

export default function PlaygroundPage() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const [selectionIdMap, setSelectionIdMap] = useState<Map<TLShapeId, number>>(EMPTY_MAP)
  const [model, setModel] = useState<ModelKey>('vertex_ai/gemini-2.5-flash-image')
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [imageSize, setImageSize] = useState('1K')
  const [numImages, setNumImages] = useState(1)
  const [selectedImages, setSelectedImages] = useState<GeneratedImageShape[]>([])
  const [activeGenerationsCount, setActiveGenerationsCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyCount, setHistoryCount] = useState(0)
  const [historyReloadTrigger, setHistoryReloadTrigger] = useState(0)
  const [helpersLoaded, setHelpersLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previousAspectRatioRef = useRef<string | null>(null)

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem('playground_model')
      if (savedModel) setModel(savedModel as ModelKey)

      const savedAspectRatio = localStorage.getItem('playground_aspectRatio')
      if (savedAspectRatio) setAspectRatio(savedAspectRatio)

      const savedImageSize = localStorage.getItem('playground_imageSize')
      if (savedImageSize) setImageSize(savedImageSize)

      const savedNumImages = localStorage.getItem('playground_numImages')
      if (savedNumImages) setNumImages(parseInt(savedNumImages))
    }
  }, [])

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('playground_model', model)
  }, [model])

  useEffect(() => {
    localStorage.setItem('playground_aspectRatio', aspectRatio)
  }, [aspectRatio])

  useEffect(() => {
    localStorage.setItem('playground_imageSize', imageSize)
  }, [imageSize])

  useEffect(() => {
    localStorage.setItem('playground_numImages', numImages.toString())
  }, [numImages])

  // Auto-set aspect ratio to 1:1 in edit mode
  useEffect(() => {
    if (selectedImages.length > 0) {
      // Entering edit mode - save current aspect ratio and set to 1:1
      if (aspectRatio !== '1:1') {
        previousAspectRatioRef.current = aspectRatio
        setAspectRatio('1:1')
      }
    } else {
      // Exiting edit mode - restore previous aspect ratio
      if (previousAspectRatioRef.current) {
        setAspectRatio(previousAspectRatioRef.current)
        previousAspectRatioRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImages.length])

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
        canvasHelpers.findEmptySpace = mod.findEmptySpace
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

    setActiveGenerationsCount(prev => prev + 1)
    setError(null)

    try {
      const credentials = getApiCredentials()

      if (!credentials) {
        throw new Error('Please configure your API credentials in Settings')
      }

      // Determine mode and prepare parameters
      const isEdit = selectedImages.length > 0
      let inputImages: string[] | undefined
      let imageIds: number[] | undefined
      let combinedPromptHistory: string[] = []

      if (isEdit) {
        inputImages = await canvasHelpers.extractImageDataFromShapes(selectedImages, editor)
        if (!inputImages || inputImages.length === 0) {
          throw new Error('Failed to extract image data from selected images. Please try again or use the Upload button.')
        }
        imageIds = selectedImages.map((_, index) => index + 1)

        // Extract and combine prompt histories from selected images
        const histories = selectedImages
          .map((img) => img.props.promptHistory)
          .filter((history): history is string[] => Array.isArray(history) && history.length > 0)

        // Use the longest history as it should be most complete
        combinedPromptHistory = histories.length > 0
          ? histories.reduce((longest, current) =>
              current.length > longest.length ? current : longest
            )
          : []
      }

      // Calculate placeholder position based on mode
      const dimensions = canvasHelpers.getDimensionsFromAspectRatio(aspectRatio, imageSize)
      const position = isEdit
        ? canvasHelpers.getPositionNearSelection(editor, selectedImages, dimensions)
        : canvasHelpers.findEmptySpace(editor, dimensions)

      // Create loading placeholders
      const placeholderIds = canvasHelpers.createLoadingPlaceholders(
        editor,
        numImages,
        position,
        {
          prompt,
          model,
          aspectRatio,
          resolution: imageSize,
          promptHistory: combinedPromptHistory,
          sourceImageData: isEdit && selectedImages.length > 0 ? selectedImages[0].props.imageData : undefined,
        }
      )

      // Branch based on API mode
      let requests

      if (credentials.mode === 'gemini') {
        // Use direct Gemini API
        const { generateGeminiImage, editGeminiImage } = await import('@/lib/gemini-direct-client')

        const baseParams = {
          model,
          prompt,
          aspectRatio,
          imageSize,
          numImages,
          apiKey: credentials.apiKey,
        }

        const params = isEdit
          ? { ...baseParams, images: inputImages as string[], imageIds, promptHistory: combinedPromptHistory }
          : baseParams

        // Gemini client handles parallel requests internally
        requests = [isEdit ? editGeminiImage(params as any) : generateGeminiImage(params as any)]
      } else {
        // Use LiteLLM proxy
        const { generateGeminiImage, editGeminiImage } = await import('@/lib/litellm-client')
        const apiFunction = isEdit ? editGeminiImage : generateGeminiImage

        // Create parallel API requests
        requests = Array.from({ length: numImages }, (_, index) => {
          const baseParams = {
            model,
            prompt,
            aspectRatio,
            imageSize,
            numImages: 1,
            apiKey: credentials.apiKey,
            baseURL: credentials.proxyUrl,
          }

          const params = isEdit
            ? { ...baseParams, images: inputImages as string[], imageIds, promptHistory: combinedPromptHistory }
            : baseParams

          return apiFunction(params as any)
            .then(async (response) => {
              const imageUrls = extractImagesFromResponse(response)
              if (imageUrls.length > 0 && index < placeholderIds.length) {
                // Load the image to get its actual dimensions
                const img = new Image()
                await new Promise<void>((resolve, reject) => {
                  img.onload = () => resolve()
                  img.onerror = () => reject(new Error('Failed to load image'))
                  img.src = imageUrls[0]
                })

                // Update shape with image data and correct dimensions
                editor.updateShape<GeneratedImageShape>({
                  id: placeholderIds[index],
                  type: 'generated-image',
                  props: {
                    imageData: imageUrls[0],
                    isLoading: false,
                    w: img.naturalWidth,
                    h: img.naturalHeight,
                  },
                })
                return imageUrls[0]
              }
              throw new Error('No image in response')
            })
            .catch((error) => {
              console.error(`Request ${index + 1}/${numImages} failed:`, error)
              if (index < placeholderIds.length) {
                editor.deleteShape(placeholderIds[index] as any)
              }
              return null
            })
        })
      }

      // Wait for all requests and filter successful ones
      const results = await Promise.allSettled(requests)

      // Handle results differently based on API mode
      let successfulImages: string[]

      if (credentials.mode === 'gemini') {
        // Gemini mode returns a single response with multiple images
        if (results[0].status === 'fulfilled') {
          const response = results[0].value
          const imageUrls = extractImagesFromResponse(response)

          // Update all placeholders with the returned images
          for (let i = 0; i < imageUrls.length && i < placeholderIds.length; i++) {
            const imageUrl = imageUrls[i]
            try {
              // Load the image to get its actual dimensions
              const img = new Image()
              await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve()
                img.onerror = () => reject(new Error('Failed to load image'))
                img.src = imageUrl
              })

              // Update shape with image data and correct dimensions
              editor.updateShape<GeneratedImageShape>({
                id: placeholderIds[i],
                type: 'generated-image',
                props: {
                  imageData: imageUrl,
                  isLoading: false,
                  w: img.naturalWidth,
                  h: img.naturalHeight,
                },
              })
            } catch (error) {
              console.error(`Failed to process image ${i + 1}:`, error)
              editor.deleteShape(placeholderIds[i] as any)
            }
          }

          // Delete any remaining placeholders if we got fewer images than expected
          for (let i = imageUrls.length; i < placeholderIds.length; i++) {
            editor.deleteShape(placeholderIds[i] as any)
          }

          successfulImages = imageUrls
        } else {
          // All failed - log the error
          console.error('Gemini API request failed:', results[0].reason)
          // Delete all placeholders
          placeholderIds.forEach(id => editor.deleteShape(id as any))
          successfulImages = []
        }
      } else {
        // LiteLLM mode returns individual results for each request
        // Log any failures
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`LiteLLM request ${index + 1} failed:`, result.reason)
          }
        })

        successfulImages = results
          .map((r) => (r.status === 'fulfilled' ? r.value : null))
          .filter((url): url is string => url !== null)
      }

      if (successfulImages.length === 0) {
        throw new Error('All image generation requests failed')
      }

      // Show warning if some generations failed
      if (successfulImages.length < numImages) {
        setError(`Generated ${successfulImages.length}/${numImages} images. Some requests failed.`)
      }

      // Save to history
      await addToHistory({
        mode: isEdit ? 'edit' : 'generate',
        model,
        prompt,
        images: successfulImages.map((url) => ({ url })),
      })

      // Clear prompt on success
      setPrompt('')
    } catch (err) {
      console.error('Image generation error:', err)
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace')
      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
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

    // Filter for supported image formats (exclude SVG as API requires raster images)
    const files = Array.from(e.target.files).filter((file) =>
      file.type.startsWith('image/') && !file.type.includes('svg')
    )

    // Check if any SVGs were excluded
    const excludedSvgs = Array.from(e.target.files).filter((file) =>
      file.type.includes('svg')
    )
    if (excludedSvgs.length > 0) {
      setError(
        `SVG files are not supported. Please upload raster images (PNG, JPG, WebP, etc.).\n\n` +
        `Excluded ${excludedSvgs.length} SVG file${excludedSvgs.length > 1 ? 's' : ''}.`
      )
    }

    if (files.length === 0) return

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

  const handleCanvasDrop = async (imageUrl: string, position: { x: number; y: number }) => {
    if (!editor || !helpersLoaded) return

    try {
      await canvasHelpers.addImageToCanvas(
        editor,
        imageUrl,
        position,
        { prompt: 'From history' }
      )
    } catch (err) {
      setError('Failed to add image from history')
      console.error('Error adding dropped image:', err)
    }
  }

  // Memoized selection change handler to prevent infinite loops
  const handleSelectionChange = useCallback((images: GeneratedImageShape[]) => {
    if (!editorRef.current) return

    // Only show IDs when 2+ images (any type) are selected
    if (images.length < 2) {
      setSelectionIdMap(EMPTY_MAP)
      setSelectedImages(images)
      return
    }

    // Create new ID map for all selected image shapes
    const newIdMap = new Map<TLShapeId, number>()

    images.forEach((img, index) => {
      const selectionId = index + 1
      newIdMap.set(img.id, selectionId)
    })

    setSelectionIdMap(newIdMap)
    setSelectedImages(images)
  }, [])

  // Memoized editor ready handler
  const handleEditorReady = useCallback((editorInstance: Editor) => {
    editorRef.current = editorInstance
    setEditor(editorInstance)
  }, [])

  return (
    <>
      {/* Selection Badge Overlay */}
      <SelectionBadges editor={editor} selectionIdMap={selectionIdMap} />

      {/* Logo - top left corner */}
      <img
        src="/logo.svg"
        alt="Logo"
        className="fixed top-8 left-8 z-50 h-4 dark:invert-0 invert"
      />

      {/* Clear all history button - only visible when history is open and has items */}
      {showHistory && historyCount > 0 && (
        <button
          onClick={async () => {
            await clearAllHistory()
            setHistoryCount(0)
            setHistoryReloadTrigger(prev => prev + 1)
          }}
          className="fixed top-4 right-16 z-50 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm text-muted-foreground hover:text-foreground"
          title="Clear all history"
        >
          Clear all
        </button>
      )}

      {/* History toggle button - top right corner */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg hover:bg-accent transition-colors"
        title={showHistory ? 'Close history' : 'Open history'}
      >
        <div className="relative w-5 h-5">
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 1, rotate: 0, scale: 1 }}
            animate={{
              opacity: showHistory ? 0 : 1,
              rotate: showHistory ? 90 : 0,
              scale: showHistory ? 0.5 : 1
            }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <Row size={20} />
          </motion.div>
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{
              opacity: showHistory ? 1 : 0,
              rotate: showHistory ? 0 : -90,
              scale: showHistory ? 1 : 0.5
            }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <CloseLarge size={20} />
          </motion.div>
        </div>
      </button>

      {/* Main Canvas */}
      <TldrawCanvas
        onSelectionChange={handleSelectionChange}
        onReady={handleEditorReady}
        onDrop={handleCanvasDrop}
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
        onOpenUpload={() => fileInputRef.current?.click()}
        onOpenSettings={() => setShowSettings(true)}
        selectedImagesCount={selectedImages.length}
      />

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Error notification */}
      {error && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div className="rounded-lg bg-destructive/90 backdrop-blur-sm border border-destructive p-4 shadow-2xl">
            <p className="text-sm text-white font-semibold mb-2">Error</p>
            <p className="text-sm text-white/90 whitespace-pre-line">{error}</p>
            {(error.includes('credentials') ||
              error.includes('Settings') ||
              error.includes('API key') ||
              error.includes('VPN') ||
              error.includes('Network') ||
              error.includes('proxy')) && (
              <button
                onClick={() => {
                  setShowSettings(true)
                  setError(null)
                }}
                className="mt-3 px-3 py-1.5 text-sm text-white bg-white/20 hover:bg-white/30 rounded-md transition-colors"
              >
                Open Settings
              </button>
            )}
            <button
              onClick={() => setError(null)}
              className="absolute top-3 right-3 text-white/70 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <HistoryModal
        isOpen={showHistory}
        onSelectImages={handleHistoryImagesSelected}
        onHistoryCountChange={setHistoryCount}
        reloadTrigger={historyReloadTrigger}
      />

      <ApiSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
}
