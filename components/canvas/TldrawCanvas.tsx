'use client'

import { Tldraw, TLComponents, defaultShapeUtils } from '@tldraw/tldraw'
import { GeneratedImageShapeUtil, GeneratedImageShape } from '@/lib/canvas/ImageShape'
import '@tldraw/tldraw/tldraw.css'

// Define custom shape utils
const customShapeUtils = [GeneratedImageShapeUtil]

// Combine with default shapes
const shapeUtils = [...defaultShapeUtils, ...customShapeUtils]

// Custom UI components (hiding unnecessary tools)
const components: TLComponents = {
  Toolbar: null, // Hide default toolbar
  KeyboardShortcutsDialog: null,
  QuickActions: null,
  HelperButtons: null,
  DebugPanel: null,
  MenuPanel: null,
  NavigationPanel: null,
  PageMenu: null,
  StylePanel: null,
  ActionsMenu: null,
  HelpMenu: null,
  ZoomMenu: null,
  MainMenu: null,
}

interface TldrawCanvasProps {
  onSelectionChange?: (selectedImages: GeneratedImageShape[]) => void
  onReady?: (editor: any) => void
}

export function TldrawCanvas({ onSelectionChange, onReady }: TldrawCanvasProps) {

  const handleMount = (editor: any) => {
    // Track selection changes
    const handleSelectionChange = () => {
      const selectedShapes = editor.getSelectedShapes()
      const selectedImages = selectedShapes.filter(
        (shape: any) => shape.type === 'generated-image'
      ) as GeneratedImageShape[]

      console.log('Selection changed:', {
        totalSelected: selectedShapes.length,
        imageShapesSelected: selectedImages.length
      })

      onSelectionChange?.(selectedImages)
    }

    editor.on('selection-change', handleSelectionChange)

    // Also call it once on mount to initialize
    handleSelectionChange()

    // Notify parent that editor is ready
    onReady?.(editor)

    return () => {
      editor.off('selection-change', handleSelectionChange)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }}>
      <Tldraw
        shapeUtils={shapeUtils}
        components={components}
        onMount={handleMount}
        inferDarkMode
        persistenceKey="image-playground-canvas"
      />
    </div>
  )
}
