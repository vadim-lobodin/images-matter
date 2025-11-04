import { Editor, createShapeId, TLShapeId } from '@tldraw/tldraw'
import { GeneratedImageShape } from './ImageShape'

// Constants
const TOOLBAR_HEIGHT_PX = 220
const SHAPE_SPACING = 100
const SHAPE_PADDING = 50

/**
 * Get base size from resolution string
 */
function getBaseSizeFromResolution(resolution: string): number {
  switch (resolution) {
    case '2K':
      return 2048
    case '1K':
    default:
      return 1024
  }
}

/**
 * Get dimensions from aspect ratio and resolution
 */
export function getDimensionsFromAspectRatio(
  aspectRatio: string,
  resolution: string = '1K'
): { w: number; h: number } {
  const baseSize = getBaseSizeFromResolution(resolution)
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
 * Check if a position overlaps with any existing shapes
 */
function hasOverlap(
  x: number,
  y: number,
  width: number,
  height: number,
  shapes: any[]
): boolean {
  for (const shape of shapes) {
    // Skip shapes without valid dimensions
    if (!shape.props?.w || !shape.props?.h) continue

    const bounds = {
      minX: shape.x - SHAPE_PADDING,
      minY: shape.y - SHAPE_PADDING,
      maxX: shape.x + shape.props.w + SHAPE_PADDING,
      maxY: shape.y + shape.props.h + SHAPE_PADDING,
    }

    // Check if rectangles overlap
    const overlap = !(
      x + width < bounds.minX ||
      x > bounds.maxX ||
      y + height < bounds.minY ||
      y > bounds.maxY
    )

    if (overlap) return true
  }

  return false
}

/**
 * Find empty space in the viewport for new images
 * Prioritizes placing images to the right of existing content (Figma-style)
 */
export function findEmptySpace(
  editor: Editor,
  dimensions: { w: number; h: number }
): { x: number; y: number } {
  const viewport = editor.getViewportPageBounds()
  const zoom = editor.getZoomLevel()

  // Adjust viewport for toolbar
  const toolbarHeightPage = TOOLBAR_HEIGHT_PX / zoom
  const usableViewport = {
    minX: viewport.minX,
    minY: viewport.minY,
    maxX: viewport.maxX,
    maxY: viewport.maxY - toolbarHeightPage,
  }

  // Get all existing shapes
  const allShapes = editor.getCurrentPageShapes()

  // If no shapes exist, place in center
  if (allShapes.length === 0) {
    return {
      x: viewport.center.x,
      y: viewport.center.y - toolbarHeightPage / 2,
    }
  }

  // Find the rightmost edge and vertical center of all existing shapes
  let rightmost = -Infinity
  let totalY = 0
  let shapeCount = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allShapes.forEach((shape: any) => {
    if (shape.props?.w && shape.props?.h) {
      const rightEdge = shape.x + shape.props.w
      if (rightEdge > rightmost) {
        rightmost = rightEdge
      }
      totalY += shape.y + shape.props.h / 2
      shapeCount++
    }
  })

  const centerY = shapeCount > 0 ? totalY / shapeCount : viewport.center.y

  // Try positions to the right of existing content
  for (let i = 0; i < 10; i++) {
    const offsetX = SHAPE_SPACING + i * (dimensions.w + SHAPE_SPACING)
    const newX = rightmost + offsetX
    const testX = newX - dimensions.w / 2
    const testY = centerY - dimensions.h / 2

    if (!hasOverlap(testX, testY, dimensions.w, dimensions.h, allShapes)) {
      return { x: newX, y: centerY }
    }
  }

  // If right side is full, try a grid pattern in the viewport
  const gridSize = Math.max(dimensions.w, dimensions.h) + SHAPE_SPACING
  const cols = Math.ceil((usableViewport.maxX - usableViewport.minX) / gridSize)
  const rows = Math.ceil((usableViewport.maxY - usableViewport.minY) / gridSize)

  // Scan grid from top-left, row by row
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = usableViewport.minX + col * gridSize + gridSize / 2 - dimensions.w / 2
      const y = usableViewport.minY + row * gridSize + gridSize / 2 - dimensions.h / 2

      // Check if position is within viewport and doesn't overlap
      if (
        x >= usableViewport.minX &&
        x + dimensions.w <= usableViewport.maxX &&
        y >= usableViewport.minY &&
        y + dimensions.h <= usableViewport.maxY &&
        !hasOverlap(x, y, dimensions.w, dimensions.h, allShapes)
      ) {
        return { x: x + dimensions.w / 2, y: y + dimensions.h / 2 }
      }
    }
  }

  // Fallback to the right of rightmost shape (may overlap, but better than nothing)
  return {
    x: rightmost + SHAPE_SPACING + dimensions.w / 2,
    y: centerY,
  }
}

