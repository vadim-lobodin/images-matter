// Shared model configuration (can be imported by both client and server)

export interface ModelConfig {
  name: string;
  provider: string;
  shortName: string;
  aspectRatios: readonly string[];
  imageSizes: readonly string[];
  maxImages: number;
  apiMode: 'litellm' | 'gemini'; // Which API mode this model requires
}

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  // LiteLLM models (aspect ratio not supported by LiteLLM proxy)
  "vertex_ai/gemini-2.5-flash-image": {
    name: "Gemini 2.5 Flash",
    provider: "Google",
    shortName: "Gemini 2.5",
    aspectRatios: ["1:1"],
    imageSizes: ["1K"],
    maxImages: 4,
    apiMode: 'litellm',
  },
  "vertex_ai/gemini-3-pro-image-preview": {
    name: "Gemini 3 Pro",
    provider: "Google",
    shortName: "Gemini 3 Pro",
    aspectRatios: ["21:9", "16:9", "4:3", "3:2", "5:4", "1:1", "4:5", "2:3", "3:4", "9:16"],
    imageSizes: ["1K", "2K", "4K"],
    maxImages: 4,
    apiMode: 'litellm',
  },
  // Direct Google API models
  "gemini-2.5-flash-image": {
    name: "Gemini 2.5 Flash",
    provider: "Google",
    shortName: "Gemini 2.5",
    aspectRatios: ["1:1"],
    imageSizes: ["1K"],
    maxImages: 4,
    apiMode: 'gemini',
  },
  "gemini-3-pro-image-preview": {
    name: "Gemini 3 Pro",
    provider: "Google",
    shortName: "Gemini 3",
    aspectRatios: ["21:9", "16:9", "4:3", "3:2", "5:4", "1:1", "4:5", "2:3", "3:4", "9:16"],
    imageSizes: ["1K", "2K", "4K"],
    maxImages: 4,
    apiMode: 'gemini',
  },
};

export type ModelKey = keyof typeof AVAILABLE_MODELS;

// Get models available for a specific API mode
export function getModelsForApiMode(mode: 'litellm' | 'gemini'): Record<string, ModelConfig> {
  return Object.fromEntries(
    Object.entries(AVAILABLE_MODELS).filter(([, config]) => config.apiMode === mode)
  );
}
