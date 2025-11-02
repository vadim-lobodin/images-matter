'use client'

import { Tldraw, TLComponents, defaultShapeUtils } from '@tldraw/tldraw'
import { GeneratedImageShapeUtil, GeneratedImageShape } from '@/lib/canvas/ImageShape'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
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
  onDrop?: (imageUrl: string, position: { x: number; y: number }) => void
}

export function TldrawCanvas({ onSelectionChange, onReady, onDrop }: TldrawCanvasProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [editor, setEditor] = useState<any>(null)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync theme with tldraw when it changes
  useEffect(() => {
    if (editor && resolvedTheme) {
      // tldraw uses 'dark' or 'light' as colorScheme values
      editor.user.updateUserPreferences({
        colorScheme: resolvedTheme === 'dark' ? 'dark' : 'light'
      })
    }
  }, [editor, resolvedTheme])

  // Setup selection listener and cleanup properly
  useEffect(() => {
    if (!editor) return

    console.log('TldrawCanvas: Setting up selection listener')

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

    // Call it once on setup to initialize
    handleSelectionChange()

    // Cleanup listener on unmount
    return () => {
      console.log('TldrawCanvas: Cleaning up selection listener')
      unsubscribe()
    }
  }, [editor, onSelectionChange])

  const handleMount = (editorInstance: any) => {
    console.log('TldrawCanvas: Editor mounted')
    setEditor(editorInstance)
    onReady?.(editorInstance)
  }

  const handleDragOver = (e: React.DragEvent) => {
    // Prevent default to allow drop
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!editor || !onDrop) return

    // Get image URL from drag data
    const imageUrl = e.dataTransfer.getData('text/plain')
    if (!imageUrl) return

    // Convert screen coordinates to canvas page coordinates
    const point = editor.screenToPage({ x: e.clientX, y: e.clientY })

    // Call parent handler with image URL and position
    onDrop(imageUrl, point)
  }

  // Don't render until mounted to avoid SSR issues
  if (!mounted) {
    return (
      <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', background: 'hsl(var(--background))' }} />
    )
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }}
      onDragOverCapture={handleDragOver}
      onDropCapture={handleCanvasDrop}
    >
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
