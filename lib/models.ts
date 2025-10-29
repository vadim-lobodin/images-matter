// Shared model configuration (can be imported by both client and server)

export const AVAILABLE_MODELS = {
  "vertex_ai/gemini-2.5-flash-image": {
    name: "Gemini 2.5 Flash Image",
    provider: "Google Vertex AI",
    aspectRatios: ["1:1", "3:4", "4:3", "9:16", "16:9"] as const,
    imageSizes: ["1K", "2K"] as const,
    maxImages: 1,
  },
  "vertex_ai/gemini-2.0-flash-preview-image-generation": {
    name: "Gemini 2.0 Flash Image (Preview)",
    provider: "Google Vertex AI",
    aspectRatios: ["1:1", "3:4", "4:3", "9:16", "16:9"] as const,
    imageSizes: ["1K", "2K"] as const,
    maxImages: 1,
  },
} as const;

export type ModelKey = keyof typeof AVAILABLE_MODELS;