/**
 * Get the center point of the viewport, accounting for the floating toolbar at the bottom
 */
export function getViewportCenter(editor: Editor): { x: number; y: number } {
  const viewport = editor.getViewportPageBounds()
  const zoom = editor.getZoomLevel()

  // Convert toolbar height from screen pixels to page coordinates
  const toolbarHeightPage = TOOLBAR_HEIGHT_PX / zoom

  // Shift center upward by half the toolbar height to avoid overlap
  // This ensures new images appear in the visible area above the toolbar
  return {
    x: viewport.center.x,
    y: viewport.center.y - toolbarHeightPage / 2,
  }
}

/**
 * Focus on shapes and center them in the viewport
 * @param editor - tldraw editor instance
 * @param shapeIds - array of shape IDs to focus on
 * @param animate - whether to animate the transition (default: true)
 */
export function focusAndCenterShapes(
  editor: Editor,
  shapeIds: TLShapeId[],
  animate: boolean = true
): void {
  if (!shapeIds || shapeIds.length === 0) return

  // Select the shapes
  editor.setSelectedShapes(shapeIds as any)

  // Get the selection bounds
  const selectionBounds = editor.getSelectionPageBounds()
  if (!selectionBounds) return

  // Calculate the center point of the selection
  const centerX = selectionBounds.x + selectionBounds.width / 2
  const centerY = selectionBounds.y + selectionBounds.height / 2

  // Account for toolbar height by shifting center up
  const zoom = editor.getZoomLevel()
  const toolbarHeightPage = TOOLBAR_HEIGHT_PX / zoom
  const adjustedCenterY = centerY - toolbarHeightPage / 4

  // Pan to the center point WITHOUT changing zoom
  editor.centerOnPoint(centerX, adjustedCenterY, { animation: animate ? { duration: 300 } : undefined })
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
 * Get position near selected images for new generations
 * Places new images to the right of the selection with spacing
 * Checks for overlaps and finds alternative positions if needed
 */
export function getPositionNearSelection(
  editor: Editor,
  selectedShapes: GeneratedImageShape[],
  newImageDimensions: { w: number; h: number }
): { x: number; y: number } {
  if (selectedShapes.length === 0) {
    return getViewportCenter(editor)
  }

  // Find the bounds of selected shapes
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  selectedShapes.forEach((shape) => {
    const leftEdge = shape.x
    const rightEdge = shape.x + shape.props.w
    const topEdge = shape.y
    const bottomEdge = shape.y + shape.props.h

    if (leftEdge < minX) minX = leftEdge
    if (rightEdge > maxX) maxX = rightEdge
    if (topEdge < minY) minY = topEdge
    if (bottomEdge > maxY) maxY = bottomEdge
  })

  // Calculate centers
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  // Get all existing shapes to check for overlaps
  const allShapes = editor.getCurrentPageShapes()

  // Try positions to the right, progressively further out
  for (let i = 0; i < 5; i++) {
    const offsetX = SHAPE_SPACING + i * (newImageDimensions.w + SHAPE_SPACING)
    const newX = maxX + offsetX
    const testX = newX - newImageDimensions.w / 2
    const testY = centerY - newImageDimensions.h / 2

    if (!hasOverlap(testX, testY, newImageDimensions.w, newImageDimensions.h, allShapes)) {
      return { x: newX, y: centerY }
    }
  }

  // If all positions to the right are blocked, try below the selection
  for (let i = 0; i < 5; i++) {
    const offsetY = SHAPE_SPACING + i * (newImageDimensions.h + SHAPE_SPACING)
    const newY = maxY + offsetY
    const testX = centerX - newImageDimensions.w / 2
    const testY = newY - newImageDimensions.h / 2

    if (!hasOverlap(testX, testY, newImageDimensions.w, newImageDimensions.h, allShapes)) {
      return { x: centerX, y: newY }
    }
  }

  // Fallback: place to the right of selection (might overlap, but better than nothing)
  return {
    x: maxX + SHAPE_SPACING + newImageDimensions.w / 2,
    y: centerY,
  }
}

/**
 * Get natural dimensions from image data URL
 */
async function getImageDimensions(imageData: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = reject
    img.src = imageData
  })
}

