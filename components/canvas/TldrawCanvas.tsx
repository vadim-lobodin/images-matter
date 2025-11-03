'use client'

import { Tldraw, TLComponents, defaultShapeUtils, useEditor, useValue } from '@tldraw/tldraw'
import { GeneratedImageShapeUtil, GeneratedImageShape } from '@/lib/canvas/ImageShape'
import { useTheme } from 'next-themes'
import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import '@tldraw/tldraw/tldraw.css'

// Define custom shape utils
const customShapeUtils = [GeneratedImageShapeUtil]

// Combine with default shapes
const shapeUtils = [...defaultShapeUtils, ...customShapeUtils]

// Custom Grid component with dotted pattern
function DottedGrid() {
  const editor = useEditor()
  const screenBounds = useValue('screenBounds', () => editor.getViewportScreenBounds(), [editor])
  const devicePixelRatio = useValue('dpr', () => editor.getInstanceState().devicePixelRatio, [editor])
  const isDarkMode = useValue('isDarkMode', () => editor.user.getIsDarkMode(), [editor])
  const camera = useValue('camera', () => editor.getCamera(), [editor])
  const canvas = useRef<HTMLCanvasElement>(null)

  const size = 70 // Grid size in pixels
  const { x: cameraX, y: cameraY, z: zoom } = camera

  useLayoutEffect(() => {
    if (!canvas.current) return

    const canvasW = screenBounds.w * devicePixelRatio
    const canvasH = screenBounds.h * devicePixelRatio
    canvas.current.width = canvasW
    canvas.current.height = canvasH

    const ctx = canvas.current.getContext('2d')
    if (!ctx) return

    // Fill background with zinc-950 in dark mode, neutral-100 in light mode
    ctx.fillStyle = isDarkMode ? '#09090b' : '#f5f5f5'
    ctx.fillRect(0, 0, canvasW, canvasH)

    // Calculate grid boundaries in page space
    const pageViewportBounds = editor.getViewportPageBounds()
    const startPageX = Math.ceil(pageViewportBounds.minX / size) * size
    const startPageY = Math.ceil(pageViewportBounds.minY / size) * size
    const endPageX = Math.floor(pageViewportBounds.maxX / size) * size
    const endPageY = Math.floor(pageViewportBounds.maxY / size) * size
    const numRows = Math.round((endPageY - startPageY) / size)
    const numCols = Math.round((endPageX - startPageX) / size)

    // Calculate opacity based on zoom level (decrease when zooming out)
    // At zoom 1.0, full opacity (1.0). At zoom 0.1, minimal opacity
    const zoomOpacity = Math.max(0.05, Math.min(1, zoom))

    // Set dot color based on theme with zoom-adjusted opacity
    ctx.fillStyle = isDarkMode
      ? `rgba(255, 255, 255, ${zoomOpacity})`
      : `rgba(0, 0, 0, ${zoomOpacity})`

    // Draw dots at grid intersections
    for (let row = 0; row <= numRows; row++) {
      for (let col = 0; col <= numCols; col++) {
        const pageX = startPageX + col * size
        const pageY = startPageY + row * size
        const canvasX = (pageX + cameraX) * zoom * devicePixelRatio
        const canvasY = (pageY + cameraY) * zoom * devicePixelRatio

        // Draw a fixed-size dot (always 0.5px radius on screen, regardless of zoom)
        ctx.beginPath()
        ctx.arc(canvasX, canvasY, 0.5 * devicePixelRatio, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, [screenBounds, camera, size, devicePixelRatio, editor, isDarkMode])

  return <canvas className="tl-grid" ref={canvas} />
}

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
  Background: DottedGrid, // Add custom dotted grid as Background
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

  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!editor || !onDrop) return

    // Convert screen coordinates to canvas page coordinates
    const point = editor.screenToPage({ x: e.clientX, y: e.clientY })

    // Check for image URL from drag data (from history panel)
    const imageUrl = e.dataTransfer.getData('text/plain')
    if (imageUrl) {
      onDrop(imageUrl, point)
      return
    }

    // Check for files from Finder/file system
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    )

    if (files.length > 0) {
      // Convert files to data URLs and add them
      for (const file of files) {
        const reader = new FileReader()
        reader.onload = () => {
          onDrop(reader.result as string, point)
        }
        reader.readAsDataURL(file)
      }
    }
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
