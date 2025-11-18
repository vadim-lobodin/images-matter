# Image Playground

A Next.js application for generating and editing images using Google Gemini AI models through LiteLLM proxy.

## Features

### 🎨 Image Generation & Editing
- **Text-to-Image**: Create stunning images from detailed text descriptions
- **Image Editing**: Modify existing images with AI guidance (up to 4 input images)
- **Batch Generation**: Generate 1-4 images simultaneously
- **Multi-Resolution**: Choose between 1K (1024×1024) and 2K (2048×2048)
- **Flexible Aspect Ratios**: 1:1, 3:4, 4:3, 9:16, 16:9

### 🖼️ Interactive Canvas
- **Infinite Canvas**: Powered by tldraw for smooth, intuitive interactions
- **Visual Organization**: Drag, arrange, and organize generated images
- **Multi-Selection**: Select multiple images for batch editing
- **Zoom & Pan**: Navigate large collections with ease

### ⌨️ Productivity Features
- **Keyboard Shortcuts**: Enter to submit, Shift+Enter for line breaks
- **Prompt History**: Navigate previous prompts with Arrow keys
- **Auto-Save**: All prompts automatically saved to local history
- **Smart Context**: Interface adapts based on generate vs edit mode

### 🔐 Privacy & Security
- **Client-Side Storage**: Credentials stored only in your browser
- **Your Own Proxy**: Connect to your LiteLLM proxy instance
- **No Data Collection**: All processing happens through your configured proxy
- **Local History**: Generation history stored in browser IndexedDB

### 💾 History & Management
- **Persistent Storage**: Track all your creations locally
- **Quick Restore**: Click history items to restore prompts and settings
- **Image Reuse**: Use generated images as input for further editing

## Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **UI**: React 19.2 with TypeScript
- **Styling**: Tailwind CSS v4
- **AI Integration**: LiteLLM proxy for Gemini API access
- **Storage**: IndexedDB for local history

## Getting Started

### Prerequisites

You need access to a **LiteLLM proxy** that can route requests to Google Gemini AI models. You have two options:

#### Option 1: Use an Existing LiteLLM Proxy

If you have access to an existing LiteLLM proxy (e.g., corporate proxy), you'll need:
- The proxy URL (e.g., `https://your-proxy.com`)
- An API key for authentication

#### Option 2: Set Up Your Own LiteLLM Proxy