/**
 * Calculate display dimensions while maintaining aspect ratio
 * Scales image to fit within maxSize
 */
function calculateDisplayDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxSize: number = 512
): { w: number; h: number } {
  const aspectRatio = naturalWidth / naturalHeight

  if (naturalWidth > naturalHeight) {
    // Landscape
    const w = Math.min(naturalWidth, maxSize)
    const h = w / aspectRatio
    return { w, h }
  } else {
    // Portrait or square
    const h = Math.min(naturalHeight, maxSize)
    const w = h * aspectRatio
    return { w, h }
  }
}

/**
 * Add an image to the canvas
 */
export async function addImageToCanvas(
  editor: Editor,
  imageData: string,
  position: { x: number; y: number },
  metadata?: {
    prompt?: string
    model?: string
    aspectRatio?: string
    resolution?: string
  }
): Promise<TLShapeId> {
  // Get dimensions based on aspect ratio and resolution or calculate from image
  let dimensions: { w: number; h: number }

  if (metadata?.aspectRatio) {
    dimensions = getDimensionsFromAspectRatio(metadata.aspectRatio, metadata.resolution || '1K')
  } else {
    // For uploaded images, get actual dimensions and scale proportionally
    try {
      const naturalDims = await getImageDimensions(imageData)
      dimensions = calculateDisplayDimensions(naturalDims.width, naturalDims.height)
    } catch (error) {
      console.error('Failed to get image dimensions:', error)
      dimensions = { w: 512, h: 512 }
    }
  }

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
      sourceImageData: '', // New images don't have a source
      prompt: metadata?.prompt || '',
      model: metadata?.model || '',
      timestamp: Date.now(),
      aspectRatio: metadata?.aspectRatio || '1:1',
      resolution: metadata?.resolution || '1K',
      isLoading: false,
      promptHistory: [], // New images start with empty history
    },
  })

  return shapeId
}

/**
 * Create loading placeholder shapes on canvas
 * Returns array of shape IDs that can be updated later
 */
