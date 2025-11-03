'use client'

import { useEditor, useValue } from '@tldraw/tldraw'
import { Download } from '@carbon/icons-react'
import type { GeneratedImageShape } from '@/lib/canvas/ImageShape'

export function ImageQuickActions() {
  const editor = useEditor()
  const selectedShapes = useValue('selected shapes', () => editor.getSelectedShapes(), [editor])

  // Filter for image shapes (both generated-image and regular image types)
  const imageShapes = selectedShapes.filter(
    (shape) => shape.type === 'generated-image' || shape.type === 'image'
  )

  // Only show if at least one image is selected
  if (imageShapes.length === 0) {
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
    <div
      style={{
        position: 'absolute',
        top: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
        padding: '8px',
        background: 'var(--color-panel)',
        border: '1px solid var(--color-panel-contrast)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <button
        onClick={handleDownload}
        title={`Download ${imageShapes.length} image${imageShapes.length > 1 ? 's' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'transparent',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          color: 'var(--color-text)',
          fontSize: '14px',
          fontWeight: 500,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-muted-1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <Download size={16} />
        Download
      </button>
    </div>
  )
}
