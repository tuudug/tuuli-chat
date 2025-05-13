"use client"; // Needs client-side libraries for rendering

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { UserIcon, BotIcon } from "lucide-react";
import { Message, MODEL_DETAILS } from "@/lib/types"; // Use our Message type and MODEL_DETAILS

interface ChatMessageProps {
  message: Message; // Expect our Message type
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isProModel =
    message.role === "assistant" &&
    message.model_used === "gemini-2.5-pro-preview-05-06";

  // Get friendly model name if it's an assistant message
  const modelName =
    message.role === "assistant" && message.model_used
      ? MODEL_DETAILS.find((m) => m.id === message.model_used)?.name
      : null;

  // Use created_at from our Message type
  const timestamp = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Gradient border style for Pro model messages
  const proBorderStyle = isProModel
    ? "p-0.5 bg-gradient-to-r from-purple-400 to-pink-600 rounded-lg" // Apply gradient to a wrapper
    : "";

  return (
    <div
      className={`group flex items-start gap-3 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-bg-input flex-shrink-0">
          <BotIcon size={16} className="text-text-secondary" />
        </div>
      )}

      {/* Message Bubble and Metadata */}
      <div
        className={`flex flex-col max-w-[75%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* Optional Gradient Border Wrapper for Pro Model */}
        <div className={proBorderStyle}>
          <div
            className={`p-3 rounded-lg ${
              isUser
                ? "bg-btn-primary text-text-primary rounded" // User style
                : "bg-bg-input text-text-primary rounded" // Assistant style
            } ${isProModel ? "rounded-[7px]" : ""}`} // Slightly smaller radius inside border
          >
            {isUser ? (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none text-white">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* Metadata: Timestamp and Model Name */}
        <div
          className={`flex items-center gap-2 text-xs mt-1 text-text-secondary ${
            isUser ? "group-hover:opacity-100 opacity-0" : "opacity-100" // Keep hover for user
          } transition-opacity`}
        >
          {modelName && <span className="font-medium">{modelName}</span>}
          <span>{timestamp}</span>
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-bg-input flex-shrink-0">
          <UserIcon size={16} className="text-text-secondary" />
        </div>
      )}
    </div>
  );
}
