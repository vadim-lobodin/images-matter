"use client";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export function PromptInput({
  value,
  onChange,
  placeholder = "Describe the image you want to generate...",
  maxLength = 4000,
}: PromptInputProps) {
  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.9;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor="prompt-input" className="text-sm font-medium text-foreground">
          Prompt
        </label>
        <span
          className={`text-xs transition-colors ${
            isOverLimit
              ? "text-destructive font-semibold"
              : isNearLimit
              ? "text-yellow-600 dark:text-yellow-500"
              : "text-muted-foreground"
          }`}
        >
          {characterCount} / {maxLength}
        </span>
      </div>
      <textarea
        id="prompt-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        maxLength={maxLength}
        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors hover:border-ring focus:border-ring focus:ring-2 focus:ring-ring/20 resize-y"
      />
      {isOverLimit && (
        <p className="text-xs text-destructive">
          Prompt exceeds maximum length
        </p>
      )}
    </div>
  );
}
