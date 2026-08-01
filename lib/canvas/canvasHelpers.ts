import { type Editor, type TLShapeId, createShapeId } from '@tldraw/tldraw'
import { type CanvasImageShape, type GeneratedImageShape } from './ImageShape'
import { getDimensionsFromAspectRatio } from './canvasPositioning'

export {
  findEmptySpace,
  focusAndCenterShapes,
  getDimensionsFromAspectRatio,
  getPositionNearSelection,
  getViewportCenter,
} from './canvasPositioning'

type Point = { x: number; y: number }
type Dimensions = { w: number; h: number }

interface ImageMetadata {
  prompt?: string
  model?: string
  aspectRatio?: string
  resolution?: string
}

interface PlaceholderMetadata extends Required<ImageMetadata> {
  promptHistory?: string[]
  sourceImageData?: string
}

async function getImageDimensions(imageData: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = reject
    image.src = imageData
  })
}

function calculateDisplayDimensions(width: number, height: number, maxSize = 512): Dimensions {
  const scale = Math.min(1, maxSize / Math.max(width, height))
  return { w: width * scale, h: height * scale }
}

function getGridPositions(count: number, center: Point, dimensions: Dimensions, spacing = 50): Point[] {
  if (count === 1) return [center]

  if (count === 2) {
    const offset = (dimensions.w + spacing) / 2
    return [
      { x: center.x - offset, y: center.y },
      { x: center.x + offset, y: center.y },
    ]
  }

  const columns = count <= 4 ? 2 : Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / columns)
  const totalWidth = columns * dimensions.w + (columns - 1) * spacing
  const totalHeight = rows * dimensions.h + (rows - 1) * spacing
  const startX = center.x - totalWidth / 2 + dimensions.w / 2
  const startY = center.y - totalHeight / 2 + dimensions.h / 2

  return Array.from({ length: count }, (_, index) => ({
    x: startX + (index % columns) * (dimensions.w + spacing),
    y: startY + Math.floor(index / columns) * (dimensions.h + spacing),
  }))
}

function createGeneratedImageShape(
  editor: Editor,
  position: Point,
  dimensions: Dimensions,
  props: GeneratedImageShape['props']
): TLShapeId {
  const id = createShapeId()
  editor.createShape<GeneratedImageShape>({
    id,
    type: 'generated-image',
    x: position.x - dimensions.w / 2,
    y: position.y - dimensions.h / 2,
    props,
  })
  return id
}

export async function addImageToCanvas(
  editor: Editor,
  imageData: string,
  position: Point,
  metadata: ImageMetadata = {}
): Promise<TLShapeId> {
  let dimensions: Dimensions
  if (metadata.aspectRatio) {
    dimensions = getDimensionsFromAspectRatio(metadata.aspectRatio, metadata.resolution)
  } else {
    try {
      const natural = await getImageDimensions(imageData)
      dimensions = calculateDisplayDimensions(natural.width, natural.height)
    } catch (error) {
      console.error('Failed to get image dimensions:', error)
      dimensions = { w: 512, h: 512 }
    }
  }

  return createGeneratedImageShape(editor, position, dimensions, {
    w: dimensions.w,
    h: dimensions.h,
    imageData,
    sourceImageData: '',
    prompt: metadata.prompt ?? '',
    model: metadata.model ?? '',
    timestamp: Date.now(),
    aspectRatio: metadata.aspectRatio ?? '1:1',
    resolution: metadata.resolution ?? '1K',
    isLoading: false,
    hasAnimated: false,
    promptHistory: [],
  })
}

export function createLoadingPlaceholders(
  editor: Editor,
  count: number,
  center: Point,
  metadata: PlaceholderMetadata
): TLShapeId[] {
  const dimensions = getDimensionsFromAspectRatio(metadata.aspectRatio, metadata.resolution)
  const promptHistory = [...(metadata.promptHistory ?? []), metadata.prompt]

  return getGridPositions(count, center, dimensions).map((position) =>
    createGeneratedImageShape(editor, position, dimensions, {
      w: dimensions.w,
      h: dimensions.h,
      imageData: '',
      sourceImageData: metadata.sourceImageData ?? '',
      prompt: metadata.prompt,
      model: metadata.model,
      timestamp: Date.now(),
      aspectRatio: metadata.aspectRatio,
      resolution: metadata.resolution,
      isLoading: true,
      hasAnimated: false,
      promptHistory,
    })
  )
}

export async function addImagesToCanvas(
  editor: Editor,
  images: string[],
  center: Point,
  metadata: ImageMetadata = {}
): Promise<TLShapeId[]> {
  const dimensions = metadata.aspectRatio
    ? getDimensionsFromAspectRatio(metadata.aspectRatio, metadata.resolution)
    : { w: 1024, h: 1024 }
  const positions = getGridPositions(images.length, center, dimensions)

  return Promise.all(
    images.map((imageData, index) => addImageToCanvas(editor, imageData, positions[index], metadata))
  )
}

async function exportNativeImageShape(editor: Editor, shape: CanvasImageShape): Promise<string | null> {
  if (shape.type !== 'image') return null

  try {
    const svg = await editor.getSvgString([shape.id], { background: false })
    if (!svg) return null

    const blob = await new Promise<Blob | null>((resolve) => {
      const image = new Image()
      const svgBlob = new Blob([svg.svg], { type: 'image/svg+xml' })
      const objectUrl = URL.createObjectURL(svgBlob)

      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = svg.width
        canvas.height = svg.height
        const context = canvas.getContext('2d')
        if (!context) {
          URL.revokeObjectURL(objectUrl)
          resolve(null)
          return
        }

        context.drawImage(image, 0, 0)
        canvas.toBlob((result) => {
          URL.revokeObjectURL(objectUrl)
          resolve(result)
        }, 'image/png')
      }
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(null)
      }
      image.src = objectUrl
    })

    if (!blob) return null
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error(`Shape ${shape.id}: Failed to export dropped image:`, error)
    return null
  }
}

export async function extractImageDataFromShapes(
  shapes: CanvasImageShape[],
  editor?: Editor
): Promise<string[]> {
  const results = await Promise.all(
    shapes.map((shape) => {
      if (shape.type === 'generated-image') return Promise.resolve(shape.props.imageData)
      return editor ? exportNativeImageShape(editor, shape) : Promise.resolve(null)
    })
  )

  return results.filter((imageData): imageData is string => Boolean(imageData))
}
