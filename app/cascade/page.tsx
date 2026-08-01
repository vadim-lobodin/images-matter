'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import NextImage from 'next/image'
import { FloatingToolbar } from '@/components/canvas/FloatingToolbar'
import { HistoryModal } from '@/components/canvas/HistoryModal'
import { ApiSettings } from '@/components/cascade/ApiSettings'
import { SelectionBadges } from '@/components/canvas/SelectionBadges'
import { Row, CloseLarge } from '@carbon/icons-react'
import * as motion from 'motion/react-client'
import { toast } from 'sonner'
import { type ModelKey, getModelsForApiMode } from '@/lib/models'
import {
  type CanvasImageShape,
  type GeneratedImageShape,
  isGeneratedImageShape,
} from '@/lib/canvas/ImageShape'
import type { Editor, TLShapeId } from '@tldraw/tldraw'
import { addToHistory, clearAllHistory } from '@/lib/history-store'
import { extractImagesFromResponse, type ImageApiResponse } from '@/lib/image-api'
import { useHydrated } from '@/lib/use-hydrated'

// Dynamically import TldrawCanvas to avoid SSR issues
const TldrawCanvas = dynamic(
  () => import('@/components/canvas/TldrawCanvas').then((mod) => mod.TldrawCanvas),
  { ssr: false }
)

const loadCanvasHelpers = () => import('@/lib/canvas/canvasHelpers')

type ApiMode = 'litellm' | 'gemini'

interface PlaygroundSettings {
  apiMode: ApiMode
  model: ModelKey
  aspectRatio: string
  imageSize: string
  numImages: number
}

function readPlaygroundSettings(): PlaygroundSettings {
  const fallback: PlaygroundSettings = {
    apiMode: 'litellm',
    model: 'vertex_ai/gemini-2.5-flash-image',
    aspectRatio: '16:9',
    imageSize: '1K',
    numImages: 1,
  }

  if (typeof window === 'undefined') return fallback

  const apiMode = (localStorage.getItem('api_mode') || fallback.apiMode) as ApiMode
  const availableModels = getModelsForApiMode(apiMode)
  const savedModel = localStorage.getItem('playground_model')
  const model = savedModel && savedModel in availableModels
    ? savedModel as ModelKey
    : (Object.keys(availableModels)[0] as ModelKey | undefined) ?? fallback.model
  const modelConfig = availableModels[model]
  const savedCount = Number.parseInt(localStorage.getItem('playground_numImages') || '', 10)

  return {
    apiMode,
    model,
    aspectRatio: localStorage.getItem('playground_aspectRatio') || modelConfig?.aspectRatios[0] || fallback.aspectRatio,
    imageSize: localStorage.getItem('playground_imageSize') || modelConfig?.imageSizes[0] || fallback.imageSize,
    numImages: Number.isFinite(savedCount) && savedCount >= 1 && savedCount <= 4 ? savedCount : fallback.numImages,
  }
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

async function updateGeneratedImageShape(
  editor: Editor,
  shapeId: TLShapeId,
  imageUrl: string
): Promise<void> {
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Failed to load image'))
    image.src = imageUrl
  })

  editor.updateShape<GeneratedImageShape>({
    id: shapeId,
    type: 'generated-image',
    props: {
      imageData: imageUrl,
      isLoading: false,
      w: image.naturalWidth,
      h: image.naturalHeight,
    },
  })
}

