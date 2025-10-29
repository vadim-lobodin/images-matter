"use client";

import { Download, Copy, Check, Wand2 } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

interface ImageDisplayProps {
  images: Array<{ url?: string; b64_json?: string; mime_type?: string }>;
  prompt?: string;
  onUseAsInput?: (imageUrl: string) => void;
}

export function ImageDisplay({ images, prompt, onUseAsInput }: ImageDisplayProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      // If it's already a data URL, use it directly
      if (imageUrl.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = `generated-image-${index + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Otherwise fetch it
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `generated-image-${index + 1}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to download image:", error);
    }
  };

  const handleCopy = async (imageUrl: string, index: number) => {
    try {
      // Convert data URL to blob if needed
      if (imageUrl.startsWith("data:")) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
      } else {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
      }
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error("Failed to copy image:", error);
    }
  };

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-lg border-2 border-dashed border-border bg-muted/30">
        <p className="text-muted-foreground text-center px-4">
          Generated images will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {prompt && (
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-foreground">
            <span className="font-semibold">Prompt:</span> {prompt}
          </p>
        </div>
      )}

      <div className={`grid gap-4 ${images.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        {images.map((image, index) => {
          const mimeType = image.mime_type || "image/png";
          const imageUrl = image.url || (image.b64_json ? `data:${mimeType};base64,${image.b64_json}` : "");

          return (
            <div
              key={index}
              className="group relative rounded-lg border border-border overflow-hidden bg-muted"
            >
              <div className="relative aspect-square w-full">
                <Image
                  src={imageUrl}
                  alt={`Generated image ${index + 1}`}
                  fill
                  className="object-contain"
                />
              </div>

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {onUseAsInput && (
                  <button
                    onClick={() => onUseAsInput(imageUrl)}
                    className="rounded-full bg-primary p-3 text-primary-foreground hover:bg-primary/90 transition-colors"
                    aria-label="Use as input for editing"
                    title="Use as input for editing"
                  >
                    <Wand2 className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => handleDownload(imageUrl, index)}
                  className="rounded-full bg-white p-3 text-black hover:bg-gray-200 transition-colors"
                  aria-label="Download image"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleCopy(imageUrl, index)}
                  className="rounded-full bg-white p-3 text-black hover:bg-gray-200 transition-colors"
                  aria-label="Copy image"
                >
                  {copiedIndex === index ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>
              </div>

              {images.length > 1 && (
                <div className="absolute top-2 left-2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
                  {index + 1} / {images.length}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