export function createLoadingPlaceholders(
  editor: Editor,
  count: number,
  centerPosition: { x: number; y: number },
  metadata: {
    prompt: string
    model: string
    aspectRatio: string
    resolution: string
    promptHistory?: string[] // optional: history of prompts from source images
    sourceImageData?: string // optional: source image for blurred backdrop during regeneration
  }
): TLShapeId[] {
  const dimensions = getDimensionsFromAspectRatio(metadata.aspectRatio, metadata.resolution)
  const spacing = 50
  const shapeIds: TLShapeId[] = []

  // Build prompt history: previous history + current prompt
  const newPromptHistory = [...(metadata.promptHistory || []), metadata.prompt]

  if (count === 1) {
    // Single placeholder - place at center
    const shapeId = createShapeId()
    editor.createShape<GeneratedImageShape>({
      id: shapeId,
      type: 'generated-image',
      x: centerPosition.x - dimensions.w / 2,
      y: centerPosition.y - dimensions.h / 2,
      props: {
        w: dimensions.w,
        h: dimensions.h,
        imageData: '',
        sourceImageData: metadata.sourceImageData || '',
        prompt: metadata.prompt,
        model: metadata.model,
        timestamp: Date.now(),
        aspectRatio: metadata.aspectRatio,
        resolution: metadata.resolution,
        isLoading: true,
        promptHistory: newPromptHistory,
      },
    })
    shapeIds.push(shapeId)
  } else if (count === 2) {
    // Two placeholders - place side by side
    const offset = (dimensions.w + spacing) / 2
    for (let i = 0; i < count; i++) {
      const shapeId = createShapeId()
      const xPos = i === 0 ? centerPosition.x - offset : centerPosition.x + offset
      editor.createShape<GeneratedImageShape>({
        id: shapeId,
        type: 'generated-image',
        x: xPos - dimensions.w / 2,
        y: centerPosition.y - dimensions.h / 2,
        props: {
          w: dimensions.w,
          h: dimensions.h,
          imageData: '',
          sourceImageData: metadata.sourceImageData || '',
          prompt: metadata.prompt,
          model: metadata.model,
          timestamp: Date.now(),
          aspectRatio: metadata.aspectRatio,
          resolution: metadata.resolution,
          isLoading: true,
          promptHistory: newPromptHistory,
        },
      })
      shapeIds.push(shapeId)
    }
  } else if (count <= 4) {
    // 3-4 placeholders - place in 2x2 grid
    const offsetX = (dimensions.w + spacing) / 2
    const offsetY = (dimensions.h + spacing) / 2
    const positions = [
      { x: centerPosition.x - offsetX, y: centerPosition.y - offsetY },
      { x: centerPosition.x + offsetX, y: centerPosition.y - offsetY },
      { x: centerPosition.x - offsetX, y: centerPosition.y + offsetY },
      { x: centerPosition.x + offsetX, y: centerPosition.y + offsetY },
    ]

    for (let i = 0; i < count; i++) {
      const shapeId = createShapeId()
      editor.createShape<GeneratedImageShape>({
        id: shapeId,
        type: 'generated-image',
        x: positions[i].x - dimensions.w / 2,
        y: positions[i].y - dimensions.h / 2,
        props: {
          w: dimensions.w,
          h: dimensions.h,
          imageData: '',
          sourceImageData: metadata.sourceImageData || '',
          prompt: metadata.prompt,
          model: metadata.model,
          timestamp: Date.now(),
          aspectRatio: metadata.aspectRatio,
          resolution: metadata.resolution,
          isLoading: true,
          promptHistory: newPromptHistory,
        },
      })
      shapeIds.push(shapeId)
    }
  } else {
    // More than 4 - place in rows
    const cols = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / cols)

    const totalWidth = cols * dimensions.w + (cols - 1) * spacing
    const totalHeight = rows * dimensions.h + (rows - 1) * spacing

    const startX = centerPosition.x - totalWidth / 2 + dimensions.w / 2
    const startY = centerPosition.y - totalHeight / 2 + dimensions.h / 2

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols)
      const col = i % cols
      const shapeId = createShapeId()

      editor.createShape<GeneratedImageShape>({
        id: shapeId,
        type: 'generated-image',
        x: startX + col * (dimensions.w + spacing) - dimensions.w / 2,
        y: startY + row * (dimensions.h + spacing) - dimensions.h / 2,
        props: {
          w: dimensions.w,
          h: dimensions.h,
          imageData: '',
          sourceImageData: metadata.sourceImageData || '',
          prompt: metadata.prompt,
          model: metadata.model,
          timestamp: Date.now(),
          aspectRatio: metadata.aspectRatio,
          resolution: metadata.resolution,
          isLoading: true,
          promptHistory: newPromptHistory,
        },
      })
      shapeIds.push(shapeId)
    }
  }

  return shapeIds
}

