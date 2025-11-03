// Shared model configuration (can be imported by both client and server)

export const AVAILABLE_MODELS = {
  "vertex_ai/gemini-2.5-flash-image": {
    name: "Gemini 2.5 Flash Image",
    provider: "Google Vertex AI",
    // All 10 aspect ratios supported by Gemini 2.5 Flash Image
    // Ordered from landscape to portrait
    aspectRatios: ["21:9", "16:9", "4:3", "3:2", "5:4", "1:1", "4:5", "2:3", "3:4", "9:16"] as const,
    imageSizes: ["1K", "2K"] as const,
    maxImages: 4,
  },
  "vertex_ai/gemini-2.0-flash-preview-image-generation": {
    name: "Gemini 2.0 Flash Image (Preview)",
    provider: "Google Vertex AI",
    aspectRatios: ["21:9", "16:9", "4:3", "3:2", "5:4", "1:1", "4:5", "2:3", "3:4", "9:16"] as const,
    imageSizes: ["1K", "2K"] as const,
    maxImages: 4,
  },
} as const;

export type ModelKey = keyof typeof AVAILABLE_MODELS;
