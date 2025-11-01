// Gemini image generation through LiteLLM proxy using chat/completions
export interface GeminiImageRequest {
  model: string;
  prompt: string;
  aspectRatio?: string;
  imageSize?: string;
  numImages?: number;
  apiKey: string;
  baseURL: string;
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
}

export interface GeminiImageResponse {
  choices: Array<{
    message: {
      content?: string;
      images?: string[]; // data URLs with base64 images
    };
  }>;
}

// Shared function to make API request to LiteLLM proxy
async function makeLiteLLMRequest(
  apiKey: string,
  baseURL: string,
  requestBody: any,
  debugLabel: string = 'LiteLLM'
): Promise<GeminiImageResponse> {
  if (!apiKey || !baseURL) {
    throw new Error(
      "API credentials not configured. Please configure your LiteLLM API key and proxy URL in Settings."
    );
  }

  // Clean URL and prepare endpoint
  const cleanBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  const url = `${cleanBaseURL}/v1/chat/completions`;

  console.log(`Calling ${debugLabel}:`, url);
  console.log('Request body:', JSON.stringify(requestBody, null, 2));

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
    throw new Error(
      "❌ Network Connection Failed\n\n" +
      "Cannot reach LiteLLM proxy. Most likely you are NOT connected to JetBrains VPN.\n\n" +
      "Please:\n" +
      "1. Connect to JetBrains Team VPN\n" +
      "2. Verify proxy URL in Settings\n" +
      "3. Check your network connection"
    );
  }

  // Handle error responses
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.log('Error response:', errorData);

    let errorMessage = errorData.error?.message || `API error: ${response.status} ${response.statusText}`;

    if (response.status === 401 || response.status === 403) {
      errorMessage = "Authentication failed. Please check your API key in Settings.";
    } else if (response.status === 404) {
      errorMessage = "API endpoint not found. Please check your proxy URL in Settings or verify the model is available.";
    } else if (response.status === 429) {
      errorMessage = "Rate limit exceeded. Please try again later.";
    } else if (response.status === 400 && errorData.error?.message) {
      errorMessage = errorData.error.message;
    } else if (response.status >= 500) {
      errorMessage = "Server error. Please try again later or contact support.";
    }

    throw new Error(errorMessage);
  }

  // Parse and return success response
  const result = await response.json();
  console.log('Success response:', JSON.stringify(result, null, 2));
  return result;
}

// Helper function to build request body with common parameters
function buildRequestBody(
  model: string,
  content: string | any[],
  numImages: number,
  aspectRatio?: string,
  imageSize?: string
): any {
  const requestBody: any = {
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

  if (aspectRatio) {
    requestBody.aspectRatio = aspectRatio;
  }

  if (imageSize) {
    requestBody.imageSize = imageSize;
  }

  return requestBody;
}

export async function generateGeminiImage(
  request: GeminiImageRequest
): Promise<GeminiImageResponse> {
  const { apiKey, baseURL, model, prompt, aspectRatio, imageSize, numImages = 1 } = request;

  const requestBody = buildRequestBody(model, prompt, numImages, aspectRatio, imageSize);

  return makeLiteLLMRequest(apiKey, baseURL, requestBody, 'LiteLLM Generate');
}

export async function editGeminiImage(
  request: GeminiImageEditRequest
): Promise<GeminiImageResponse> {
  const { apiKey, baseURL, model, prompt, images, imageIds, promptHistory, aspectRatio, imageSize, numImages = 1 } = request;

  // Build enhanced prompt with history context and image references
  let enhancedPrompt = '';

  // Add prompt history if available
  if (promptHistory && promptHistory.length > 0) {
    enhancedPrompt += '[Context - Previous editing iterations:]\n';
    promptHistory.forEach((prevPrompt, index) => {
      enhancedPrompt += `${index + 1}. "${prevPrompt}"\n`;
    });
    enhancedPrompt += '\n';
  }

  // Add current request
  enhancedPrompt += '[Current request:]\n';
  enhancedPrompt += prompt;

  // Add image ID references if provided
  if (imageIds && imageIds.length === images.length && imageIds.length > 0) {
    const imageRefs = imageIds.map(id => `Image ${id}`).join(', ');
    enhancedPrompt += `\n\n[Selected images: ${imageRefs}]`;
  }

  // Build multimodal content array with text and images
  const content: any[] = [
    {
      type: "text",
      text: enhancedPrompt,
    },
    ...images.map(imageUrl => ({
      type: "image_url",
      image_url: {
        url: imageUrl,
      },
    })),
  ];

  const requestBody = buildRequestBody(model, content, numImages, aspectRatio, imageSize);

  return makeLiteLLMRequest(apiKey, baseURL, requestBody, 'LiteLLM Edit');
}
