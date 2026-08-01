# Image Playground

A browser-based canvas for generating and editing images with Google Gemini. It supports direct Gemini API access and Gemini models routed through a LiteLLM proxy.

## Features

- Generate one to four images from a prompt.
- Edit selected or uploaded images with multi-image context.
- Arrange results on an infinite tldraw canvas.
- Choose model-specific aspect ratios and resolutions.
- Reuse locally stored generation history.
- Keep API credentials in browser storage rather than on the application server.

## Technology

- Next.js 16 and React 19
- TypeScript 6
- tldraw 5
- Tailwind CSS 4
- Motion animations
- Storybook 10
- IndexedDB history storage

## Requirements

- Node.js 22.12 or newer
- npm 11
- Either a Google Gemini API key or access to a LiteLLM proxy configured for Gemini image models

## Run locally

```bash
npm ci
npm run dev
```

Open [http://localhost:3000/cascade](http://localhost:3000/cascade), open Settings, and configure one of the API modes:

- **Google Gemini API:** enter a key from Google AI Studio.
- **LiteLLM proxy:** enter the proxy URL and its API key.

Credentials and playground preferences are stored in `localStorage`. Generated-image history is stored in IndexedDB.

## Commands

```bash
npm run dev              # Start the development server
npm run lint             # Run ESLint and TypeScript checks
npm run build            # Create the production application build
npm run storybook        # Start Storybook on port 6006
npm run build-storybook  # Create the static Storybook build
```

## Project structure

```text
app/
├── cascade/page.tsx              Image-generation workflow and canvas UI
├── cascade/layout.tsx            Route metadata
├── layout.tsx                    Theme, analytics, and toast providers
└── page.tsx                      Root portfolio page

components/
├── canvas/                       Canvas, toolbar, history, and selection overlays
├── cascade/                      Prompt, model, parameter, and API settings UI
├── providers/                    Application providers
└── ui/sonner.tsx                 Toast presentation

lib/
├── canvas/ImageShape.tsx         Custom generated-image tldraw shape
├── canvas/canvasHelpers.ts       Placement, upload, and export operations
├── gemini-direct-client.ts       Direct Gemini REST client
├── litellm-client.ts             LiteLLM chat-completions client
├── image-api.ts                  Shared image response parsing
├── history-store.ts              IndexedDB history persistence
└── models.ts                     Supported models and capabilities
```

The tldraw component and canvas helpers are loaded on demand so the main route does not server-render browser-only canvas code. LiteLLM generation runs one request per output image; direct Gemini generation batches internally.

## Data and security

- The application has no server-side credential store.
- API keys are sent only to the selected Gemini endpoint or configured LiteLLM proxy.
- History is capped at the latest 50 entries.
- Clearing browser site data removes credentials, settings, canvas persistence, and history.

## Validation

Before submitting changes, run:

```bash
npm ci
npm run lint
npm run build
npm run build-storybook
npm audit
```
