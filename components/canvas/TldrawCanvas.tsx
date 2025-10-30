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
    console.log('TldrawCanvas mounted, setting up listeners')

    let prevSelectedIds = new Set<string>()

    // Track selection changes
    const handleSelectionChange = () => {
      const selectedShapes = editor.getSelectedShapes()
      const selectedImages = selectedShapes.filter(
        (shape: any) => shape.type === 'generated-image' || shape.type === 'image'
      ) as GeneratedImageShape[]

      console.log('Selection changed:', {
        totalSelected: selectedShapes.length,
        imageShapesSelected: selectedImages.length,
        shapeTypes: selectedShapes.map((s: any) => s.type),
        selectedIds: Array.from(editor.getSelectedShapeIds())
      })

      onSelectionChange?.(selectedImages)

      // Update previous selection
      prevSelectedIds = new Set<string>(editor.getSelectedShapeIds() as Iterable<string>)
    }

    // Use store listener to catch any changes
    const unsubscribe = editor.store.listen(() => {
      const currentSelectedIds = new Set<string>(editor.getSelectedShapeIds() as Iterable<string>)

      // Check if selection has changed
      const selectionChanged =
        currentSelectedIds.size !== prevSelectedIds.size ||
        !Array.from(currentSelectedIds).every((id) => prevSelectedIds.has(id))

      if (selectionChanged) {
        handleSelectionChange()
      }
    }, { scope: 'all' })

    // Also call it once on mount to initialize
    handleSelectionChange()

    // Notify parent that editor is ready
    onReady?.(editor)

    return () => {
      unsubscribe()
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
        licenseKey="tldraw-2026-02-07/WyI0cFJXdnZjdSIsWyIqIl0sMTYsIjIwMjYtMDItMDciXQ.+C6/eYU+yzMBjZjVpft9ZdyAzWgXY9v5XqLkdBnx2IgIHeSiQJuLCAE9speLM4CitrxGinBge7n1s8J9x5Y5cA"
      />
    </div>
  )
}
