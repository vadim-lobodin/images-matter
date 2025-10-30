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
  return (
    <div className="flex flex-col gap-2">
      <textarea
        id="prompt-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={maxLength}
        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors hover:border-ring focus:border-ring focus:ring-2 focus:ring-ring/20 resize-none"
      />
    </div>
  );
}
