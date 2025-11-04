"use client";

import { useState } from "react";
import { Settings, Close, View, ViewOff, WarningAlt, Information } from "@carbon/icons-react";
import * as motion from "motion/react-client";

interface ApiSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiSettings({ isOpen, onClose }: ApiSettingsProps) {
  const [apiMode, setApiMode] = useState<"litellm" | "gemini">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("api_mode") as "litellm" | "gemini") || "gemini";
    }
    return "gemini";
  });
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("litellm_api_key") || "";
    }
    return "";
  });
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gemini_api_key") || "";
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
  const [showToast, setShowToast] = useState(false);
  const [isSaved, setIsSaved] = useState(() => {
    if (typeof window !== "undefined") {
      const mode = (localStorage.getItem("api_mode") || "gemini") as "litellm" | "gemini";
      if (mode === "gemini") {
        return !!localStorage.getItem("gemini_api_key");
      }
      const savedKey = localStorage.getItem("litellm_api_key");
      const savedUrl = localStorage.getItem("litellm_proxy_url");
      return !!(savedKey && savedUrl);
    }
    return false;
  });
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);

    if (apiMode === "gemini") {
      // Validate Google API key
      if (!geminiApiKey || geminiApiKey.trim() === "") {
        setError("Please provide a Google API key");
        return;
      }

      localStorage.setItem("api_mode", "gemini");
      localStorage.setItem("gemini_api_key", geminiApiKey.trim());
      setIsSaved(true);

      // Show toast and reload after brief delay
      setShowToast(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      // Validate LiteLLM API key
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
        setError("Invalid proxy URL format. Please enter a valid URL (e.g., https://your-proxy.com)");
        return;
      }

      // Check if URL uses HTTPS
      if (!proxyUrl.startsWith("https://") && !proxyUrl.startsWith("http://")) {
        setError("Proxy URL must start with https:// or http://");
        return;
      }

      localStorage.setItem("api_mode", "litellm");
      localStorage.setItem("litellm_api_key", apiKey.trim());
      localStorage.setItem("litellm_proxy_url", proxyUrl.trim());
      setIsSaved(true);

      // Show toast and reload after brief delay
      setShowToast(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  const handleClear = () => {
    localStorage.removeItem("api_mode");
    localStorage.removeItem("litellm_api_key");
    localStorage.removeItem("litellm_proxy_url");
    localStorage.removeItem("gemini_api_key");
    setApiKey("");
    setProxyUrl("");
    setGeminiApiKey("");
    setIsSaved(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-primary" />
            <h2 className="text-xl font-semibold text-foreground">API Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <Close size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* API Mode Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-foreground">
              API Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="api-mode"
                  value="litellm"
                  checked={apiMode === "litellm"}
                  onChange={() => setApiMode("litellm")}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm text-foreground">LiteLLM Proxy</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="api-mode"
                  value="gemini"
                  checked={apiMode === "gemini"}
                  onChange={() => setApiMode("gemini")}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm text-foreground">Google Gemini API</span>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {apiMode === "litellm"
                ? "Use a LiteLLM proxy server (JetBrains or self-hosted) for API access."
                : "Connect directly to Google's Gemini API with your API key."}
            </p>
          </div>

          {/* LiteLLM Mode Fields */}
          {apiMode === "litellm" && (
            <>
              {/* API Key Input */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="api-key" className="text-sm font-semibold text-foreground">
                    LiteLLM API Key
                  </label>
                  <div className="group relative">
                    <Information size={16} className="text-muted-foreground cursor-help" />
                    <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-popover border border-border rounded-lg shadow-lg z-50">
                      <p className="text-xs text-popover-foreground">
                        Your API credentials are stored only in your browser&apos;s localStorage and are never sent to any server except the LiteLLM proxy you specify.
                      </p>
                    </div>
                  </div>
                </div>
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
                  <ViewOff size={16} className="text-muted-foreground" />
                ) : (
                  <View size={16} className="text-muted-foreground" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              JetBrains proxy:{" "}
              <a
                href="https://litellm.labs.jb.gg/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://litellm.labs.jb.gg/
              </a>
              {" "}(requires VPN/WiFi)
              <br />
              Or use your own LiteLLM proxy / Gemini API key
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
                  Default JetBrains LiteLLM proxy (requires VPN/WiFi). Or use your own proxy.
                </p>
              </div>
            </>
          )}

          {/* Gemini Mode Fields */}
          {apiMode === "gemini" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="gemini-api-key" className="text-sm font-semibold text-foreground">
                  Google API Key
                </label>
                <div className="group relative">
                  <Information size={16} className="text-muted-foreground cursor-help" />
                  <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-popover border border-border rounded-lg shadow-lg z-50">
                    <p className="text-xs text-popover-foreground">
                      Your API key is stored only in your browser&apos;s localStorage and is never sent to any server except Google&apos;s Gemini API.
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <input
                  id="gemini-api-key"
                  type={showKey ? "text" : "password"}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Enter your Google API key"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 text-sm text-foreground outline-none transition-colors hover:border-ring focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-colors"
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? (
                    <ViewOff size={16} className="text-muted-foreground" />
                  ) : (
                    <View size={16} className="text-muted-foreground" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
                . Direct connection to Google&apos;s Gemini API.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex gap-3">
              <WarningAlt size={20} className="text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {error}
                </p>
              </div>
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

      {/* Toast Notification */}
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]"
        >
          <div className="rounded-lg bg-green-500 px-6 py-3 shadow-lg flex items-center gap-2">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M5 13l4 4L19 7"></path>
            </svg>
            <p className="text-sm font-medium text-white">
              API credentials saved successfully
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