/**
 * Add multiple images to canvas in a grid layout
 */
export async function addImagesToCanvas(
  editor: Editor,
  images: string[],
  centerPosition: { x: number; y: number },
  metadata?: {
    prompt?: string
    model?: string
    aspectRatio?: string
    resolution?: string
  }
): Promise<TLShapeId[]> {
  const dimensions = metadata?.aspectRatio
    ? getDimensionsFromAspectRatio(metadata.aspectRatio, metadata.resolution || '1K')
    : { w: 1024, h: 1024 }

  const spacing = 50 // Space between images

  if (images.length === 1) {
    // Single image - place at center
    return [await addImageToCanvas(editor, images[0], centerPosition, metadata)]
  } else if (images.length === 2) {
    // Two images - place side by side
    const offset = (dimensions.w + spacing) / 2
    return await Promise.all([
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
    ])
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

    return await Promise.all(
      images.map((imageData, index) =>
        addImageToCanvas(editor, imageData, positions[index], metadata)
      )
    )
  } else {
    // More than 4 - place in rows
    const cols = Math.ceil(Math.sqrt(images.length))
    const rows = Math.ceil(images.length / cols)

    const totalWidth = cols * dimensions.w + (cols - 1) * spacing
    const totalHeight = rows * dimensions.h + (rows - 1) * spacing

    const startX = centerPosition.x - totalWidth / 2 + dimensions.w / 2
    const startY = centerPosition.y - totalHeight / 2 + dimensions.h / 2

    return await Promise.all(
      images.map((imageData, index) => {
        const row = Math.floor(index / cols)
        const col = index % cols
        const position = {
          x: startX + col * (dimensions.w + spacing),
          y: startY + row * (dimensions.h + spacing),
        }
        return addImageToCanvas(editor, imageData, position, metadata)
      })
    )
  }
}

/**
 * Extract image data URLs from selected shapes
 * Handles both custom generated-image shapes and standard tldraw image shapes
 */
export async function extractImageDataFromShapes(shapes: any[], editor?: Editor): Promise<string[]> {
  const results = await Promise.all(
    shapes.map(async (shape, index) => {
      if (shape.type === 'generated-image') {
        // Custom shape with direct imageData
        return shape.props.imageData
      } else if (shape.type === 'image' && editor) {
        // Standard tldraw image shape from dropped files
        try {

          // Try to get SVG and convert to image
          const svg = await editor.getSvgString([shape.id], {
            background: false,
          })

          if (svg) {
            // Create a canvas to render the SVG
            const blob = await new Promise<Blob | null>((resolve) => {
              const img = new Image()
              const svgBlob = new Blob([svg.svg], { type: 'image/svg+xml' })
              const url = URL.createObjectURL(svgBlob)

              img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = svg.width
                canvas.height = svg.height
                const ctx = canvas.getContext('2d')

                if (ctx) {
                  ctx.drawImage(img, 0, 0)
                  canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url)
                    resolve(blob)
                  }, 'image/png')
                } else {
                  URL.revokeObjectURL(url)
                  resolve(null)
                }
              }

              img.onerror = () => {
                URL.revokeObjectURL(url)
                resolve(null)
              }

              img.src = url
            })

            if (blob) {
              return new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => {
                  resolve(reader.result as string)
                }
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
            }
          }
        } catch (error) {
          console.error(`Shape ${index}: Failed to export dropped image:`, error)
        }

        return null
      }
      return null
    })
  )

  const filtered = results.filter((data): data is string => data !== null)
  return filtered
}
