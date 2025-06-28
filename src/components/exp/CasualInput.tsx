"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, Smile } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

interface CasualInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function CasualInput({
  value,
  onChange,
  onSend,
  disabled,
}: CasualInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSend(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div className="p-4 bg-bg-primary border-t border-border-primary">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          {/* Attachment Button */}
          <motion.button
            type="button"
            className="flex-shrink-0 p-3 rounded-full bg-bg-input text-text-secondary hover:text-text-primary hover:bg-bg-input/80 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Paperclip size={20} />
          </motion.button>

          {/* Message Input Container */}
          <motion.div
            className={`flex-1 relative bg-bg-input rounded-2xl border transition-all duration-200 ${
              isFocused
                ? "border-text-accent"
                : "border-border-primary hover:border-text-secondary"
            }`}
            animate={{
              scale: isFocused ? 1.01 : 1,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="flex items-end">
              {/* Text Input */}
              <TextareaAutosize
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Type a message... 💭"
                disabled={disabled}
                maxRows={6}
                className="flex-1 resize-none bg-transparent px-4 py-3 text-text-primary placeholder-text-secondary outline-none"
              />

              {/* Emoji Button */}
              <motion.button
                type="button"
                className="flex-shrink-0 p-2 m-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-sidebar transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Smile size={20} />
              </motion.button>
            </div>
          </motion.div>

          {/* Send Button - Always visible but only active when there's text */}
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="flex-shrink-0 p-3 rounded-full bg-text-accent text-white hover:bg-btn-primary-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </form>

        {/* Quick Actions - Always visible */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "Ask me anything",
            "Help with work",
            "Plan my day",
            "Food suggestions",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onChange(suggestion)}
              className="px-3 py-1.5 text-xs bg-bg-sidebar text-text-secondary rounded-full hover:bg-bg-sidebar/80 hover:text-text-primary transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
