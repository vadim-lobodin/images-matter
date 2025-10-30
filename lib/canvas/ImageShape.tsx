import {
  BaseBoxShapeUtil,
  DefaultColorStyle,
  RecordProps,
  T,
  TLBaseShape,
  resizeBox,
  HTMLContainer,
} from '@tldraw/tldraw'
import * as motion from 'motion/react-client'

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
    hasAnimated: boolean // true after initial load animation
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
  hasAnimated: T.boolean,
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
      hasAnimated: false,
    }
  }

  override canResize = () => true
  override canBind = () => false
  override canEdit = () => false
  override isAspectRatioLocked = () => true

  // Rendering
  component(shape: GeneratedImageShape) {
    const isLoading = shape.props.isLoading
    const shouldAnimate = !shape.props.hasAnimated

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
          // Loading state with motion animation
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'hsl(var(--background))',
              borderRadius: '8px',
              border: '1px solid hsl(var(--border))',
              gap: '16px',
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{
                width: '48px',
                height: '48px',
                border: '3px solid hsl(var(--muted))',
                borderTop: '3px solid hsl(var(--foreground))',
                borderRadius: '50%',
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              style={{
                fontSize: '14px',
                color: 'hsl(var(--muted-foreground))',
                fontWeight: '500',
              }}
            >
              Generating...
            </motion.div>
          </motion.div>
        ) : (
          // Image loaded state with conditional enter animation
          <motion.div
            key={`${shape.id}-${shouldAnimate ? 'animated' : 'static'}`}
            initial={shouldAnimate ? { opacity: 0, scale: 0 } : { opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              shouldAnimate
                ? {
                    duration: 0.4,
                    scale: { type: 'spring', visualDuration: 0.4, bounce: 0.5 },
                  }
                : { duration: 0 }
            }
            onAnimationComplete={() => {
              if (shouldAnimate) {
                this.editor.updateShape({
                  id: shape.id,
                  type: shape.type,
                  props: { hasAnimated: true },
                })
              }
            }}
            style={{
              width: '100%',
              height: '100%',
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
          </motion.div>
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
