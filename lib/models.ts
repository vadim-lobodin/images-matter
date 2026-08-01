// Shared model configuration (can be imported by both client and server)

export interface ModelConfig {
  name: string;
  provider: string;
  shortName: string;
  aspectRatios: readonly string[];
  imageSizes: readonly string[];
  maxImages: number;
  maxInputImages: number;
  apiMode: 'litellm' | 'gemini'; // Which API mode this model requires
}

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  // LiteLLM models (aspect ratio not supported by LiteLLM proxy)
  "vertex_ai/gemini-3-pro-image": {
    name: "Gemini 3 Pro",
    provider: "Google",
    shortName: "Gemini 3 Pro",
    aspectRatios: ["21:9", "16:9", "4:3", "3:2", "5:4", "1:1", "4:5", "2:3", "3:4", "9:16"],
    imageSizes: ["1K", "2K", "4K"],
    maxImages: 4,
    maxInputImages: 14,
    apiMode: 'litellm',
  },
  "vertex_ai/gemini-3.1-flash-image": {
    name: "Gemini 3.1 Flash",
    provider: "Google",
    shortName: "Gemini 3.1",
    aspectRatios: ["21:9", "16:9", "4:3", "3:2", "5:4", "1:1", "4:5", "2:3", "3:4", "9:16"],
    imageSizes: ["1K", "2K", "4K"],
    maxImages: 4,
    maxInputImages: 14,
    apiMode: 'litellm',
  },
  "vertex_ai/gemini-2.5-flash-image": {
    name: "Gemini 2.5 Flash",
    provider: "Google",
    shortName: "Gemini 2.5",
    aspectRatios: ["1:1"],
    imageSizes: ["1K"],
    maxImages: 4,
    maxInputImages: 3,
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
    maxInputImages: 3,
    apiMode: 'gemini',
  },
  "gemini-3-pro-image": {
    name: "Gemini 3 Pro",
    provider: "Google",
    shortName: "Gemini 3",
    aspectRatios: ["21:9", "16:9", "4:3", "3:2", "5:4", "1:1", "4:5", "2:3", "3:4", "9:16"],
    imageSizes: ["1K", "2K", "4K"],
    maxImages: 4,
    maxInputImages: 14,
    apiMode: 'gemini',
  },
};

export type ModelKey = keyof typeof AVAILABLE_MODELS;

const LEGACY_MODEL_IDS: Record<string, ModelKey> = {
  "vertex_ai/gemini-3-pro-image-preview": "vertex_ai/gemini-3-pro-image",
  "vertex_ai/gemini-3.1-flash-image-preview": "vertex_ai/gemini-3.1-flash-image",
  "gemini-3-pro-image-preview": "gemini-3-pro-image",
};

// Preserve a user's selected model when configured model IDs change.
export function migrateModelKey(model: string | null): string | null {
  return model ? LEGACY_MODEL_IDS[model] ?? model : null;
}

// Get models available for a specific API mode
export function getModelsForApiMode(mode: 'litellm' | 'gemini'): Record<string, ModelConfig> {
  return Object.fromEntries(
    Object.entries(AVAILABLE_MODELS).filter(([, config]) => config.apiMode === mode)
  );
}
