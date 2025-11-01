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
    promptHistory: string[] // array of all prompts used to create this image (for iterative editing)
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
  promptHistory: T.arrayOf(T.string),
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
      promptHistory: [],
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
          // Loading state with gray background and pulsating effect
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{ duration: 0.3 }}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '20px',
              overflow: 'hidden',
            }}
          >
            {/* Pulsating background */}
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'var(--loading-card-bg, #e4e4e7)',
                borderRadius: '20px',
              }}
              className="dark:[--loading-card-bg:#52525b] [--loading-card-bg:#e4e4e7]"
            />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
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
                  border: '3px solid var(--spinner-light, rgba(0, 0, 0, 0.2))',
                  borderTop: '3px solid var(--spinner-dark, rgba(0, 0, 0, 0.7))',
                  borderRadius: '50%',
                }}
                className="dark:[--spinner-light:rgba(255,255,255,0.3)] dark:[--spinner-dark:rgba(255,255,255,0.9)] [--spinner-light:rgba(0,0,0,0.2)] [--spinner-dark:rgba(0,0,0,0.7)]"
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                style={{
                  fontSize: '14px',
                  color: 'var(--text-color, rgba(0, 0, 0, 0.7))',
                  fontWeight: '500',
                }}
                className="dark:[--text-color:rgba(255,255,255,0.9)] [--text-color:rgba(0,0,0,0.7)]"
              >
                Generating...
              </motion.div>
            </div>
          </motion.div>
        ) : (
          // Image loaded state with conditional enter animation
          <motion.div
            key={`${shape.id}-${shouldAnimate ? 'animated' : 'static'}`}
            initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              shouldAnimate
                ? {
                    duration: 0.5,
                    opacity: { duration: 0.3 },
                    scale: { type: 'spring', stiffness: 260, damping: 20 },
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
                borderRadius: '20px',
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
        rx={20}
        ry={20}
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
