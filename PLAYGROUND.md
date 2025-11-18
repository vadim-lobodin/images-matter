# Image Playground - LiteLLM Integration

A comprehensive image generation and editing playground built with Next.js that integrates with LiteLLM proxy to access multiple AI image models.

## Features

### Three Modes of Operation

1. **Generate** - Text-to-image generation
   - Supports DALL-E 3, DALL-E 2, Vertex AI Imagen, and Stable Diffusion XL
   - Configurable parameters: size, quality (DALL-E 3), style (DALL-E 3)
   - Generate multiple images at once (model-dependent)

2. **Edit** - Image inpainting with mask
   - Upload an image
   - Draw a mask over areas to edit
   - Provide a prompt describing the desired changes
   - Currently supports DALL-E 2

3. **Variations** - Create variations of existing images
   - Upload an image
   - Generate artistic variations
   - Currently supports DALL-E 2

### Key Features

- **Model Selection**: Choose from multiple AI models
- **Parameter Controls**: Adjust size, quality, style, and number of images
- **Mask Drawing**: Interactive canvas for precise image editing
- **History**: Auto-saved generation history (localStorage)
- **Image Management**: Download or copy images to clipboard
- **Responsive Design**: Works on desktop and mobile devices

## Setup

### 1. Configure Environment Variables

Edit `.env.local` with your LiteLLM proxy details:

```bash
LITELLM_PROXY_URL=http://0.0.0.0:4000
LITELLM_API_KEY=your_api_key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Access the Playground

Navigate to `http://localhost:3000/playground`

## Supported Models

### DALL-E 3 (OpenAI)
- **Sizes**: 1024x1024, 1792x1024, 1024x1792
- **Quality**: standard, hd
- **Style**: vivid, natural
- **Max Images**: 1
- **Modes**: Generate only

### DALL-E 2 (OpenAI)
- **Sizes**: 256x256, 512x512, 1024x1024
- **Max Images**: 10
- **Modes**: Generate, Edit, Variations

### Vertex AI Imagen (Google Cloud)
- **Model**: `vertex_ai/imagegeneration@006`
- **Sizes**: 1024x1024
- **Max Images**: 1
- **Modes**: Generate only

### Stable Diffusion XL (AWS Bedrock)
- **Model**: `bedrock/stability.stable-diffusion-xl-v0`
- **Sizes**: 1024x1024
- **Max Images**: 1
- **Modes**: Generate only

## User Interface

### Floating Toolbar

The main interface is a sleek floating toolbar positioned at the bottom center of the screen with the following components:

#### Prompt Input
- **Multi-line text area** for entering detailed descriptions
- **Character limit**: 4000 characters
- **Smart placeholder**: Changes context based on mode (generate vs edit)
- **History navigation**: Use Arrow Up/Down to browse previous prompts

#### Control Buttons

| Button | Icon | Function | Notes |
|--------|------|----------|-------|
| **Upload** | ➕ | Add reference images for editing | Opens file picker (PNG, JPEG, WebP, GIF) |
| **Image Count** | 🖼️ # | Set number of images to generate | Cycles 1→2→3→4→1 |
| **Aspect Ratio** | 📄 | Toggle aspect ratio | 1:1, 3:4, 4:3, 9:16, 16:9 (disabled in edit mode) |
| **Resolution** | ↔️ | Switch image resolution | 1K (1024×1024) or 2K (2048×2048) |
| **Settings** | ⚙️ | Configure API credentials | Opens settings modal |
| **Submit** | ↑ | Generate or edit images | Also triggered by Enter key |

#### Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| **Enter** | Submit prompt | Generate or edit images |
| **Shift + Enter** | New line | Add line break in prompt |
| **Arrow Up** | Previous prompt | Navigate history (older) |
| **Arrow Down** | Next prompt | Navigate history (newer) |

### Canvas Workspace

The main workspace is an infinite canvas powered by tldraw where generated images appear as interactive objects.

