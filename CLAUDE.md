# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Image Playground - A Next.js 16 application for generating and editing images using Google Gemini AI models. Supports both LiteLLM proxy and direct Gemini API access. Features an infinite canvas powered by tldraw for image manipulation and composition.

## Common Commands

### Development
```bash
npm run dev               # Start development server (http://localhost:3000/cascade)
npm run build             # Build for production
npm run start             # Start production server
npm run lint              # Run ESLint and type-check
npm run type-check        # Run TypeScript type checking only
npm run storybook         # Start Storybook on port 6006
npm run build-storybook   # Build Storybook for deployment
```

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 16.0.1 with App Router and Turbopack
- **React**: 19.2.0 with TypeScript 5.9.3 (strict mode)
- **Canvas**: tldraw 4.1.2 - infinite canvas with custom shape utilities
- **Styling**: Tailwind CSS v4, Motion.dev (12.23.24) for animations, Carbon icons
- **AI Integration**: Dual-mode support:
  - LiteLLM proxy client (default) - routes through user-specified proxy
  - Direct Gemini API client - connects to ai.google.dev
- **Storage**: IndexedDB for generation history (browser-side persistence)
- **UI Components**: Radix UI primitives, Vaul drawer, shadcn/ui patterns, Sonner toasts

### High-Level Application Flow

1. **Canvas System** (`/app/cascade/page.tsx`)
   - Main route: `/cascade` (not `/playground`)
   - Orchestrates the entire image generation workflow
   - Manages editor state, selected images, and API credentials
   - Dynamically imports tldraw and canvas helpers to avoid SSR issues
   - Loads canvas helpers only on client-side after mount

2. **API Mode Selection** (`getApiCredentials()`)
   - **LiteLLM Mode** (default): Uses proxy for enterprise/team deployments
     - localStorage keys: `litellm_api_key`, `litellm_proxy_url`
     - Client: `lib/litellm-client.ts`
     - Spawns parallel requests (1 per image) for faster generation
   - **Direct Gemini Mode**: Uses Google's AI Platform directly
     - localStorage keys: `gemini_api_key`, `api_mode` = 'gemini'
     - Client: `lib/gemini-direct-client.ts`
     - Single request with `n` parameter for batch generation

3. **Image Generation Modes**
   - **Generate Mode**: Creates new images from text prompts
   - **Edit Mode**: Modifies existing images (up to 4 input images) with AI guidance
   - Mode automatically switches based on selection state (selectedImages.length > 0)
   - Edit mode auto-sets aspect ratio to 1:1, restores previous on exit

4. **Canvas Positioning Intelligence** (`lib/canvas/canvasHelpers.ts`)
   - **Constants**: `TOOLBAR_HEIGHT_PX = 220`, `SHAPE_SPACING = 100`, `SHAPE_PADDING = 50`
   - `findEmptySpace()`: Grid-based collision detection for new image placement
   - `getPositionNearSelection()`: Places edited images near source images with overlap avoidance
   - `hasOverlap()`: Rectangle collision detection with padding
   - All positioning accounts for viewport bounds, zoom level, and toolbar height

5. **Custom tldraw Shape** (`lib/canvas/ImageShape.tsx`)
   - `GeneratedImageShape`: Custom shape type extending `TLBaseShape`
   - Stores metadata: prompt, model, timestamp, aspectRatio, resolution, promptHistory
   - `promptHistory`: Array of all prompts used to create the image (for iterative editing)
   - `isLoading` state: Shows breathing animation with blurred source image backdrop
   - `hasAnimated` flag: Prevents re-animation on canvas operations (pan, zoom)
   - Motion.dev animations: Scale-in with blur effect on initial load only

6. **API Client Architecture**
   - **LiteLLM Client** (`lib/litellm-client.ts`):
     - `generateGeminiImage()`: Generate mode API wrapper
     - `editGeminiImage()`: Edit mode with multi-image support and prompt history
     - Parallel requests: Creates N individual API calls for N images
     - Error handling: JetBrains VPN detection, network issues, credential validation
   - **Direct Gemini Client** (`lib/gemini-direct-client.ts`):
     - Direct integration with Google AI Platform
     - Batch generation: Single request with `n` parameter
     - Handles aspect ratio via `generationConfig`
     - Note: `imageSize` parameter ignored (Gemini always uses 1024px base)

### Key Components

**Canvas Layer:**
- `TldrawCanvas`: Wraps tldraw with custom shape utils, theme sync, selection tracking
- `SelectionBadges`: Numbered badges (1, 2, 3...) overlay on selected images
- `FloatingToolbar`: Bottom-anchored toolbar with prompt input, model selector, controls

**UI Layer:**
- `HistoryModal`: Sliding panel with Motion.dev animations, IndexedDB persistence
- `ApiSettings`: Dialog for LiteLLM proxy URL and API key configuration
- All modals use `motion/react-client` for spring-based animations

