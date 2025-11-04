'use client'

import { useEditor, useValue, TldrawUiButton, TldrawUiContextualToolbar, Box } from '@tldraw/tldraw'
import { Download } from '@carbon/icons-react'
import { useCallback } from 'react'
import type { GeneratedImageShape } from '@/lib/canvas/ImageShape'

export function CustomImageToolbar() {
  const editor = useEditor()

  const selectedShapes = useValue(
    'selected shapes',
    () => editor.getSelectedShapes(),
    [editor]
  )

  const showToolbar = useValue(
    'showToolbar',
    () => editor.isInAny('select.idle', 'select.pointing_shape'),
    [editor]
  )

  const getSelectionBounds = useCallback(() => {
    const fullBounds = editor.getSelectionScreenBounds()
    if (!fullBounds) return undefined
    // Return bounds at the top of selection (height: 0 to position toolbar above)
    return new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0)
  }, [editor])

  // Filter for image shapes (both types)
  const imageShapes = selectedShapes.filter(
    (shape) => shape.type === 'image' || shape.type === 'generated-image'
  )

  // Don't render if no images are selected or not in right state
  if (imageShapes.length === 0 || !showToolbar) {
    return null
  }

  const handleDownload = async () => {
    for (const shape of imageShapes) {
      try {
        let imageData: string | undefined

        if (shape.type === 'generated-image') {
          imageData = (shape as GeneratedImageShape).props.imageData
        } else if (shape.type === 'image') {
          // For regular tldraw image shapes, get the asset
          const imageShape = shape as any
          if (imageShape.props.assetId) {
            const asset = editor.getAsset(imageShape.props.assetId)
            if (asset && asset.type === 'image') {
              imageData = asset.props.src
            }
          }
        }

        if (!imageData) continue

        // Create a temporary link and trigger download
        const link = document.createElement('a')
        link.href = imageData

        // Generate filename
        const timestamp = Date.now()
        const filename = shape.type === 'generated-image'
          ? `generated-image-${timestamp}.png`
          : `image-${timestamp}.png`

        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Small delay between downloads to avoid browser blocking
        if (imageShapes.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error('Failed to download image:', error)
      }
    }
  }

  return (
    <TldrawUiContextualToolbar
      className="tlui-image__toolbar"
      getSelectionBounds={getSelectionBounds}
      label="Image toolbar"
    >
      {/* Download button for all image types */}
      <TldrawUiButton
        type="normal"
        title={`Download ${imageShapes.length} image${imageShapes.length > 1 ? 's' : ''}`}
        onClick={handleDownload}
      >
        <Download size={16} />
      </TldrawUiButton>
    </TldrawUiContextualToolbar>
  )
}
