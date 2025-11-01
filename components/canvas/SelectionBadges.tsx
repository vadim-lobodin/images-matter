'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Editor, TLShapeId } from '@tldraw/tldraw'

interface SelectionBadgesProps {
  editor: Editor | null
  selectionIdMap: Map<TLShapeId, number>
}

// Constants for badge positioning
const BADGE_OFFSET_X = 40
const BADGE_OFFSET_Y = 8

// Helper function to calculate badge position for a shape
function calculateBadgePosition(editor: Editor, shapeId: TLShapeId): { x: number; y: number } | null {
  const bounds = editor.getShapePageBounds(shapeId)
  if (!bounds) return null

  // Calculate page position for badge (top-right corner with offset)
  const pageX = bounds.x + bounds.w - BADGE_OFFSET_X
  const pageY = bounds.y + BADGE_OFFSET_Y

  // Convert page coordinates to screen coordinates using tldraw's method
  return editor.pageToScreen({ x: pageX, y: pageY })
}

// Helper function to calculate all badges for current selection
function calculateAllBadges(
  editor: Editor,
  selectionIdMap: Map<TLShapeId, number>
): Array<{ id: TLShapeId; number: number; x: number; y: number }> {
  const badges: Array<{ id: TLShapeId; number: number; x: number; y: number }> = []

  selectionIdMap.forEach((selectionId, shapeId) => {
    const shape = editor.getShape(shapeId)
    if (!shape) return

    const position = calculateBadgePosition(editor, shapeId)
    if (!position) return

    badges.push({
      id: shapeId,
      number: selectionId,
      x: position.x,
      y: position.y,
    })
  })

  return badges
}

export function SelectionBadges({ editor, selectionIdMap }: SelectionBadgesProps) {
  const [badges, setBadges] = useState<Array<{ id: TLShapeId; number: number; x: number; y: number }>>([])

  useEffect(() => {
    if (!editor || selectionIdMap.size === 0) {
      setBadges([])
      return
    }

    // Function to update badge positions
    const updateBadgePositions = () => {
      setBadges(calculateAllBadges(editor, selectionIdMap))
    }

    // Calculate initial badge positions
    updateBadgePositions()

    // Listen to ALL store changes (camera movements, shape changes, etc.)
    // This ensures badges update during pan, zoom, and shape movements
    const unsubscribe = editor.store.listen(() => {
      // Recalculate immediately on every change for smooth tracking
      updateBadgePositions()
    }, { scope: 'all' })

    return () => {
      unsubscribe()
    }
  }, [editor, selectionIdMap])

  if (badges.length === 0) return null

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1000 }}>
      {badges.map((badge) => (
        <div
          key={badge.id}
          style={{
            position: 'absolute',
            left: `${badge.x}px`,
            top: `${badge.y}px`,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--badge-bg, #3b82f6)',
            color: 'var(--badge-text, #ffffff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px var(--badge-shadow, rgba(0, 0, 0, 0.2))',
          }}
          className="dark:[--badge-bg:#3b82f6] dark:[--badge-text:#ffffff] dark:[--badge-shadow:rgba(0,0,0,0.4)] [--badge-bg:#3b82f6] [--badge-text:#ffffff] [--badge-shadow:rgba(0,0,0,0.2)]"
        >
          {badge.number}
        </div>
      ))}
    </div>
  )
}