### Important Patterns

**SSR Avoidance for tldraw:**
```typescript
// Dynamic import to prevent SSR issues
const TldrawCanvas = dynamic(
  () => import('@/components/canvas/TldrawCanvas').then((mod) => mod.TldrawCanvas),
  { ssr: false }
)

// Canvas helpers loaded client-side only
useEffect(() => {
  if (typeof window !== 'undefined') {
    import('@/lib/canvas/canvasHelpers').then((mod) => {
      canvasHelpers.addImagesToCanvas = mod.addImagesToCanvas
      // ... other functions
      setHelpersLoaded(true)
    })
  }
}, [])
```

**Parallel Image Generation:**
- Creates loading placeholders first (instant feedback)
- LiteLLM mode: Spawns N parallel API requests (1 per image)
- Gemini mode: Single request with `n` parameter, updates all placeholders
- Updates placeholders as responses arrive with actual image dimensions
- Graceful degradation: Deletes failed placeholders, shows partial success toast

**Prompt History Tracking:**
- Each GeneratedImageShape stores `promptHistory: string[]`
- When editing, combines histories from all selected images
- Uses longest history as base (most complete lineage)
- New prompt appended to history for iterative workflows

**Image Selection Flow:**
- Select 2+ images → numbered badges appear (1, 2, 3...)
- Selection tracked in `selectionIdMap: Map<TLShapeId, number>`
- Edit mode extracts base64 data from selected shapes
- Position calculation uses bounding box of all selected images

### Storage & Credentials

**IndexedDB** (`components/canvas/HistoryModal.tsx`):
- Database: `ImageGenerationDB`, Store: `history`
- Stores: images (base64), prompts, model, mode, timestamp
- Auto-cleanup: Keeps last 50 items
- Schema: `HistoryItem` interface

**Credentials** (localStorage):
- LiteLLM mode: `litellm_api_key`, `litellm_proxy_url`
- Gemini mode: `gemini_api_key`, `api_mode` = 'gemini'
- Settings persistence: Model, aspect ratio, image size, num images saved to localStorage
- Never sent to any server except user-specified proxy/endpoint
- Retrieved via `getApiCredentials()` helper in cascade/page.tsx

### Model Configuration

Models defined in `lib/models.ts`:
- `vertex_ai/gemini-2.5-flash-image` (default)
- `vertex_ai/gemini-2.0-flash-preview-image-generation`
- Each model specifies: aspectRatios, imageSizes, maxImages

### Styling System
- Tailwind CSS v4 with CSS variables for theming
- Dark mode: next-themes with `.dark` class, synced to tldraw colorScheme
- Motion.dev: Spring animations (`stiffness: 400, damping: 35`)
- Carbon icons instead of Lucide (e.g., `<Time />`, `<Settings />`)

### Path Aliases
- `@/*` → root directory (tsconfig.json)

### Storybook Integration
- Stories in `/stories` directory
- Components documented: FloatingToolbar, SelectionBadges, etc.
- Vitest integration for component testing
- Run with `npm run storybook`

## Development Guidelines

### Adding New Models
1. Update `lib/models.ts` with model configuration
2. Specify supported aspect ratios and image sizes
3. Set `maxImages` limit for multi-image edit mode
4. Model names must match LiteLLM/Gemini API format (e.g., `vertex_ai/gemini-*`)

### Working with tldraw
- Always use dynamic imports with `{ ssr: false }` for tldraw components
- Load tldraw utilities client-side only (`typeof window !== 'undefined'`)
- Custom shapes must extend `BaseBoxShapeUtil` and define props with `T` validators
- Use `editor.updateShape()` to modify shape props, never mutate directly
- Shape IDs are typed as `TLShapeId`, use `createShapeId()` to generate

### Canvas Operations
- Position calculations must account for `TOOLBAR_HEIGHT_PX` (220px)
- Use `focusAndCenterShapes()` for smart viewport panning (maintains zoom)
- Loading placeholders store `sourceImageData` for regeneration blur effect
- Extract images with `extractImageDataFromShapes()` - handles both custom and native tldraw image shapes

### State Management
- Use `useCallback` for editor event handlers to prevent infinite loops
- Track selection with `Map<TLShapeId, number>` for numbered badges
- Reuse `EMPTY_MAP` constant instead of creating new empty maps
- Check `helpersLoaded` flag before canvas operations

### Error Handling
- User-facing errors (credentials, settings) show toast with action button
- Network errors detect JetBrains VPN for custom messaging
- Log unexpected errors to console with stack traces
- Partial success: Delete failed placeholders, show warning toast

### Performance Optimizations
- Motion.dev: Use `willChange` and `transform: translateZ(0)` for GPU acceleration
- Loading animation: `contain: layout style paint` for render optimization
- `hasAnimated` flag prevents re-triggering expensive animations
- IndexedDB auto-cleanup keeps last 50 items to prevent storage bloat
