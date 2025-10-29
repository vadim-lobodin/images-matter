import { NextRequest, NextResponse } from "next/server";
import { generateGeminiImage } from "@/lib/litellm-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, prompt, aspectRatio, imageSize, numImages = 1 } = body;

    // Get API credentials from headers (user-provided) or fall back to env
    const apiKey = request.headers.get("x-litellm-api-key") || undefined;
    const baseURL = request.headers.get("x-litellm-proxy-url") || undefined;

    // Validate required fields
    if (!model || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: model and prompt" },
        { status: 400 }
      );
    }

    // Validate prompt length
    if (prompt.length > 4000) {
      return NextResponse.json(
        { error: "Prompt exceeds maximum length of 4000 characters" },
        { status: 400 }
      );
    }

    // Call Gemini API through LiteLLM proxy
    const response = await generateGeminiImage({
      model,
      prompt,
      aspectRatio,
      imageSize,
      numImages,
      apiKey,
      baseURL,
    });

    // Extract images from response (images are returned as data URLs)
    const images = response.choices.flatMap((choice) => {
      if (choice.message.images && choice.message.images.length > 0) {
        return choice.message.images.map((imageData: any) => {
          // Handle Gemini response format: { image_url: { url: "data:..." } }
          let dataUrl: string;

          if (typeof imageData === 'object' && imageData.image_url?.url) {
            dataUrl = imageData.image_url.url;
          } else if (typeof imageData === 'string') {
            dataUrl = imageData;
          } else if (typeof imageData === 'object') {
            dataUrl = imageData.url || imageData.b64_json || imageData.data || '';
          } else {
            dataUrl = String(imageData);
          }

          // Extract base64 data from data URL (format: data:image/png;base64,...)
          const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            return {
              b64_json: match[2],
              mime_type: match[1],
            };
          }

          // If it's already just base64, return as-is
          return {
            b64_json: dataUrl,
            mime_type: "image/png",
          };
        });
      }
      return [];
    });

    if (images.length === 0) {
      return NextResponse.json(
        { error: "No images were generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: images,
      created: Math.floor(Date.now() / 1000),
    });
  } catch (error: any) {
    console.error("Image generation error:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to generate image",
        details: error.response?.data || null,
      },
      { status: error.status || 500 }
    );
  }
}
