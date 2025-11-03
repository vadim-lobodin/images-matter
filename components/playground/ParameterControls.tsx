"use client";

import { AVAILABLE_MODELS, ModelKey } from "@/lib/models";

interface ParameterControlsProps {
  model: ModelKey;
  aspectRatio: string;
  onAspectRatioChange: (aspectRatio: string) => void;
  imageSize: string;
  onImageSizeChange: (imageSize: string) => void;
  numImages: number;
  onNumImagesChange: (n: number) => void;
}

export function ParameterControls({
  model,
  aspectRatio,
  onAspectRatioChange,
  imageSize,
  onImageSizeChange,
  numImages,
  onNumImagesChange,
}: ParameterControlsProps) {
  const modelConfig = AVAILABLE_MODELS[model];

  // Safety check: if model doesn't exist, use default
  if (!modelConfig) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Invalid model selected. Please refresh the page.</p>
      </div>
    );
  }

  const maxImages = modelConfig.maxImages;

  return (
    <div className="flex flex-col gap-4">
      {/* Aspect Ratio Selection */}
      <div className="flex flex-col gap-2">
        <label htmlFor="aspect-ratio-select" className="text-sm font-medium text-foreground">
          Aspect Ratio
        </label>
        <select
          id="aspect-ratio-select"
          value={aspectRatio}
          onChange={(e) => onAspectRatioChange(e.target.value)}
          className="w-full rounded-lg bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors"
        >
          {modelConfig.aspectRatios.map((ratio) => (
            <option key={ratio} value={ratio}>
              {ratio}
            </option>
          ))}
        </select>
      </div>

      {/* Resolution/Image Size Selection */}
      <div className="flex flex-col gap-2">
        <label htmlFor="image-size-select" className="text-sm font-medium text-foreground">
          Resolution
        </label>
        <select
          id="image-size-select"
          value={imageSize}
          onChange={(e) => onImageSizeChange(e.target.value)}
          className="w-full rounded-lg bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors"
        >
          {modelConfig.imageSizes.map((size) => (
            <option key={size} value={size}>
              {size} ({size === "1K" ? "~1024px" : "~2048px"})
            </option>
          ))}
        </select>
      </div>

      {/* Number of Images */}
      <div className="flex flex-col gap-2">
        <label htmlFor="num-images" className="text-sm font-medium text-foreground">
          Number of Images
        </label>
        <input
          id="num-images"
          type="number"
          min={1}
          max={maxImages}
          value={numImages}
          onChange={(e) => onNumImagesChange(Math.min(maxImages, Math.max(1, parseInt(e.target.value) || 1)))}
          className="w-full rounded-lg bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors"
        />
        <p className="text-xs text-muted-foreground">
          Maximum {maxImages} image{maxImages > 1 ? "s" : ""} for {modelConfig.name}
        </p>
      </div>
    </div>
  );
}
