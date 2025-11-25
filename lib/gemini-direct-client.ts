// Direct Google Gemini API client for image generation
// Based on https://ai.google.dev/gemini-api/docs/image-generation

export interface GeminiImageRequest {
  model: string;
  prompt: string;
  aspectRatio?: string;
  imageSize?: string; // Ignored by Gemini API (always 1024px base)
  numImages?: number;
  apiKey: string;
}

export interface GeminiImageEditRequest {
  model: string;
  prompt: string;
  images: string[]; // array of base64 data URLs
  imageIds?: number[];
  promptHistory?: string[];
  aspectRatio?: string;
  imageSize?: string; // Ignored by Gemini API
  numImages?: number;
  apiKey: string;
}

export interface GeminiImageResponse {
  choices: Array<{
    message: {
      content?: string;
      images?: string[];
    };
  }>;
}

// Strip data URL prefix and extract base64 + mime type
function stripDataUrlPrefix(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  // Assume PNG if no prefix found
  return { mimeType: "image/png", data: dataUrl };
}

// Build request body for Gemini API
function buildGeminiRequest(
  prompt: string,
  images: string[] | undefined,
  aspectRatio: string | undefined,
  imageSize: string | undefined,
  promptHistory: string[] | undefined,
  imageIds: number[] | undefined,
  modelName: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  // Build enhanced prompt with history context (similar to LiteLLM client)
  let enhancedPrompt = '';

  if (promptHistory && promptHistory.length > 0) {
    enhancedPrompt += '[Context - Previous editing iterations:]\n';
    promptHistory.forEach((prevPrompt, index) => {
      enhancedPrompt += `${index + 1}. "${prevPrompt}"\n`;
    });
    enhancedPrompt += '\n';
  }

  enhancedPrompt += '[Current request:]\n';
  enhancedPrompt += prompt;

  if (imageIds && imageIds.length > 0 && images && imageIds.length === images.length) {
    const imageRefs = imageIds.map(id => `Image ${id}`).join(', ');
    enhancedPrompt += `\n\n[Selected images: ${imageRefs}]`;
  }

  // Build parts array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [{ text: enhancedPrompt }];

  // Add images if provided (for editing)
  if (images && images.length > 0) {
    for (const imageUrl of images) {
      const { mimeType, data } = stripDataUrlPrefix(imageUrl);
      parts.push({
        inlineData: {
          mimeType,
          data, // Base64 without data URL prefix
        },
      });
    }
  }

  // Build generation config
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generationConfig: any = {
    responseModalities: ["Text", "Image"],
  };

  // Build image config with aspect ratio and size
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageConfig: any = {};

  if (aspectRatio) {
    imageConfig.aspectRatio = aspectRatio;
  }

  // image_size parameter only supported by Gemini 3
  // Gemini 2.x ignores this and uses default 1024px
  const isGemini3 = modelName.includes('gemini-3');
  if (imageSize && isGemini3) {
    imageConfig.image_size = imageSize;
  }

  if (Object.keys(imageConfig).length > 0) {
    generationConfig.imageConfig = imageConfig;
  }

  return {
    contents: [
      {
        parts,
      },
    ],
    generationConfig,
  };
}

// Convert Gemini API response to LiteLLM format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertGeminiResponse(geminiResponse: any): GeminiImageResponse {
  const images: string[] = [];
  let textContent = '';

  // Extract images and text from response
  const candidates = geminiResponse.candidates || [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        // Reconstruct data URL with prefix
        const { mimeType, data } = part.inlineData;
        images.push(`data:${mimeType};base64,${data}`);
      }
      if (part.text) {
        textContent += part.text;
      }
    }
  }

  return {
    choices: [
      {
        message: {
          content: textContent || undefined,
          images: images.length > 0 ? images : undefined,
        },
      },
    ],
  };
}

