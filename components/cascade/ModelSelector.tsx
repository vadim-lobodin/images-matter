"use client";

import { AVAILABLE_MODELS, ModelKey } from "@/lib/models";

interface ModelSelectorProps {
  value: ModelKey;
  onChange: (model: ModelKey) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const availableModels = Object.entries(AVAILABLE_MODELS);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="model-select" className="text-sm font-medium text-foreground">
        Model
      </label>
      <select
        id="model-select"
        value={value}
        onChange={(e) => onChange(e.target.value as ModelKey)}
        className="w-full rounded-lg bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors"
      >
        {availableModels.map(([key, config]) => (
          <option key={key} value={key}>
            {config.name} ({config.provider})
          </option>
        ))}
      </select>
    </div>
  );
}
