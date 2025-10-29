"use client";

import { Upload, X } from "lucide-react";
import { useState, useRef } from "react";
import Image from "next/image";

interface ImageUploadProps {
  value: string[];
  onChange: (imageData: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ value, onChange, maxImages = 4 }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = async (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      alert("Please select image files");
      return;
    }

    const remainingSlots = maxImages - value.length;
    const filesToProcess = imageFiles.slice(0, remainingSlots);

    if (filesToProcess.length < imageFiles.length) {
      alert(`Only ${remainingSlots} more image(s) can be added. Maximum is ${maxImages}.`);
    }

    const promises = filesToProcess.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    const results = await Promise.all(promises);
    onChange([...value, ...results]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelect(e.target.files);
    }
  };

  const handleRemove = (index: number) => {
    const newImages = value.filter((_, i) => i !== index);
    onChange(newImages);
    if (newImages.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClearAll = () => {
    onChange([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-foreground">
          Upload Images ({value.length}/{maxImages})
        </label>
        {value.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-destructive hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      {value.length === 0 ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative rounded-lg border-2 border-dashed p-8 text-center cursor-pointer
            transition-colors
            ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
            }
          `}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-foreground font-medium mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, GIF up to 10MB (max {maxImages} images)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {value.map((imageUrl, index) => (
              <div
                key={index}
                className="relative rounded-lg border border-border overflow-hidden bg-muted"
              >
                <div className="relative aspect-square w-full">
                  <Image
                    src={imageUrl}
                    alt={`Uploaded image ${index + 1}`}
                    fill
                    className="object-contain"
                  />
                </div>
                <button
                  onClick={() => handleRemove(index)}
                  className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 hover:bg-black/70 transition-colors"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>

          {value.length < maxImages && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative rounded-lg border-2 border-dashed p-4 text-center cursor-pointer
                transition-colors
                ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
                }
              `}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-xs text-foreground font-medium">
                Add more images ({maxImages - value.length} remaining)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
