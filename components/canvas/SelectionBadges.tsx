'use client'

import { useValue, type Editor, type TLShapeId } from '@tldraw/tldraw'

interface SelectionBadgesProps {
  editor: Editor | null
  selectionIdMap: Map<TLShapeId, number>
}

// Constants for badge positioning
const BADGE_SIZE = 32

// Helper function to calculate badge position for a shape
function calculateBadgePosition(editor: Editor, shapeId: TLShapeId): { x: number; y: number } | null {
  const bounds = editor.getShapePageBounds(shapeId)
  if (!bounds) return null

  // Calculate page position for badge (centered in top-right corner)
  // Position the center of the badge at the top-right corner
  const pageX = bounds.x + bounds.w
  const pageY = bounds.y

  // Convert page coordinates to screen coordinates
  const screenPos = editor.pageToScreen({ x: pageX, y: pageY })

  // Adjust to center the badge on the corner (offset by half the badge size)
  return {
    x: screenPos.x - BADGE_SIZE / 2,
    y: screenPos.y - BADGE_SIZE / 2
  }
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
  const badges = useValue(
    'selection badges',
    () => editor && selectionIdMap.size > 0 ? calculateAllBadges(editor, selectionIdMap) : [],
    [editor, selectionIdMap]
  )

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
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(18px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.8)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '400',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
        >
          {badge.number}
        </div>
      ))}
    </div>
  )
}
