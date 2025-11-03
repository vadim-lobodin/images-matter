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
    sourceImageData: string // stores original image for blurred backdrop during regeneration
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
  sourceImageData: T.string,
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
      sourceImageData: '',
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
          // Loading state with blurred source image backdrop
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
              borderRadius: '20px',
              overflow: 'hidden',
              position: 'relative',
              contain: 'layout style paint', // Optimize rendering
            }}
          >
            {/* Breathing background */}
            <motion.div
              animate={{
                opacity: [0.6, 0.75, 0.9, 0.75, 0.6],
                scale: [1, 1.01, 1.02, 1.01, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: [0.4, 0.0, 0.6, 1.0],
              }}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'var(--loading-bg)',
                willChange: 'opacity, transform', // Hint for GPU acceleration
                transform: 'translateZ(0)', // Force GPU layer
              }}
              className="dark:[--loading-bg:#18181b] [--loading-bg:#d4d4d8]"
            />
            {/* Blurred source image that blends with background */}
            {shape.props.sourceImageData && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${shape.props.sourceImageData})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(50px) saturate(0)',
                  transform: 'scale3d(1.2, 1.2, 1) translateZ(0)', // GPU-accelerated scale
                  mixBlendMode: 'soft-light',
                  opacity: 0.4,
                  willChange: 'transform', // Hint for optimization
                }}
              />
            )}
          </motion.div>
        ) : (
          // Image loaded state with conditional enter animation
          <motion.div
            key={`${shape.id}-${shouldAnimate ? 'animated' : 'static'}`}
            initial={shouldAnimate ? {
              opacity: 0,
              scale: 0.9,
              y: 20,
              filter: 'blur(10px)'
            } : {
              opacity: 1,
              scale: 1,
              y: 0,
              filter: 'blur(0px)'
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              filter: 'blur(0px)'
            }}
            transition={
              shouldAnimate
                ? {
                    duration: 0.6,
                    opacity: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                    scale: { type: 'spring', stiffness: 200, damping: 25, duration: 0.6 },
                    y: { type: 'spring', stiffness: 200, damping: 25, duration: 0.6 },
                    filter: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
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
                objectFit: 'contain',
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
