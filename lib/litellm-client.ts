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

export async function generateGeminiImage(
  request: GeminiImageRequest
): Promise<GeminiImageResponse> {
  const { apiKey, baseURL } = request;

  if (!apiKey || !baseURL) {
    throw new Error(
      "API credentials not configured. Please configure your LiteLLM API key and proxy URL in Settings."
    );
  }

  const { model, prompt, aspectRatio, imageSize, numImages = 1 } = request;

  // Build the chat completions request body with modalities
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestBody: any = {
    model,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    modalities: ["image", "text"],
    n: numImages,
  };

  // Add aspect ratio if provided (Gemini expects camelCase)
  if (aspectRatio) {
    requestBody.aspectRatio = aspectRatio;
  }

  // Add image size if provided (Gemini expects camelCase)
  if (imageSize) {
    requestBody.imageSize = imageSize;
  }

  // Make the request to LiteLLM proxy using chat/completions endpoint
  // Remove trailing slash from baseURL if present
  const cleanBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  const url = `${cleanBaseURL}/v1/chat/completions`;

  console.log('Calling LiteLLM:', url);
  console.log('Request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.log('Error response:', errorData);

    // Provide helpful error messages based on status code
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

  const result = await response.json();
  console.log('Success response:', JSON.stringify(result, null, 2));
  return result;
}

export async function editGeminiImage(
  request: GeminiImageEditRequest
): Promise<GeminiImageResponse> {
  const { apiKey, baseURL } = request;

  if (!apiKey || !baseURL) {
    throw new Error(
      "API credentials not configured. Please configure your LiteLLM API key and proxy URL in Settings."
    );
  }

  const { model, prompt, images, aspectRatio, imageSize, numImages = 1 } = request;

  // Build content array with text prompt and multiple images
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [
    {
      type: "text",
      text: prompt,
    },
    ...images.map(imageUrl => ({
      type: "image_url",
      image_url: {
        url: imageUrl,
      },
    })),
  ];

  // Build the chat completions request body with multimodal content
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

  // Add aspect ratio if provided (Gemini expects camelCase)
  if (aspectRatio) {
    requestBody.aspectRatio = aspectRatio;
  }

  // Add image size if provided (Gemini expects camelCase)
  if (imageSize) {
    requestBody.imageSize = imageSize;
  }

  // Make the request to LiteLLM proxy using chat/completions endpoint
  const cleanBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  const url = `${cleanBaseURL}/v1/chat/completions`;

  console.log('Calling LiteLLM for image edit:', url);
  console.log('Request body:', JSON.stringify({
    ...requestBody,
    messages: [{
      ...requestBody.messages[0],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: requestBody.messages[0].content.map((c: any) =>
        c.type === 'image_url' ? { type: 'image_url', image_url: { url: '[BASE64_DATA]' } } : c
      )
    }]
  }, null, 2));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.log('Error response:', errorData);

    // Provide helpful error messages based on status code
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

  const result = await response.json();
  console.log('Success response:', JSON.stringify(result, null, 2));
  return result;
}