**Canvas Interactions:**
- **Left-click + drag**: Move images
- **Left-click**: Select/deselect images
- **Multi-select**: Click multiple images for batch editing
- **Scroll wheel**: Zoom in/out
- **Middle-click + drag**: Pan the canvas

## Usage Examples

### Image Generation

1. Enter a detailed prompt in the text area
2. Set the number of images to generate (1-4)
3. Choose your preferred aspect ratio
4. Select resolution (1K or 2K)
5. Press **Enter** or click the **↑** button

**Example Prompts:**
```
A serene Japanese garden with a wooden bridge over a koi pond, 
cherry blossoms in full bloom, soft morning light filtering through the trees

A cyberpunk street market at night, neon signs reflected in wet pavement, 
vendors selling futuristic tech, rain falling, vibrant colors

Cozy library with floor-to-ceiling bookshelves, leather armchair by the fireplace, 
warm golden lighting, vintage globe, steaming cup of tea on side table
```

**Tips for Better Results:**
- Be specific about lighting, mood, and style
- Include details about composition and perspective
- Use descriptive adjectives for colors and textures
- Specify the time of day or weather conditions

### Image Editing

1. Select "Edit" mode
2. Choose DALL-E 2 model
3. Upload an image
4. Draw a mask over areas to edit (white areas will be regenerated)
5. Enter a prompt describing desired changes
6. Click "Edit Image"

### Image Variations

1. Select "Variations" mode
2. Choose DALL-E 2 model
3. Upload an image
4. Configure size and number of variations
5. Click "Create Variations"

## API Routes

### POST /api/images/generate
Generate images from text prompts.

**Body**:
```json
{
  "model": "dall-e-3",
  "prompt": "A serene landscape...",
  "size": "1024x1024",
  "quality": "hd",
  "style": "vivid",
  "n": 1
}
```

### POST /api/images/edit
Edit images using masks and prompts.

**Body** (FormData):
- `model`: string
- `prompt`: string
- `image`: File
- `mask`: File (optional)
- `size`: string
- `n`: number

### POST /api/images/variations
Create variations of an image.

**Body** (FormData):
- `model`: string
- `image`: File
- `size`: string
- `n`: number

## Architecture

```
/app
  /playground          # Main playground page
  /api/images
    /generate         # Generation API route
    /edit            # Editing API route
    /variations      # Variations API route
/components/playground
  ModelSelector.tsx        # Model selection dropdown
  PromptInput.tsx         # Prompt textarea with character count
  ParameterControls.tsx   # Size, quality, style controls
  ImageUploader.tsx       # Drag-drop image upload
  MaskCanvas.tsx          # Canvas for mask drawing
  ImageDisplay.tsx        # Image grid with download/copy
  GenerationHistory.tsx   # History gallery with localStorage
/lib
  litellm-client.ts       # OpenAI client configuration
```

## Tips

- **Prompts**: Be specific and descriptive for better results
- **DALL-E 3**: Use for highest quality generations with HD option
- **DALL-E 2**: Use for editing and variations capabilities
- **Masks**: Draw over areas you want to change in edit mode
- **History**: Click on historical images to restore settings

## Troubleshooting

### Error: Missing LiteLLM configuration
- Ensure `.env.local` exists with correct `LITELLM_PROXY_URL` and `LITELLM_API_KEY`

### Error: Failed to generate image
- Check LiteLLM proxy is running and accessible
- Verify API key has proper permissions
- Check model name is correct for your LiteLLM setup

### Images not loading
- Check browser console for CORS errors
- Ensure image URLs are accessible
- Try using `response_format: "b64_json"` if URL format fails

## Resources

- [LiteLLM Documentation](https://docs.litellm.ai/docs/image_generation)
- [OpenAI DALL-E Guide](https://platform.openai.com/docs/guides/images)
- [Next.js App Router](https://nextjs.org/docs/app)
