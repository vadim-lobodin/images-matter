"use client";

import { useRef, useEffect } from 'react';
import * as motion from 'motion/react-client';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  animationKey?: string | number;
  isMounted?: boolean;
}

export function PromptInput({
  value,
  onChange,
  placeholder = "Describe the image you want to generate...",
  maxLength = 4000,
  onKeyDown,
  animationKey,
  isMounted = true,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldFocusRef = useRef(false);

  useEffect(() => {
    // Refocus after animation key changes (history navigation)
    if (shouldFocusRef.current && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
      shouldFocusRef.current = false;
    }
  }, [animationKey]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mark that we should refocus after the key event causes a re-render
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      shouldFocusRef.current = true;
    }
    onKeyDown?.(e);
  };

  return (
    <div className="flex flex-col gap-2 overflow-hidden">
      <motion.div
        key={animationKey}
        initial={isMounted && animationKey !== undefined ? { y: 20, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <textarea
          ref={textareaRef}
          id="prompt-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={2}
          maxLength={maxLength}
          className="w-full rounded-lg bg-transparent px-4 py-3 text-lg text-foreground placeholder:text-muted-foreground outline-none resize-none"
        />
      </motion.div>
    </div>
  );
}
