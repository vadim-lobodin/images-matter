"use client";

import { Clock, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";

export interface HistoryItem {
  id: string;
  timestamp: number;
  mode: "generate" | "edit" | "variations";
  model: string;
  prompt?: string;
  images: Array<{ url?: string; b64_json?: string }>;
}

interface GenerationHistoryProps {
  onSelect: (item: HistoryItem) => void;
}

// IndexedDB helper functions
const DB_NAME = "ImageGenerationDB";
const STORE_NAME = "history";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

async function getAllHistory(): Promise<HistoryItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("timestamp");
    const request = index.openCursor(null, "prev"); // Descending order

    const items: HistoryItem[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        items.push(cursor.value);
        cursor.continue();
      } else {
        resolve(items);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

async function deleteHistoryItem(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function clearAllHistory(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function GenerationHistory({ onSelect }: GenerationHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    // Load history from IndexedDB
    getAllHistory().then(setHistory).catch(error => {
      console.error("Failed to load history:", error);
    });
  }, []);

  const clearHistory = async () => {
    await clearAllHistory();
    setHistory([]);
  };

  const deleteItem = async (id: string) => {
    await deleteHistoryItem(id);
    const newHistory = history.filter((item) => item.id !== id);
    setHistory(newHistory);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
        <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Your generation history will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">History</h3>
        <button
          onClick={clearHistory}
          className="text-sm text-destructive hover:underline"
        >
          Clear All
        </button>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {history.map((item) => {
          const imageUrl = item.images[0]?.url || (item.images[0]?.b64_json ? `data:image/png;base64,${item.images[0].b64_json}` : "");

          // Skip if no image URL
          if (!imageUrl) {
            return null;
          }

          return (
            <div
              key={item.id}
              className="group relative rounded-lg border border-border overflow-hidden bg-muted cursor-pointer hover:border-ring transition-colors"
              onClick={() => onSelect(item)}
            >
              <div className="relative aspect-square w-full">
                <Image
                  src={imageUrl}
                  alt="History item"
                  fill
                  className="object-cover"
                />
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white font-medium truncate mb-1">
                  {item.prompt || `${item.mode} - ${item.model}`}
                </p>
                <p className="text-xs text-white/70">{formatDate(item.timestamp)}</p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItem(item.id);
                }}
                className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                aria-label="Delete"
              >
                <Trash2 className="h-3 w-3 text-white" />
              </button>

              <div className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
                {item.mode}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper function to add item to history (to be called from main page)
export async function addToHistory(item: Omit<HistoryItem, "id" | "timestamp">) {
  const historyItem: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };

  try {
    const db = await openDB();

    // Add the new item
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(historyItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Keep only last 50 items (clean up old ones)
    const allItems = await getAllHistory();
    if (allItems.length > 50) {
      const itemsToDelete = allItems.slice(50);
      await Promise.all(itemsToDelete.map(item => deleteHistoryItem(item.id)));
    }
  } catch (error) {
    console.error("Failed to save to history:", error);
  }
}