// Make a single API request to Gemini
async function makeSingleGeminiRequest(
  model: string,
  prompt: string,
  apiKey: string,
  images: string[] | undefined,
  aspectRatio: string | undefined,
  imageSize: string | undefined,
  promptHistory: string[] | undefined,
  imageIds: number[] | undefined
): Promise<GeminiImageResponse> {
  if (!apiKey) {
    throw new Error(
      "API key not configured. Please configure your Google API key in Settings."
    );
  }

  // Extract model name (remove vertex_ai/ prefix if present)
  const modelName = model.replace(/^vertex_ai\//, '');

  // Build endpoint URL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  // Build request body
  const requestBody = buildGeminiRequest(prompt, images, aspectRatio, imageSize, promptHistory, imageIds, modelName);

  // Make network request
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    console.error('Network error:', error);
    throw new Error(
      "Network Connection Failed\n\n" +
      "Cannot reach Google Gemini API.\n\n" +
      "Please:\n" +
      "1. Check your network connection\n" +
      "2. Verify your API key in Settings\n" +
      "3. Ensure the API is accessible from your location"
    );
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
      errorMessage = "Authentication Failed\n\nYour Google API key is invalid or expired.\n\nPlease check your API key in Settings.";
    } else if (response.status === 404) {
      errorMessage = "Model Not Found\n\nThe model may not be available or accessible with your API key.";
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
      // For 500 errors, include the actual error message if available
      const serverError = errorData.error?.message || errorData.message || '';
      errorMessage = serverError
        ? `Server Error (${response.status})\n\n${serverError}`
        : `Server Error (${response.status})\n\nThe API server encountered an error. Please try again later.`;
    }

    console.error('Gemini API error:', response.status, errorData);
    throw new Error(errorMessage);
  }

  // Parse and return success response
  const result = await response.json();
  return convertGeminiResponse(result);
}

// Generate images using direct Gemini API (single image per request)
export async function generateGeminiImage(
  request: GeminiImageRequest
): Promise<GeminiImageResponse> {
  const { apiKey, model, prompt, aspectRatio, imageSize, numImages = 1 } = request;

  if (numImages === 1) {
    // Single image - simple request
    return makeSingleGeminiRequest(model, prompt, apiKey, undefined, aspectRatio, imageSize, undefined, undefined);
  }

  // Multiple images - make parallel requests
  const requests = Array.from({ length: numImages }, () =>
    makeSingleGeminiRequest(model, prompt, apiKey, undefined, aspectRatio, imageSize, undefined, undefined)
  );

  const results = await Promise.allSettled(requests);

  // Collect all successful images
  const allImages: string[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const images = result.value.choices[0].message.images || [];
      allImages.push(...images);
    } else {
      errors.push(result.reason?.message || 'Unknown error');
    }
  }

  // If we got at least some images, return them
  if (allImages.length > 0) {
    return {
      choices: [
        {
          message: {
            images: allImages,
          },
        },
      ],
    };
  }

  // If all requests failed, throw the first error
  throw new Error(errors[0] || 'Failed to generate images');
}

// Edit images using direct Gemini API (single image per request)
export async function editGeminiImage(
  request: GeminiImageEditRequest
): Promise<GeminiImageResponse> {
  const { apiKey, model, prompt, images, imageIds, promptHistory, aspectRatio, imageSize, numImages = 1 } = request;

  if (numImages === 1) {
    // Single image - simple request
    return makeSingleGeminiRequest(model, prompt, apiKey, images, aspectRatio, imageSize, promptHistory, imageIds);
  }

  // Multiple images - make parallel requests
  const requests = Array.from({ length: numImages }, () =>
    makeSingleGeminiRequest(model, prompt, apiKey, images, aspectRatio, imageSize, promptHistory, imageIds)
  );

  const results = await Promise.allSettled(requests);

  // Collect all successful images
  const allImages: string[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const resultImages = result.value.choices[0].message.images || [];
      allImages.push(...resultImages);
    } else {
      errors.push(result.reason?.message || 'Unknown error');
    }
  }

  // If we got at least some images, return them
  if (allImages.length > 0) {
    return {
      choices: [
        {
          message: {
            images: allImages,
          },
        },
      ],
    };
  }

  // If all requests failed, throw the first error
  throw new Error(errors[0] || 'Failed to edit images');
}
