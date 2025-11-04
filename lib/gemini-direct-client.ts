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
function stripDataUrlPrefix(dataUrl: string): { mime_type: string; data: string } {
  const match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (match) {
    return { mime_type: match[1], data: match[2] };
  }
  // Assume PNG if no prefix found
  return { mime_type: "image/png", data: dataUrl };
}

// Build request body for Gemini API
function buildGeminiRequest(
  prompt: string,
  images: string[] | undefined,
  aspectRatio: string | undefined,
  promptHistory: string[] | undefined,
  imageIds: number[] | undefined
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
      const { mime_type, data } = stripDataUrlPrefix(imageUrl);
      parts.push({
        inline_data: {
          mime_type,
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

  if (aspectRatio) {
    generationConfig.imageConfig = {
      aspectRatio: aspectRatio,
    };
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
      if (part.inline_data) {
        // Reconstruct data URL with prefix
        const { mime_type, data } = part.inline_data;
        images.push(`data:${mime_type};base64,${data}`);
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
  const requestBody = buildGeminiRequest(prompt, images, aspectRatio, promptHistory, imageIds);

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
      "❌ Network Connection Failed\n\n" +
      "Cannot reach Google Gemini API.\n\n" +
      "Please:\n" +
      "1. Check your network connection\n" +
      "2. Verify your API key in Settings\n" +
      "3. Ensure the API is accessible from your location"
    );
  }

  // Handle error responses
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    let errorMessage = errorData.error?.message || `API error: ${response.status} ${response.statusText}`;

    if (response.status === 401 || response.status === 403) {
      errorMessage = "Authentication failed. Please check your Google API key in Settings.";
    } else if (response.status === 404) {
      errorMessage = "API endpoint not found. The model may not be available.";
    } else if (response.status === 429) {
      errorMessage = "Rate limit exceeded. Please try again later.";
    } else if (response.status === 400 && errorData.error?.message) {
      errorMessage = errorData.error.message;
    } else if (response.status >= 500) {
      errorMessage = "Server error. Please try again later.";
    }

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
  const { apiKey, model, prompt, aspectRatio, numImages = 1 } = request;

  if (numImages === 1) {
    // Single image - simple request
    return makeSingleGeminiRequest(model, prompt, apiKey, undefined, aspectRatio, undefined, undefined);
  }

  // Multiple images - make parallel requests
  const requests = Array.from({ length: numImages }, () =>
    makeSingleGeminiRequest(model, prompt, apiKey, undefined, aspectRatio, undefined, undefined)
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
  const { apiKey, model, prompt, images, imageIds, promptHistory, aspectRatio, numImages = 1 } = request;

  if (numImages === 1) {
    // Single image - simple request
    return makeSingleGeminiRequest(model, prompt, apiKey, images, aspectRatio, promptHistory, imageIds);
  }

  // Multiple images - make parallel requests
  const requests = Array.from({ length: numImages }, () =>
    makeSingleGeminiRequest(model, prompt, apiKey, images, aspectRatio, promptHistory, imageIds)
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