1. Follow the [LiteLLM Proxy Quick Start Guide](https://docs.litellm.ai/docs/proxy/quick_start)
2. Configure it with your Google Vertex AI credentials
3. Deploy it to a cloud provider (Vercel, Railway, fly.io, etc.)

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/vadim-lobodin/images-matter.git
   cd images-matter
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. (Optional) Create a \`.env.local\` file for default credentials:
   \`\`\`env
   LITELLM_API_KEY=your_api_key
   LITELLM_PROXY_URL=https://your-proxy.com
   \`\`\`

   **Note**: Users can override these by configuring their own credentials in the Settings UI.

4. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

5. Open [http://localhost:3000/playground](http://localhost:3000/playground) in your browser

### Configuration

1. Click the **Settings** button in the top-right corner
2. Enter your LiteLLM proxy URL and API key
3. Click **Save Settings**
4. Start generating images!

Credentials are stored securely in your browser's localStorage and are never sent to any server except the proxy you specify.

## Usage

### Interface Overview

The application features a clean, floating toolbar at the bottom of the screen with:

**Prompt Input**
- Large text area for describing your image
- Supports multi-line prompts (Shift+Enter for new lines)
- Auto-saves to prompt history

**Toolbar Controls** (left to right)
- **+ Button**: Upload reference images for editing
- **Image Count** (🖼️ #): Cycle through 1-4 images to generate
- **Aspect Ratio** (📄): Toggle between 1:1, 3:4, 4:3, 9:16, 16:9
- **Resolution** (↔️): Switch between 1K and 2K image sizes
- **Settings** (⚙️): Configure API credentials
- **Generate/Edit** (↑): Submit prompt (also triggered by Enter key)

### Generate Mode

1. Enter a text prompt describing the image you want to create
2. Select the number of images to generate (1-4)
3. Choose your aspect ratio (disabled when editing selected images)
4. Choose resolution (1K or 2K)
5. Press **Enter** or click the arrow button to generate

**Example prompts:**
- "A serene mountain landscape at sunset with vibrant orange and purple skies"
- "A futuristic cityscape with flying cars and neon lights"
- "A cozy coffee shop interior with warm lighting and vintage furniture"

### Edit Mode

1. Select one or more generated images on the canvas
2. Click the **+ button** to upload reference images (optional)
3. Enter a prompt describing the changes you want
4. Configure the number of output images and resolution
5. Press **Enter** or click the arrow button to edit

**Note:** When images are selected, aspect ratio is locked to 1:1 for compatibility.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Enter** | Submit the prompt and generate/edit images |
| **Shift+Enter** | Insert a line break in the prompt |
| **Arrow Up** | Navigate to previous prompt in history |
| **Arrow Down** | Navigate to next prompt in history |

### Canvas Interactions

- **Click & Drag**: Move images around the canvas
- **Click**: Select/deselect images
- **Multi-select**: Click multiple images to select them for editing
- **Zoom**: Use mouse wheel or pinch gestures
- **Pan**: Click and drag on empty canvas space

### History

All generations are automatically saved to your browser's IndexedDB. Click on any history item to:
- View the generated images
- Restore the prompt and settings
- Use generated images as input for editing

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Deploy (no environment variables needed - users configure their own credentials)

### Other Platforms

This is a standard Next.js app and can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- fly.io
- AWS Amplify
- etc.

## Development

\`\`\`bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
\`\`\`

## Architecture

### Project Structure

\`\`\`
app/
├── cascade/
│   ├── page.tsx              # Main playground page
│   └── layout.tsx            # Cascade-specific layout
├── api/
│   └── cascade/
│       ├── generate/         # Image generation endpoint
│       └── gemini-direct/    # Direct Gemini API endpoint
├── globals.css               # Global styles
└── layout.tsx                # Root layout with theme provider

components/
├── canvas/
│   ├── TldrawCanvas.tsx      # Infinite canvas component
│   ├── FloatingToolbar.tsx   # Main UI toolbar (prompt + controls)
│   ├── HistoryModal.tsx      # Generation history viewer
│   └── SelectionBadges.tsx   # Selected image indicators
├── cascade/
│   ├── PromptInput.tsx       # Multi-line prompt input with shortcuts
│   ├── ApiSettings.tsx       # Settings modal for API configuration
│   └── ModelSelector.tsx     # Model selection dropdown
└── ui/                       # Reusable UI components (buttons, etc.)

lib/
├── canvas/
│   ├── ImageShape.tsx        # Custom tldraw shape for images
│   └── canvasHelpers.ts      # Canvas utility functions
├── gemini-direct-client.ts   # Direct Gemini API client
├── litellm-client.ts         # LiteLLM proxy client
└── models.ts                 # Model configuration & types
\`\`\`

### Data Flow

1. **User Input** → \`FloatingToolbar\` receives prompt and parameters
2. **Submission** → \`page.tsx\` handles generation logic
3. **API Call** → Either LiteLLM proxy or direct Gemini API
4. **Response** → Images rendered on \`TldrawCanvas\` as custom shapes
5. **Storage** → Generation metadata saved to IndexedDB
6. **History** → Accessible via \`HistoryModal\`

### Key Technologies

- **Next.js 15**: App Router with React Server Components
- **React 19**: Latest features including concurrent rendering
- **tldraw**: Infinite canvas library for image manipulation
- **Motion**: Framer Motion for smooth animations
- **IndexedDB**: Client-side database for history
- **Tailwind CSS v4**: Utility-first styling
- **TypeScript**: Full type safety throughout

## Security

- API credentials are stored only in browser localStorage
- No server-side credential storage (unless you set env vars)
- Credentials are only sent to the LiteLLM proxy URL you specify
- Clear browser data to remove stored credentials

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
