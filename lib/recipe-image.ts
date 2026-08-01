import type { RecipeImage } from './recipes'

const MAX_FILE_BYTES = 20 * 1024 * 1024
const THUMBNAIL_EDGE = 192
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('This browser could not process the image'))
    }, type, quality)
  })
}

function drawScaledImage(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number
): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sourceWidth * scale))
  canvas.height = Math.max(1, Math.round(sourceHeight * scale))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not process the image')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

export async function processRecipeImage(file: File): Promise<RecipeImage> {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error('Choose a PNG, JPEG, or WebP image')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Reference images must be smaller than 20 MB')
  }

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const thumbnailCanvas = drawScaledImage(bitmap, bitmap.width, bitmap.height, THUMBNAIL_EDGE)
    const thumbnailBlob = await canvasToBlob(thumbnailCanvas, 'image/webp', 0.78)

    return {
      // Preserve the uploaded file byte-for-byte for the model. The optimized
      // thumbnail is used only by the recipe library UI.
      blob: file,
      thumbnailBlob,
      mimeType: file.type,
      width: bitmap.width,
      height: bitmap.height,
      isOriginal: true,
    }
  } finally {
    bitmap?.close()
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read the reference image'))
    reader.readAsDataURL(blob)
  })
}
