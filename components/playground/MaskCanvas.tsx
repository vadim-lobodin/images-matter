"use client";

import { Eraser, Paintbrush, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MaskCanvasProps {
  imageUrl: string;
  onMaskCreate: (maskFile: File | null) => void;
}

export function MaskCanvas({ imageUrl, onMaskCreate }: MaskCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [mode, setMode] = useState<"draw" | "erase">("draw");
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load the image
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Initialize mask layer (transparent)
      ctx.globalCompositeOperation = "source-over";
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    generateMask();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== "mousedown") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (mode === "draw") {
      // Draw white mask area (area to edit)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    } else {
      // Erase mask area
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0, 0, 0, 1)";
    }

    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();

    if (mode === "erase") {
      ctx.globalCompositeOperation = "source-over";
    }
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reload the original image
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageUrl;

    onMaskCreate(null);
  };

  const generateMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a mask canvas
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;

    // Get the current canvas data
    const imageData = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height);
    if (!imageData) return;

    // Create mask: white for masked areas, transparent for rest
    const maskData = maskCtx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const alpha = imageData.data[i + 3];
      if (alpha > 0) {
        // Check if pixel has been painted over
        maskData.data[i] = 255; // R
        maskData.data[i + 1] = 255; // G
        maskData.data[i + 2] = 255; // B
        maskData.data[i + 3] = 255; // A
      }
    }

    maskCtx.putImageData(maskData, 0, 0);

    // Convert to blob and file
    maskCanvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "mask.png", { type: "image/png" });
        onMaskCreate(file);
      }
    }, "image/png");
  };

  if (!imageLoaded) {
    return <div className="flex items-center justify-center h-64 bg-muted rounded-lg">Loading image...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Draw Mask</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("draw")}
            className={`rounded-lg p-2 transition-colors ${
              mode === "draw"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
            aria-label="Draw mode"
          >
            <Paintbrush className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMode("erase")}
            className={`rounded-lg p-2 transition-colors ${
              mode === "erase"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
            aria-label="Erase mode"
          >
            <Eraser className="h-4 w-4" />
          </button>
          <button
            onClick={clearMask}
            className="rounded-lg p-2 bg-muted text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Clear mask"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="brush-size" className="text-xs text-muted-foreground">
          Brush Size: {brushSize}px
        </label>
        <input
          id="brush-size"
          type="range"
          min={5}
          max={100}
          value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="relative rounded-lg border border-border overflow-hidden bg-muted">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-auto cursor-crosshair"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Draw on the areas you want to edit. White areas will be regenerated based on your prompt.
      </p>
    </div>
  );
}
