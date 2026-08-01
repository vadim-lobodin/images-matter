// Gemini image generation through LiteLLM proxy using chat/completions
import { getApiErrorMessage, type ImageApiResponse } from './image-api'
import {
  composeEditTargetImageLabel,
  composeGenerationPrompt,
  composeRecipeReferenceImageLabel,
  RECIPE_REFERENCE_END_LABEL,
} from './recipe-prompt'
import type { RecipeReference } from './recipes'

export interface GeminiImageRequest {
  model: string;
  prompt: string;
  aspectRatio?: string;
  imageSize?: string;
  numImages?: number;
  apiKey: string;
  baseURL: string;
  recipe?: RecipeReference;
}

export interface GeminiImageEditRequest {
  model: string;
  prompt: string;
  images: string[]; // array of base64 data URLs
  imageIds?: number[]; // optional array of IDs corresponding to images (e.g., [1, 2, 3])
  promptHistory?: string[]; // optional array of previous prompts used to create the source images
  aspectRatio?: string;
  imageSize?: string;
  numImages?: number;
  apiKey: string;
  baseURL: string;
  recipe?: RecipeReference;
}

export type GeminiImageResponse = ImageApiResponse

interface LiteLLMContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

// Shared function to make API request to LiteLLM proxy
async function makeLiteLLMRequest(
  apiKey: string,
  baseURL: string,
  requestBody: Record<string, unknown>
): Promise<GeminiImageResponse> {
  if (!apiKey || !baseURL) {
    throw new Error(
      "API credentials not configured. Please configure your LiteLLM API key and proxy URL in Settings."
    );
  }

  // Clean URL and prepare endpoint
  const cleanBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  const url = `${cleanBaseURL}/v1/chat/completions`;

  // Make network request
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    console.error('Network error:', error);

    // Check if using JetBrains proxy
    const isJetBrainsProxy = baseURL.includes('jb.gg') || baseURL.includes('jetbrains');

    if (isJetBrainsProxy) {
      throw new Error(
        "Network Connection Failed\n\n" +
        "Cannot reach LiteLLM proxy. Most likely you are NOT connected to JetBrains VPN.\n\n" +
        "Please:\n" +
        "1. Connect to JetBrains Team VPN\n" +
        "2. Verify proxy URL in Settings\n" +
        "3. Check your network connection"
      );
    } else {
      throw new Error(
        "Network Connection Failed\n\n" +
        "Cannot reach the API endpoint.\n\n" +
        "Please:\n" +
        "1. Verify your API URL in Settings\n" +
        "2. Check your network connection\n" +
        "3. Ensure your API key is valid"
      );
    }
  }

  // Handle error responses
  if (!response.ok) {
    let errorData: unknown = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // Failed to parse JSON, use default error
      console.error('Failed to parse error response:', e);
    }

    // Extract error message from various possible locations in the response
    const apiErrorMessage = getApiErrorMessage(errorData)
    let errorMessage = apiErrorMessage || `API error: ${response.status} ${response.statusText}`;

    // Provide user-friendly messages for common errors
    if (response.status === 401 || response.status === 403) {
      errorMessage = "Authentication Failed\n\nYour API key is invalid or expired.\n\nPlease check your API key in Settings.";
    } else if (response.status === 404) {
      errorMessage = apiErrorMessage
        ? `Endpoint or Model Not Found\n\n${apiErrorMessage}`
        : "Endpoint Not Found\n\nThe API endpoint or model may not be available.\n\nPlease check your proxy URL in Settings.";
    } else if (response.status === 429) {
      errorMessage = "Rate Limit Exceeded\n\nToo many requests. Please try again in a few moments.";
    } else if (response.status === 400) {
      // For 400 errors, use the specific error message from the API
      if (apiErrorMessage) {
        errorMessage = `Bad Request\n\n${apiErrorMessage}`;
      } else {
        errorMessage = "Bad Request\n\nThe request was invalid. Please check your settings and try again.";
      }
    } else if (response.status >= 500) {
      errorMessage = "Server Error\n\nThe API server encountered an error. Please try again later.";
    }

    throw new Error(errorMessage);
  }

  // Parse and return success response
  const result = await response.json();
  return result as GeminiImageResponse;
}

// Helper function to build request body with common parameters
function buildRequestBody(
  model: string,
  content: string | LiteLLMContentPart[],
  numImages: number,
  aspectRatio?: string,
  imageSize?: string
): Record<string, unknown> {
  const requestBody: Record<string, unknown> = {
    model,
    messages: [
      {
        role: "user",
        content,
      },
    ],
    modalities: ["image", "text"],
    n: numImages,
  };

  // Gemini 3 image models are available on Vertex AI through the global endpoint.
  if (model === "vertex_ai/gemini-3-pro-image" || model === "vertex_ai/gemini-3.1-flash-image") {
    requestBody.vertex_location = "global";
  }

  // Build image config for image parameters
  // Use top-level image_config with snake_case keys (supported since LiteLLM v1.80.7)
  if (aspectRatio || imageSize) {
    const imageConfig: Record<string, string> = {};
    if (aspectRatio) {
      imageConfig.aspect_ratio = aspectRatio;
    }
    if (imageSize) {
      imageConfig.image_size = imageSize;
    }
    requestBody.image_config = imageConfig;
  }

  return requestBody;
}

export async function generateGeminiImage(
  request: GeminiImageRequest
): Promise<GeminiImageResponse> {
  const { apiKey, baseURL, model, prompt, aspectRatio, imageSize, numImages = 1, recipe } = request;

  const enhancedPrompt = composeGenerationPrompt({ prompt, recipe })
  const content: string | LiteLLMContentPart[] = recipe?.imageData
    ? [
        { type: 'text', text: enhancedPrompt },
        { type: 'text', text: composeRecipeReferenceImageLabel(1) },
        { type: 'image_url', image_url: { url: recipe.imageData } },
        { type: 'text', text: RECIPE_REFERENCE_END_LABEL },
      ]
    : enhancedPrompt
  const requestBody = buildRequestBody(model, content, numImages, aspectRatio, imageSize);

  return makeLiteLLMRequest(apiKey, baseURL, requestBody);
}

export async function editGeminiImage(
  request: GeminiImageEditRequest
): Promise<GeminiImageResponse> {
  const { apiKey, baseURL, model, prompt, images, imageIds, promptHistory, aspectRatio, imageSize, numImages = 1, recipe } = request;

  const enhancedPrompt = composeGenerationPrompt({
    prompt,
    promptHistory,
    sourceImageIds: imageIds,
    sourceImageCount: images.length,
    recipe,
  })

  // Build multimodal content array with text and images
  const content: LiteLLMContentPart[] = [
    {
      type: "text",
      text: enhancedPrompt,
    },
    ...images.flatMap((imageUrl, index): LiteLLMContentPart[] => [
      {
        type: 'text',
        text: composeEditTargetImageLabel(imageIds?.[index] ?? index + 1),
      },
      {
        type: 'image_url',
        image_url: {
          url: imageUrl,
        },
      },
    ]),
    ...(recipe?.imageData
      ? [
          {
            type: 'text' as const,
            text: composeRecipeReferenceImageLabel(images.length + 1),
          },
          { type: 'image_url' as const, image_url: { url: recipe.imageData } },
          { type: 'text' as const, text: RECIPE_REFERENCE_END_LABEL },
        ]
      : []),
  ];

  const requestBody = buildRequestBody(model, content, numImages, aspectRatio, imageSize);

  return makeLiteLLMRequest(apiKey, baseURL, requestBody);
}
