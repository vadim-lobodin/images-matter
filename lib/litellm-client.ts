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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestBody: any
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
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // Failed to parse JSON, use default error
      console.error('Failed to parse error response:', e);
    }

    // Extract error message from various possible locations in the response
    let errorMessage =
      errorData.error?.message ||
      errorData.message ||
      errorData.detail ||
      `API error: ${response.status} ${response.statusText}`;

    // Provide user-friendly messages for common errors
    if (response.status === 401 || response.status === 403) {
      errorMessage = "Authentication Failed\n\nYour API key is invalid or expired.\n\nPlease check your API key in Settings.";
    } else if (response.status === 404) {
      errorMessage = "Endpoint Not Found\n\nThe API endpoint or model may not be available.\n\nPlease check your proxy URL in Settings.";
    } else if (response.status === 429) {
      errorMessage = "Rate Limit Exceeded\n\nToo many requests. Please try again in a few moments.";
    } else if (response.status === 400) {
      // For 400 errors, use the specific error message from the API
      if (errorData.error?.message) {
        errorMessage = `Bad Request\n\n${errorData.error.message}`;
      } else if (errorData.message) {
        errorMessage = `Bad Request\n\n${errorData.message}`;
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
  return result;
}

// Helper function to build request body with common parameters
function buildRequestBody(
  model: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: string | any[],
  numImages: number,
  aspectRatio?: string,
  imageSize?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Build generation config for Vertex AI image parameters
  // Using the exact format from Vertex AI documentation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generationConfig: any = {};

  if (aspectRatio) {
    generationConfig.aspect_ratio = aspectRatio;
  }

  if (imageSize) {
    // Convert "1K" to 1024, "2K" to 2048 for imageSize parameter
    const sizeMap: { [key: string]: number } = {
      '1K': 1024,
      '2K': 2048
    };
    if (sizeMap[imageSize]) {
      generationConfig.image_size = sizeMap[imageSize];
    }
  }

  // Add generation config if we have parameters
  // Try both naming conventions for better compatibility
  if (Object.keys(generationConfig).length > 0) {
    requestBody.generationConfig = generationConfig;
    requestBody.generation_config = generationConfig;
  }

  return requestBody;
}

export async function generateGeminiImage(
  request: GeminiImageRequest
): Promise<GeminiImageResponse> {
  const { apiKey, baseURL, model, prompt, aspectRatio, imageSize, numImages = 1 } = request;

  const requestBody = buildRequestBody(model, prompt, numImages, aspectRatio, imageSize);

  return makeLiteLLMRequest(apiKey, baseURL, requestBody);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  return makeLiteLLMRequest(apiKey, baseURL, requestBody);
}
