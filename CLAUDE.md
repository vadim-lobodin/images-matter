# Repository guide

## Overview

Image Playground is a Next.js 16 application at `/cascade` for generating and editing images with Google Gemini. It supports direct Gemini API calls and a user-configured LiteLLM proxy. Generated images live on a persistent tldraw 5 canvas.

## Commands

```bash
npm run dev
npm run lint
npm run type-check
npm run build
npm run storybook
npm run build-storybook
```

Use npm and `package-lock.json`; do not introduce a second lockfile.

## Architecture

- `app/cascade/page.tsx` coordinates settings, selection, generation, uploads, and history.
- `components/canvas/TldrawCanvas.tsx` is dynamically imported with SSR disabled.
- `lib/canvas/canvasHelpers.ts` is imported on demand for browser-only canvas operations.
- `lib/canvas/ImageShape.tsx` defines the `generated-image` tldraw shape and its schema augmentation.
- `lib/image-api.ts` owns the shared image response boundary.
- `lib/gemini-direct-client.ts` calls Google Gemini directly.
- `lib/litellm-client.ts` calls a LiteLLM `chat/completions` endpoint.
- `lib/history-store.ts` owns IndexedDB persistence and caps history at 50 items.
- `lib/recipe-store.ts` owns browser-local recipe persistence; original recipe images and UI-only thumbnails are prepared by `lib/recipe-image.ts`.
- `lib/recipe-prompt.ts` labels canvas images as edit targets and recipe images as reference-only inputs.
- `lib/models.ts` is the source of truth for model capabilities and API modes.

## Browser storage

- `api_mode`: `gemini` or `litellm`
- `gemini_api_key`: direct Google credential
- `litellm_api_key`, `litellm_proxy_url`: proxy credentials
- `playground_model`, `playground_aspectRatio`, `playground_imageSize`, `playground_numImages`: UI preferences
- IndexedDB database `ImageGenerationDB`, store `history`: generation history
- IndexedDB database `ImageRecipeDB`, store `recipes`: reusable prompt/image recipes
- tldraw persistence key `image-playground-canvas`: canvas state

Never move credentials into application logs or server storage.

## Development conventions

- Keep tldraw UI browser-only and preserve the dynamic import boundary.
- Use `TLShapeId`, `Editor`, and custom shape types instead of `any` casts.
- Custom shapes must augment `TLGlobalShapePropsMap`, define validators, and implement `getIndicatorPath`.
- Treat native tldraw image shapes and custom generated-image shapes as distinct union members.
- Keep API payload parsing at a typed boundary; network JSON starts as `unknown`.
- Derive render state where possible instead of synchronously setting state inside effects.
- Keep Storybook output ignored by both Git and ESLint.
- Add a direct dependency only when source or configuration imports it.

## Generation flow

1. Create loading placeholders near the current selection or in empty viewport space.
2. Extract selected images as data URLs when editing.
3. Load the selected API client only when generation starts.
4. Update placeholders as images load and delete failed placeholders.
5. Save successful results to IndexedDB history.

LiteLLM mode uses parallel single-image requests. Direct Gemini mode handles batching inside the client.

## Verification

Run lint, the production Next.js build, the static Storybook build, and `npm audit`. Smoke-test `/cascade`, settings, upload/drop, selection badges, history, and persisted canvas restoration after canvas-related changes.
