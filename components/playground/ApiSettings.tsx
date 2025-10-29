"use client";

import { useState } from "react";
import { Settings, X, Eye, EyeOff, AlertCircle } from "lucide-react";

interface ApiSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiSettings({ isOpen, onClose }: ApiSettingsProps) {
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("litellm_api_key") || "";
    }
    return "";
  });
  const [proxyUrl, setProxyUrl] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("litellm_proxy_url") || "https://litellm.labs.jb.gg";
    }
    return "https://litellm.labs.jb.gg";
  });
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("litellm_api_key");
      const savedUrl = localStorage.getItem("litellm_proxy_url");
      return !!(savedKey && savedUrl);
    }
    return false;
  });
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);

    // Validate API key
    if (!apiKey || apiKey.trim() === "") {
      setError("Please provide an API key");
      return;
    }

    // Validate proxy URL
    if (!proxyUrl || proxyUrl.trim() === "") {
      setError("Please provide a proxy URL");
      return;
    }

    // Validate URL format
    try {
      new URL(proxyUrl);
    } catch {
      setError("Invalid proxy URL format. Please enter a valid URL (e.g., https://litellm.labs.jb.gg)");
      return;
    }

    // Check if URL uses HTTPS
    if (!proxyUrl.startsWith("https://") && !proxyUrl.startsWith("http://")) {
      setError("Proxy URL must start with https:// or http://");
      return;
    }

    localStorage.setItem("litellm_api_key", apiKey.trim());
    localStorage.setItem("litellm_proxy_url", proxyUrl.trim());
    setIsSaved(true);

    // Reload the page to apply new settings
    window.location.reload();
  };

  const handleClear = () => {
    localStorage.removeItem("litellm_api_key");
    localStorage.removeItem("litellm_proxy_url");
    setApiKey("");
    setProxyUrl("");
    setIsSaved(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">API Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                API keys are stored locally in your browser
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Your API credentials are stored only in your browser&apos;s localStorage and are never sent to any server except the LiteLLM proxy you specify. Clear your browser data to remove them.
              </p>
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <label htmlFor="api-key" className="block text-sm font-semibold text-foreground">
              LiteLLM API Key
            </label>
            <div className="relative">
              <input
                id="api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your LiteLLM API key"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 text-sm text-foreground outline-none transition-colors hover:border-ring focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-colors"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://litellm.labs.jb.gg/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://litellm.labs.jb.gg/
              </a>
              {" "}(VPN or JetBrains Team WiFi required)
            </p>
          </div>

          {/* Proxy URL Input */}
          <div className="space-y-2">
            <label htmlFor="proxy-url" className="block text-sm font-semibold text-foreground">
              LiteLLM Proxy URL
            </label>
            <input
              id="proxy-url"
              type="url"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="https://litellm.labs.jb.gg"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors hover:border-ring focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            <p className="text-xs text-muted-foreground">
              Default JetBrains LiteLLM proxy (usually no need to change)
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Status */}
          {isSaved && !error && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ API credentials are configured and saved
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Save Settings
            </button>
            {isSaved && (
              <button
                onClick={handleClear}
                className="rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
