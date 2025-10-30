import { Editor, createShapeId } from '@tldraw/tldraw'
import { GeneratedImageShape } from './ImageShape'

/**
 * Get dimensions from aspect ratio
 */
function getDimensionsFromAspectRatio(
  aspectRatio: string,
  baseSize: number = 512
): { w: number; h: number } {
  const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number)
  const ratio = widthRatio / heightRatio

  if (ratio >= 1) {
    // Landscape or square
    return { w: baseSize, h: baseSize / ratio }
  } else {
    // Portrait
    return { w: baseSize * ratio, h: baseSize }
  }
}

/**
 * Get the center point of the viewport
 */
export function getViewportCenter(editor: Editor): { x: number; y: number } {
  const viewport = editor.getViewportPageBounds()
  return {
    x: viewport.center.x,
    y: viewport.center.y,
  }
}

/**
 * Get the center point of selected images
 */
export function getSelectionCenter(
  editor: Editor,
  selectedShapes: GeneratedImageShape[]
): { x: number; y: number } {
  if (selectedShapes.length === 0) {
    return getViewportCenter(editor)
  }

  let totalX = 0
  let totalY = 0

  selectedShapes.forEach((shape) => {
    totalX += shape.x + shape.props.w / 2
    totalY += shape.y + shape.props.h / 2
  })

  return {
    x: totalX / selectedShapes.length,
    y: totalY / selectedShapes.length,
  }
}

/**
 * Add an image to the canvas
 */
export function addImageToCanvas(
  editor: Editor,
  imageData: string,
  position: { x: number; y: number },
  metadata?: {
    prompt?: string
    model?: string
    aspectRatio?: string
    resolution?: string
  }
) {
  // Get dimensions based on aspect ratio or use defaults
  const dimensions = metadata?.aspectRatio
    ? getDimensionsFromAspectRatio(metadata.aspectRatio)
    : { w: 512, h: 512 }

  const shapeId = createShapeId()

  editor.createShape<GeneratedImageShape>({
    id: shapeId,
    type: 'generated-image',
    x: position.x - dimensions.w / 2,
    y: position.y - dimensions.h / 2,
    props: {
      w: dimensions.w,
      h: dimensions.h,
      imageData,
      prompt: metadata?.prompt || '',
      model: metadata?.model || '',
      timestamp: Date.now(),
      aspectRatio: metadata?.aspectRatio || '1:1',
      resolution: metadata?.resolution || '1K',
    },
  })

  return shapeId
}

/**
 * Add multiple images to canvas in a grid layout
 */
export function addImagesToCanvas(
  editor: Editor,
  images: string[],
  centerPosition: { x: number; y: number },
  metadata?: {
    prompt?: string
    model?: string
    aspectRatio?: string
    resolution?: string
  }
) {
  const dimensions = metadata?.aspectRatio
    ? getDimensionsFromAspectRatio(metadata.aspectRatio)
    : { w: 512, h: 512 }

  const spacing = 50 // Space between images

  if (images.length === 1) {
    // Single image - place at center
    return [addImageToCanvas(editor, images[0], centerPosition, metadata)]
  } else if (images.length === 2) {
    // Two images - place side by side
    const offset = (dimensions.w + spacing) / 2
    return [
      addImageToCanvas(
        editor,
        images[0],
        { x: centerPosition.x - offset, y: centerPosition.y },
        metadata
      ),
      addImageToCanvas(
        editor,
        images[1],
        { x: centerPosition.x + offset, y: centerPosition.y },
        metadata
      ),
    ]
  } else if (images.length <= 4) {
    // 3-4 images - place in 2x2 grid
    const offsetX = (dimensions.w + spacing) / 2
    const offsetY = (dimensions.h + spacing) / 2
    const positions = [
      { x: centerPosition.x - offsetX, y: centerPosition.y - offsetY },
      { x: centerPosition.x + offsetX, y: centerPosition.y - offsetY },
      { x: centerPosition.x - offsetX, y: centerPosition.y + offsetY },
      { x: centerPosition.x + offsetX, y: centerPosition.y + offsetY },
    ]

    return images.map((imageData, index) =>
      addImageToCanvas(editor, imageData, positions[index], metadata)
    )
  } else {
    // More than 4 - place in rows
    const cols = Math.ceil(Math.sqrt(images.length))
    const rows = Math.ceil(images.length / cols)

    const totalWidth = cols * dimensions.w + (cols - 1) * spacing
    const totalHeight = rows * dimensions.h + (rows - 1) * spacing

    const startX = centerPosition.x - totalWidth / 2 + dimensions.w / 2
    const startY = centerPosition.y - totalHeight / 2 + dimensions.h / 2

    return images.map((imageData, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      const position = {
        x: startX + col * (dimensions.w + spacing),
        y: startY + row * (dimensions.h + spacing),
      }
      return addImageToCanvas(editor, imageData, position, metadata)
    })
  }
}

/**
 * Extract image data URLs from selected shapes
 */
export function extractImageDataFromShapes(shapes: GeneratedImageShape[]): string[] {
  return shapes.map((shape) => shape.props.imageData)
}
