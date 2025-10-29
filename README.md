# Image Playground

A Next.js application for generating and editing images using Google Gemini AI models through LiteLLM proxy.

## Features

- 🎨 **Generate Images**: Create images from text prompts using Gemini 2.5 Flash Image
- ✏️ **Edit Images**: Modify existing images with AI guidance (supports up to 4 input images)
- ⚙️ **Flexible Configuration**: Configure aspect ratios (1:1, 3:4, 4:3, 9:16, 16:9) and resolution (1K, 2K)
- 🔐 **User-Provided Credentials**: Bring your own LiteLLM proxy and API key
- 💾 **Generation History**: Track your creations with IndexedDB-based storage
- 🔄 **Reuse Images**: Use generated images as input for editing

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

### Generate Mode

1. Select a model (default: Gemini 2.5 Flash Image)
2. Enter a text prompt describing the image you want
3. Configure aspect ratio and image size
4. Click **Generate**

### Edit Mode

1. Switch to the **Edit** tab
2. Upload up to 4 input images
3. Enter a prompt describing how you want to modify the images
4. Configure output settings
5. Click **Edit**

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

- **Frontend**: React components in \`app/\` and \`components/\`
- **API Routes**: \`/api/images/generate\` and \`/api/images/edit\`
- **LiteLLM Client**: \`lib/litellm-client.ts\` - handles API communication
- **Storage**: IndexedDB via \`components/playground/GenerationHistory.tsx\`

## Security

- API credentials are stored only in browser localStorage
- No server-side credential storage (unless you set env vars)
- Credentials are only sent to the LiteLLM proxy URL you specify
- Clear browser data to remove stored credentials

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
