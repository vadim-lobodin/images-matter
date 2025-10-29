"use client";

import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import Image from "next/image";

interface ImageUploaderProps {
  onImageSelect: (file: File | null) => void;
  label?: string;
  accept?: string;
}

export function ImageUploader({
  onImageSelect,
  label = "Upload Image",
  accept = "image/*",
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onImageSelect(file);
    } else {
      setPreview(null);
      onImageSelect(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClear = () => {
    setPreview(null);
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">{label}</label>

      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-all ${
            isDragging
              ? "border-ring bg-accent"
              : "border-border bg-background hover:border-ring hover:bg-accent/50"
          }`}
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP up to 10MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative rounded-lg border border-border overflow-hidden">
          <div className="relative aspect-square w-full">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-contain bg-muted"
            />
          </div>
          <button
            onClick={handleClear}
            className="absolute right-2 top-2 rounded-full bg-destructive p-2 text-destructive-foreground transition-opacity hover:opacity-80"
            aria-label="Clear image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
