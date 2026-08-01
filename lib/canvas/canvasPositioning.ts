import type { Editor, TLShape, TLShapeId } from '@tldraw/tldraw'
import type { CanvasImageShape } from './ImageShape'

const TOOLBAR_HEIGHT_PX = 220
const SHAPE_SPACING = 100
const SHAPE_PADDING = 50

type Dimensions = { w: number; h: number }
type Point = { x: number; y: number }
type SizedShape = TLShape & { props: Dimensions }

function hasSizeProps(shape: TLShape): shape is SizedShape {
  return 'w' in shape.props && typeof shape.props.w === 'number' &&
    'h' in shape.props && typeof shape.props.h === 'number'
}

function hasOverlap(
  x: number,
  y: number,
  width: number,
  height: number,
  shapes: TLShape[]
): boolean {
  return shapes.some((shape) => {
    if (!hasSizeProps(shape)) return false

    const bounds = {
      minX: shape.x - SHAPE_PADDING,
      minY: shape.y - SHAPE_PADDING,
      maxX: shape.x + shape.props.w + SHAPE_PADDING,
      maxY: shape.y + shape.props.h + SHAPE_PADDING,
    }

    return !(
      x + width < bounds.minX || x > bounds.maxX ||
      y + height < bounds.minY || y > bounds.maxY
    )
  })
}

export function getDimensionsFromAspectRatio(
  aspectRatio: string,
  resolution: string = '1K'
): Dimensions {
  const baseSize = resolution === '2K' ? 2048 : resolution === '4K' ? 4096 : 1024
  const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number)
  const ratio = widthRatio / heightRatio

  return ratio >= 1
    ? { w: baseSize, h: baseSize / ratio }
    : { w: baseSize * ratio, h: baseSize }
}

export function getViewportCenter(editor: Editor): Point {
  const viewport = editor.getViewportPageBounds()
  return {
    x: viewport.center.x,
    y: viewport.center.y - TOOLBAR_HEIGHT_PX / editor.getZoomLevel() / 2,
  }
}

export function findEmptySpace(editor: Editor, dimensions: Dimensions): Point {
  const viewport = editor.getViewportPageBounds()
  const toolbarHeight = TOOLBAR_HEIGHT_PX / editor.getZoomLevel()
  const shapes = editor.getCurrentPageShapes()

  if (shapes.length === 0) return getViewportCenter(editor)

  const sizedShapes = shapes.filter(hasSizeProps)
  const rightmost = sizedShapes.reduce(
    (maximum, shape) => Math.max(maximum, shape.x + shape.props.w),
    viewport.center.x
  )
  const centerY = sizedShapes.length > 0
    ? sizedShapes.reduce((sum, shape) => sum + shape.y + shape.props.h / 2, 0) / sizedShapes.length
    : viewport.center.y

  for (let index = 0; index < 10; index++) {
    const x = rightmost + SHAPE_SPACING + index * (dimensions.w + SHAPE_SPACING)
    if (!hasOverlap(x - dimensions.w / 2, centerY - dimensions.h / 2, dimensions.w, dimensions.h, shapes)) {
      return { x, y: centerY }
    }
  }

  const usableBottom = viewport.maxY - toolbarHeight
  const gridSize = Math.max(dimensions.w, dimensions.h) + SHAPE_SPACING
  const columns = Math.ceil(viewport.w / gridSize)
  const rows = Math.ceil((usableBottom - viewport.minY) / gridSize)

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const left = viewport.minX + column * gridSize + (gridSize - dimensions.w) / 2
      const top = viewport.minY + row * gridSize + (gridSize - dimensions.h) / 2
      const fits = left + dimensions.w <= viewport.maxX && top + dimensions.h <= usableBottom

      if (fits && !hasOverlap(left, top, dimensions.w, dimensions.h, shapes)) {
        return { x: left + dimensions.w / 2, y: top + dimensions.h / 2 }
      }
    }
  }

  return { x: rightmost + SHAPE_SPACING + dimensions.w / 2, y: centerY }
}

export function getPositionNearSelection(
  editor: Editor,
  selectedShapes: CanvasImageShape[],
  dimensions: Dimensions
): Point {
  if (selectedShapes.length === 0) return getViewportCenter(editor)

  const bounds = selectedShapes.reduce(
    (result, shape) => ({
      minX: Math.min(result.minX, shape.x),
      minY: Math.min(result.minY, shape.y),
      maxX: Math.max(result.maxX, shape.x + shape.props.w),
      maxY: Math.max(result.maxY, shape.y + shape.props.h),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  )
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const shapes = editor.getCurrentPageShapes()

  for (let index = 0; index < 5; index++) {
    const x = bounds.maxX + SHAPE_SPACING + index * (dimensions.w + SHAPE_SPACING)
    if (!hasOverlap(x - dimensions.w / 2, centerY - dimensions.h / 2, dimensions.w, dimensions.h, shapes)) {
      return { x, y: centerY }
    }
  }

  for (let index = 0; index < 5; index++) {
    const y = bounds.maxY + SHAPE_SPACING + index * (dimensions.h + SHAPE_SPACING)
    if (!hasOverlap(centerX - dimensions.w / 2, y - dimensions.h / 2, dimensions.w, dimensions.h, shapes)) {
      return { x: centerX, y }
    }
  }

  return { x: bounds.maxX + SHAPE_SPACING + dimensions.w / 2, y: centerY }
}

export function focusAndCenterShapes(
  editor: Editor,
  shapeIds: TLShapeId[],
  animate: boolean = true
): void {
  if (shapeIds.length === 0) return
  editor.setSelectedShapes(shapeIds)

  requestAnimationFrame(() => {
    const bounds = editor.getSelectionPageBounds()
    if (!bounds) return

    editor.zoomToBounds(bounds, {
      targetZoom: editor.getZoomLevel(),
      inset: 100,
      animation: animate ? { duration: 300 } : undefined,
    })
  })
}
