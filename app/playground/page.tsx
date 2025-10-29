"use client";

import { useState } from "react";
import { Sparkles, Loader2, Wand2, Settings } from "lucide-react";
import { ModelSelector } from "@/components/playground/ModelSelector";
import { PromptInput } from "@/components/playground/PromptInput";
import { ParameterControls } from "@/components/playground/ParameterControls";
import { ImageDisplay } from "@/components/playground/ImageDisplay";
import { ImageUpload } from "@/components/playground/ImageUpload";
import { GenerationHistory, addToHistory, type HistoryItem } from "@/components/playground/GenerationHistory";
import { ApiSettings } from "@/components/playground/ApiSettings";
import { type ModelKey } from "@/lib/models";

type TabType = "generate" | "edit";

// Helper to get API credentials from localStorage
function getApiCredentials() {
  if (typeof window === "undefined") return null;
  const apiKey = localStorage.getItem("litellm_api_key");
  const proxyUrl = localStorage.getItem("litellm_proxy_url");
  return apiKey && proxyUrl ? { apiKey, proxyUrl } : null;
}

export default function PlaygroundPage() {
  const [activeTab, setActiveTab] = useState<TabType>("generate");
  const [model, setModel] = useState<ModelKey>("vertex_ai/gemini-2.5-flash-image");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [imageSize, setImageSize] = useState("1K");
  const [numImages, setNumImages] = useState(1);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<Array<{ url?: string; b64_json?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get API credentials from localStorage
      const credentials = getApiCredentials();

      // Build headers with credentials if available
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (credentials) {
        headers["x-litellm-api-key"] = credentials.apiKey;
        headers["x-litellm-proxy-url"] = credentials.proxyUrl;
      }

      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          prompt,
          aspectRatio,
          imageSize,
          numImages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      setGeneratedImages(data.data);

      // Add to history
      await addToHistory({
        mode: "generate",
        model,
        prompt,
        images: data.data,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (uploadedImages.length === 0) {
      setError("Please upload at least one image");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get API credentials from localStorage
      const credentials = getApiCredentials();

      // Build headers with credentials if available
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (credentials) {
        headers["x-litellm-api-key"] = credentials.apiKey;
        headers["x-litellm-proxy-url"] = credentials.proxyUrl;
      }

      const response = await fetch("/api/images/edit", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          prompt,
          images: uploadedImages,
          aspectRatio,
          imageSize,
          numImages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to edit image");
      }

      setGeneratedImages(data.data);

      // Add to history
      await addToHistory({
        mode: "edit",
        model,
        prompt,
        images: data.data,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to edit image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setModel(item.model as ModelKey);
    if (item.prompt) setPrompt(item.prompt);
    if (item.images) setGeneratedImages(item.images);
  };

  const handleUseAsInput = (imageUrl: string) => {
    // Switch to edit tab
    setActiveTab("edit");
    // Add the image to uploaded images (check if we're under the limit)
    if (uploadedImages.length < 4) {
      setUploadedImages([...uploadedImages, imageUrl]);
    } else {
      setError("Maximum 4 images can be used as input. Please remove some images first.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const isSubmitDisabled =
    activeTab === "generate"
      ? isLoading || !prompt
      : isLoading || !prompt || uploadedImages.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Image Playground</h1>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted flex items-center gap-2"
              title="API Settings"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
          <p className="text-muted-foreground">
            Generate and edit images using AI models via Google Vertex AI
          </p>
        </div>

        {/* Settings Modal */}
        <ApiSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-border">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("generate")}
                className={`
                  px-4 py-3 font-semibold text-sm transition-colors relative
                  ${
                    activeTab === "generate"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate
                </div>
                {activeTab === "generate" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("edit")}
                className={`
                  px-4 py-3 font-semibold text-sm transition-colors relative
                  ${
                    activeTab === "edit"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Edit
                </div>
                {activeTab === "edit" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-lg border border-border bg-card p-6 space-y-6">
              <ModelSelector value={model} onChange={setModel} />

              {activeTab === "edit" && (
                <ImageUpload value={uploadedImages} onChange={setUploadedImages} />
              )}

              <PromptInput
                value={prompt}
                onChange={setPrompt}
              />

              <ParameterControls
                model={model}
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
                imageSize={imageSize}
                onImageSizeChange={setImageSize}
                numImages={numImages}
                onNumImagesChange={setNumImages}
              />

              <button
                onClick={activeTab === "generate" ? handleGenerate : handleEdit}
                disabled={isSubmitDisabled}
                className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {activeTab === "generate" ? "Generating..." : "Editing..."}
                  </>
                ) : (
                  <>
                    {activeTab === "generate" ? (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        Edit
                      </>
                    )}
                  </>
                )}
              </button>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                  <p className="text-sm text-destructive font-medium">Error</p>
                  <p className="text-sm text-destructive/90 mt-1">{error}</p>
                  {(error.includes("credentials") || error.includes("Settings") || error.includes("API key")) && (
                    <button
                      onClick={() => setShowSettings(true)}
                      className="mt-2 text-sm text-destructive hover:text-destructive/80 underline"
                    >
                      Open Settings
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Results</h2>
              <ImageDisplay
                images={generatedImages}
                prompt={prompt}
                onUseAsInput={handleUseAsInput}
              />
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <GenerationHistory onSelect={handleHistorySelect} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
