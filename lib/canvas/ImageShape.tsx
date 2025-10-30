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
    imageData: string // base64 data URL (empty when loading)
    prompt: string
    model: string
    timestamp: number
    aspectRatio: string
    resolution: string
    isLoading: boolean // true when generating
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
  isLoading: T.boolean,
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
      isLoading: false,
    }
  }

  override canResize = () => true
  override canBind = () => false
  override canEdit = () => false
  override isAspectRatioLocked = () => true

  // Rendering
  component(shape: GeneratedImageShape) {
    const isLoading = shape.props.isLoading

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: 'all',
        }}
      >
        {isLoading ? (
          // Loading state
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '8px',
              border: '2px dashed rgba(0, 0, 0, 0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {/* Spinner */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid rgba(0, 0, 0, 0.1)',
                  borderTop: '4px solid rgba(0, 0, 0, 0.6)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <div
                style={{
                  fontSize: '14px',
                  color: 'rgba(0, 0, 0, 0.6)',
                  fontWeight: '500',
                }}
              >
                Generating...
              </div>
            </div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          // Image loaded state
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
        )}
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
