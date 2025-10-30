import {
  BaseBoxShapeUtil,
  DefaultColorStyle,
  RecordProps,
  T,
  TLBaseShape,
  resizeBox,
  HTMLContainer,
} from '@tldraw/tldraw'

// Define the shape type
export type GeneratedImageShape = TLBaseShape<
  'generated-image',
  {
    w: number
    h: number
    imageData: string // base64 data URL
    prompt: string
    model: string
    timestamp: number
    aspectRatio: string
    resolution: string
  }
>

// Validation
export const generatedImageShapeProps: RecordProps<GeneratedImageShape> = {
  w: T.number,
  h: T.number,
  imageData: T.string,
  prompt: T.string,
  model: T.string,
  timestamp: T.number,
  aspectRatio: T.string,
  resolution: T.string,
}

// Shape utility class
export class GeneratedImageShapeUtil extends BaseBoxShapeUtil<GeneratedImageShape> {
  static override type = 'generated-image' as const
  static override props = generatedImageShapeProps

  getDefaultProps(): GeneratedImageShape['props'] {
    return {
      w: 512,
      h: 512,
      imageData: '',
      prompt: '',
      model: '',
      timestamp: Date.now(),
      aspectRatio: '1:1',
      resolution: '1K',
    }
  }

  override canResize = () => true
  override canBind = () => false
  override canEdit = () => false
  override isAspectRatioLocked = () => true

  // Rendering
  component(shape: GeneratedImageShape) {
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: 'all',
        }}
      >
        <img
          src={shape.props.imageData}
          alt={shape.props.prompt || 'Generated image'}
          title={shape.props.prompt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '8px',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
          draggable={false}
        />
      </HTMLContainer>
    )
  }

  // Indicator (selection outline)
  indicator(shape: GeneratedImageShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={8}
        ry={8}
        fill="none"
        stroke="var(--color-selected)"
        strokeWidth={2}
      />
    )
  }

  // Handle resizing while maintaining aspect ratio
  override onResize = (shape: GeneratedImageShape, info: any) => {
    return resizeBox(shape, info)
  }
}
