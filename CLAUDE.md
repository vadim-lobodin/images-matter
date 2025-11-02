# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Image Playground - A Next.js 16 application for generating and editing images using Google Gemini AI models through LiteLLM proxy. Features an infinite canvas powered by tldraw for image manipulation and composition.

## Common Commands

### Development
```bash
npm run dev               # Start development server (http://localhost:3000/playground)
npm run build             # Build for production
npm run start             # Start production server
npm run lint              # Run ESLint
npm run storybook         # Start Storybook on port 6006
npm run build-storybook   # Build Storybook for deployment
```

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 16.0.1 with App Router and Turbopack
- **React**: 19.2.0 with TypeScript 5.x (strict mode)
- **Canvas**: tldraw 4.1.2 - infinite canvas with custom shape utilities
- **Styling**: Tailwind CSS v4, Motion.dev for animations, Carbon icons
- **AI Integration**: LiteLLM proxy client for Gemini API (vertex_ai/gemini-2.5-flash-image)
- **Storage**: IndexedDB for generation history (browser-side persistence)
- **UI Components**: Radix UI primitives, Vaul drawer, shadcn/ui patterns

### High-Level Application Flow

1. **Canvas System** (`/app/playground/page.tsx`)
   - Orchestrates the entire image generation workflow
   - Manages editor state, selected images, and API credentials
   - Dynamically imports tldraw and canvas helpers to avoid SSR issues
   - Loads canvas helpers only on client-side after mount

2. **Image Generation Modes**
   - **Generate Mode**: Creates new images from text prompts
   - **Edit Mode**: Modifies existing images (up to 4 input images) with AI guidance
   - Both modes use the same LiteLLM proxy endpoint (`/v1/chat/completions`)

3. **Canvas Positioning Intelligence** (`lib/canvas/canvasHelpers.ts`)
   - **Constants**: `TOOLBAR_HEIGHT_PX = 220`, `SHAPE_SPACING = 100`, `SHAPE_PADDING = 50`
   - `findEmptySpace()`: Grid-based collision detection for new image placement
   - `getPositionNearSelection()`: Places edited images near source images with overlap avoidance
   - `hasOverlap()`: Rectangle collision detection with padding
   - All positioning accounts for viewport bounds, zoom level, and toolbar height

4. **Custom tldraw Shape** (`lib/canvas/ImageShape.tsx`)
   - `GeneratedImageShape`: Custom shape type extending `TLBaseShape`
   - Stores metadata: prompt, model, timestamp, aspectRatio, resolution, promptHistory
   - `promptHistory`: Array of all prompts used to create the image (for iterative editing)
   - `isLoading` state: Shows spinner during generation
   - Motion.dev animations: Scale-in effect on initial load

5. **LiteLLM Integration** (`lib/litellm-client.ts`)
   - `generateGeminiImage()`: Generate mode API wrapper
   - `editGeminiImage()`: Edit mode with multi-image support and prompt history
   - Handles base64 image encoding, aspect ratio, resolution parameters
   - Error handling for VPN, network, and credential issues

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
- Spawns parallel API requests (1 per numImages)
- Updates placeholders as responses arrive
- Graceful degradation: Deletes placeholders on failure, shows partial success

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
- Keys: `litellm_api_key`, `litellm_proxy_url`
- Never sent to any server except user-specified proxy
- Retrieved via `getApiCredentials()` helper

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