export default function PlaygroundPage() {
  const isHydrated = useHydrated()
  const [initialSettings] = useState(readPlaygroundSettings)
  const [editor, setEditor] = useState<Editor | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const [selectionIdMap, setSelectionIdMap] = useState<Map<TLShapeId, number>>(EMPTY_MAP)
  const [apiMode] = useState<ApiMode>(initialSettings.apiMode)
  const [model, setModel] = useState<ModelKey>(initialSettings.model)
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState(initialSettings.aspectRatio)
  const [imageSize, setImageSize] = useState(initialSettings.imageSize)
  const [numImages, setNumImages] = useState(initialSettings.numImages)
  const [selectedImages, setSelectedImages] = useState<CanvasImageShape[]>([])
  const [activeGenerationsCount, setActiveGenerationsCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyCount, setHistoryCount] = useState(0)
  const [historyReloadTrigger, setHistoryReloadTrigger] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Show the confirmation after the settings dialog reloads the page.
  useEffect(() => {
    const justSaved = localStorage.getItem('settings_just_saved')
    if (justSaved === 'true') {
      localStorage.removeItem('settings_just_saved')
      toast.success('API credentials saved successfully')
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
  const handleGenerate = async () => {
    if (!editor) {
      toast.error('Canvas is still loading, please wait...')
      return
    }

    setActiveGenerationsCount(prev => prev + 1)

    try {
      const canvasHelpers = await loadCanvasHelpers()
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
          .filter(isGeneratedImageShape)
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
          sourceImageData: inputImages?.[0],
        }
      )

      // Smart focus: only pan if shapes are outside viewport
      canvasHelpers.focusAndCenterShapes(editor, placeholderIds)

      const errorMessages: string[] = []
      let successfulImages: string[] = []

      if (credentials.mode === 'gemini') {
        const { generateGeminiImage, editGeminiImage } = await import('@/lib/gemini-direct-client')
        const baseParams = {
          model,
          prompt,
          aspectRatio,
          imageSize,
          numImages,
          apiKey: credentials.apiKey,
        }

        let response: ImageApiResponse
        try {
          response = isEdit
            ? await editGeminiImage({
                ...baseParams,
                images: inputImages ?? [],
                imageIds,
                promptHistory: combinedPromptHistory,
              })
            : await generateGeminiImage(baseParams)
        } catch (error) {
          placeholderIds.forEach((id) => editor.deleteShape(id))
          throw error
        }

        const imageUrls = extractImagesFromResponse(response)
        if (imageUrls.length === 0) {
          placeholderIds.forEach((id) => editor.deleteShape(id))
          throw new Error(
            response.choices[0]?.message.content ||
            'API returned no images. The model may have refused to generate the requested content.'
          )
        }

        for (let index = 0; index < placeholderIds.length; index++) {
          const imageUrl = imageUrls[index]
          if (!imageUrl) {
            editor.deleteShape(placeholderIds[index])
            continue
          }

          try {
            await updateGeneratedImageShape(editor, placeholderIds[index], imageUrl)
            successfulImages.push(imageUrl)
          } catch (error) {
            console.error(`Failed to process image ${index + 1}:`, error)
            editor.deleteShape(placeholderIds[index])
          }
        }
      } else {
        const { generateGeminiImage, editGeminiImage } = await import('@/lib/litellm-client')
        const requests = Array.from({ length: numImages }, (_, index) => {
          const baseParams = {
            model,
            prompt,
            aspectRatio,
            imageSize,
            numImages: 1,
            apiKey: credentials.apiKey,
            baseURL: credentials.proxyUrl,
          }

          const request = isEdit
            ? editGeminiImage({
                ...baseParams,
                images: inputImages ?? [],
                imageIds,
                promptHistory: combinedPromptHistory,
              })
            : generateGeminiImage(baseParams)

          return request
            .then(async (response) => {
              const imageUrls = extractImagesFromResponse(response)
              if (imageUrls.length > 0 && index < placeholderIds.length) {
                await updateGeneratedImageShape(editor, placeholderIds[index], imageUrls[0])
                return imageUrls[0]
              }
              throw new Error('No image in response')
            })
            .catch((error) => {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error'
              console.error(`Request ${index + 1}/${numImages} failed:`, errorMsg)
              errorMessages.push(errorMsg)
              if (index < placeholderIds.length) {
                editor.deleteShape(placeholderIds[index])
              }
              return null
            })
        })
        successfulImages = (await Promise.all(requests)).filter((url): url is string => url !== null)
      }

      if (successfulImages.length === 0) {
        // Show the actual error message from the API
        const detailedError = errorMessages.length > 0 ? errorMessages[0] : 'All image generation requests failed'
        throw new Error(detailedError)
      }

      // Show warning with error details if some generations failed
      if (successfulImages.length < numImages) {
        const errorDetail = errorMessages.length > 0 ? `\nError: ${errorMessages[0]}` : ''
        toast.warning(`Generated ${successfulImages.length}/${numImages} images. Some requests failed.${errorDetail}`)
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate image'
      
      // Only log unexpected errors to console (not user-facing errors like missing credentials)
      const isUserFacingError = errorMessage.includes('credentials') || 
                                errorMessage.includes('Settings') || 
                                errorMessage.includes('API key') ||
                                errorMessage.includes('Canvas is still loading')
      
      if (!isUserFacingError) {
        console.error('Image generation error:', err)
        console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace')
      }
      
      // Show error with action button if it's a credentials/settings error
      if (errorMessage.includes('credentials') || 
          errorMessage.includes('Settings') || 
          errorMessage.includes('API key')) {
        toast.error(errorMessage, {
          action: {
            label: 'Open Settings',
            onClick: () => setShowSettings(true),
          },
        })
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setActiveGenerationsCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleImagesUploaded = async (images: string[]) => {
    if (!editor) return
    const canvasHelpers = await loadCanvasHelpers()

    // Add uploaded images to canvas at viewport center
    const centerPos = canvasHelpers.getViewportCenter(editor)
    const spacing = 50

    const shapeIds = await Promise.all(
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

    // Select the uploaded images (already at viewport center, no need to pan)
    editor.setSelectedShapes(shapeIds)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !editor) return

    // Filter for supported image formats (exclude SVG as API requires raster images)
    const files = Array.from(e.target.files).filter((file) =>
      file.type.startsWith('image/') && !file.type.includes('svg')
    )

    // Check if any SVGs were excluded
    const excludedSvgs = Array.from(e.target.files).filter((file) =>
      file.type.includes('svg')
    )
    if (excludedSvgs.length > 0) {
      toast.error(
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
    if (!editor) return
    const canvasHelpers = await loadCanvasHelpers()

    // Add history images to canvas at viewport center
    const centerPos = canvasHelpers.getViewportCenter(editor)
    const shapeIds = await canvasHelpers.addImagesToCanvas(editor, images, centerPos, {
      prompt: 'From history',
    })

    // Smart focus: only pan if shapes are outside viewport
    canvasHelpers.focusAndCenterShapes(editor, shapeIds)
  }

  const handleCanvasDrop = async (imageUrl: string, position: { x: number; y: number }) => {
    if (!editor) return

    try {
      const canvasHelpers = await loadCanvasHelpers()
      const shapeId = await canvasHelpers.addImageToCanvas(
        editor,
        imageUrl,
        position,
        { prompt: 'From history' }
      )

      // Select the dropped image but don't pan camera (user chose the position)
      editor.setSelectedShapes([shapeId])
    } catch (err) {
      toast.error('Failed to add image from history')
      console.error('Error adding dropped image:', err)
    }
  }

  // Memoized selection change handler to prevent infinite loops
  const handleSelectionChange = useCallback((images: CanvasImageShape[]) => {
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

  if (!isHydrated) {
    return <div className="fixed inset-0 bg-neutral-100 dark:bg-neutral-950" />
  }

  return (
    <>
      {/* Selection Badge Overlay */}
      <SelectionBadges editor={editor} selectionIdMap={selectionIdMap} />

      {/* Logo - top left corner */}
      <NextImage
        src="/logo.svg"
        alt="Logo"
        width={64}
        height={16}
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
        apiMode={apiMode}
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
