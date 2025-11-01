import type { Meta, StoryObj } from '@storybook/react'
import { SelectionBadges } from '@/components/canvas/SelectionBadges'
import { useState, useEffect } from 'react'
import type { Editor, TLShapeId } from '@tldraw/tldraw'

// Mock editor for demonstration
function createMockEditor(): Partial<Editor> {
  return {
    getShape: (id: TLShapeId) => ({
      id,
      type: 'image' as const,
      x: 0,
      y: 0,
      props: {},
    } as any),
    getShapePageBounds: (id: TLShapeId) => {
      // Create staggered positions for visual demo
      const index = parseInt(id.toString().slice(-1)) || 0
      return {
        x: 100 + index * 300,
        y: 100 + (index % 2) * 200,
        w: 256,
        h: 256,
        minX: 100,
        minY: 100,
        maxX: 356,
        maxY: 356,
      }
    },
    pageToScreen: (point: { x: number; y: number }) => point,
    store: {
      listen: () => () => {}, // Mock unsubscribe
    } as any,
  } as any
}

// Wrapper component for demonstration
function SelectionBadgesDemo() {
  const [isClient, setIsClient] = useState(false)
  const [mockEditor] = useState(() => createMockEditor())
  const [selectionIdMap, setSelectionIdMap] = useState<Map<TLShapeId, number>>(new Map())

  useEffect(() => {
    setIsClient(true)

    // Simulate selection after mount
    const timer = setTimeout(() => {
      const map = new Map<TLShapeId, number>()
      map.set('shape:1' as TLShapeId, 1)
      map.set('shape:2' as TLShapeId, 2)
      map.set('shape:3' as TLShapeId, 3)
      setSelectionIdMap(map)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Visual guide boxes showing where "images" would be */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from(selectionIdMap.keys()).map((id, index) => {
          const bounds = mockEditor.getShapePageBounds!(id)
          if (!bounds) return null
          return (
            <div
              key={id}
              className="absolute border-2 border-dashed border-primary/30 rounded-lg"
              style={{
                left: bounds.x,
                top: bounds.y,
                width: bounds.w,
                height: bounds.h,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Image {index + 1}
              </div>
            </div>
          )
        })}
      </div>

      {/* The actual SelectionBadges component */}
      <SelectionBadges
        editor={mockEditor as Editor}
        selectionIdMap={selectionIdMap}
      />

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card border rounded-lg p-4 shadow-lg max-w-md">
        <h3 className="font-semibold mb-2">Selection Badges Demo</h3>
        <p className="text-sm text-muted-foreground">
          Numbered badges (1, 2, 3) appear in the top-right corner of each selected image.
          These IDs help users reference specific images in prompts.
        </p>
      </div>
    </div>
  )
}

const meta: Meta<typeof SelectionBadges> = {
  title: 'Components/SelectionBadges',
  component: SelectionBadgesDemo as any,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof SelectionBadges>

export const Default: Story = {
  render: () => <SelectionBadgesDemo />,
}

export const EmptySelection: Story = {
  render: () => {
    const [mockEditor] = useState(() => createMockEditor())
    const [selectionIdMap] = useState(new Map<TLShapeId, number>())

    return (
      <div className="relative w-full h-screen bg-background flex items-center justify-center">
        <SelectionBadges
          editor={mockEditor as Editor}
          selectionIdMap={selectionIdMap}
        />
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-semibold mb-2">No Selection</p>
          <p className="text-sm">Badges only appear when 2+ images are selected</p>
        </div>
      </div>
    )
  },
}

export const SingleSelection: Story = {
  render: () => {
    const [isClient, setIsClient] = useState(false)
    const [mockEditor] = useState(() => createMockEditor())
    const [selectionIdMap, setSelectionIdMap] = useState<Map<TLShapeId, number>>(new Map())

    useEffect(() => {
      setIsClient(true)
      const timer = setTimeout(() => {
        const map = new Map<TLShapeId, number>()
        map.set('shape:1' as TLShapeId, 1)
        setSelectionIdMap(map)
      }, 500)
      return () => clearTimeout(timer)
    }, [])

    if (!isClient) return <div>Loading...</div>

    return (
      <div className="relative w-full h-screen bg-background">
        <div className="absolute" style={{ left: 100, top: 100, width: 256, height: 256 }}>
          <div className="w-full h-full border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Single Image</span>
          </div>
        </div>

        <SelectionBadges
          editor={mockEditor as Editor}
          selectionIdMap={selectionIdMap}
        />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card border rounded-lg p-4 shadow-lg max-w-md">
          <p className="text-sm text-muted-foreground">
            No badges shown - selection requires 2+ images
          </p>
        </div>
      </div>
    )
  },
}
