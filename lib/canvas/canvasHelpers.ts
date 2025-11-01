import { Editor, createShapeId } from '@tldraw/tldraw'
import { GeneratedImageShape } from './ImageShape'

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
 * Get position near selected images for new generations
 * Places new images to the right of the selection with spacing
 */
export function getPositionNearSelection(
  editor: Editor,
  selectedShapes: GeneratedImageShape[],
  newImageDimensions: { w: number; h: number }
): { x: number; y: number } {
  if (selectedShapes.length === 0) {
    return getViewportCenter(editor)
  }

  // Find the rightmost edge and vertical center of selected shapes
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  selectedShapes.forEach((shape) => {
    const rightEdge = shape.x + shape.props.w
    const topEdge = shape.y
    const bottomEdge = shape.y + shape.props.h

    if (rightEdge > maxX) maxX = rightEdge
    if (topEdge < minY) minY = topEdge
    if (bottomEdge > maxY) maxY = bottomEdge
  })

  // Calculate vertical center of selection
  const centerY = (minY + maxY) / 2

  // Place new images to the right with spacing
  const spacing = 100
  const newX = maxX + spacing + newImageDimensions.w / 2

  return {
    x: newX,
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
): Promise<string> {
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
  }
): string[] {
  const dimensions = getDimensionsFromAspectRatio(metadata.aspectRatio, metadata.resolution)
  const spacing = 50
  const shapeIds: string[] = []

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
): Promise<string[]> {
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
  console.log('Extracting image data from', shapes.length, 'shapes')

  const results = await Promise.all(
    shapes.map(async (shape, index) => {
      console.log(`Shape ${index}:`, { type: shape.type, id: shape.id })

      if (shape.type === 'generated-image') {
        // Custom shape with direct imageData
        console.log(`Shape ${index}: Using direct imageData`)
        return shape.props.imageData
      } else if (shape.type === 'image' && editor) {
        // Standard tldraw image shape from dropped files
        try {
          console.log(`Shape ${index}: Exporting dropped image using editor methods`)

          // Try to get SVG and convert to image
          const svg = await editor.getSvgString([shape.id], {
            background: false,
          })

          if (svg) {
            console.log(`Shape ${index}: Got SVG, converting to PNG`)
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
              console.log(`Shape ${index}: Converted to blob, size:`, blob.size)
              return new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => {
                  console.log(`Shape ${index}: Blob converted to data URL`)
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

        console.log(`Shape ${index}: Could not export dropped image`)
        return null
      }
      console.log(`Shape ${index}: Could not extract image data`)
      return null
    })
  )

  const filtered = results.filter((data): data is string => data !== null)
  console.log('Extracted', filtered.length, 'valid image data URLs')
  return filtered
}
