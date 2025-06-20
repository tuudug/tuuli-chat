"use client"; // Needs client-side libraries for rendering

import React from "react";
import Image from "next/image"; // Import next/image
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { UserIcon, BotIcon } from "lucide-react";
import { Message, MODEL_DETAILS } from "@/lib/types";
import FinalSparksCost from "./FinalSparksCost";

interface ChatMessageProps {
  message: Message; // Expect our Message type
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isProModel =
    message.role === "assistant" && message.model_used === "gemini-2.5-pro";

  // Extract attachment data if present (for user messages with images)
  // Prioritize DB fields for URL, then fallback to local data for preview
  const localAttachmentPreview = message.data?.attachment as
    | { type: string; content: string; name: string }
    | undefined;

  const imageUrl = message.attachment_url;
  const imageName = message.attachment_name || localAttachmentPreview?.name;
  const imageType = message.attachment_type || localAttachmentPreview?.type;

  const displayableImageSrc =
    imageUrl ||
    (localAttachmentPreview?.type?.startsWith("image/")
      ? localAttachmentPreview?.content
      : null);
  const isImageAttachment =
    isUser && imageType?.startsWith("image/") && displayableImageSrc;

  // Get model identifier, preferring message.model_used, then fallback to message.data.ui_model_used
  const modelIdentifier = message.model_used || message.data?.ui_model_used;

  const modelName =
    message.role === "assistant" && modelIdentifier
      ? MODEL_DETAILS.find((m) => m.id === modelIdentifier)?.name
      : null;

  // Use created_at, fallback to ui_created_at from message.data for immediate display
  const createdAtSource = message.created_at || message.data?.ui_created_at;
  const timestamp = createdAtSource
    ? new Date(createdAtSource).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""; // Display empty or a placeholder if no date is available

  const sparksCost = message.sparks_cost;

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
              <div className="text-sm">
                {isImageAttachment && displayableImageSrc && (
                  <div className="mb-2 relative" style={{ width: 'auto', height: 'auto', maxWidth: '20rem', maxHeight: '16rem' }}> {/* Adjust wrapper for layout */}
                    <Image
                      src={displayableImageSrc}
                      alt={imageName || "Uploaded image"}
                      width={320} // max-w-xs is 20rem = 320px
                      height={256} // max-h-64 is 16rem = 256px
                      className="rounded-md" // Removed object-contain, as it's a prop
                      style={{ objectFit: "contain" }} // Use style for object-fit
                    />
                  </div>
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
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

        {/* Metadata: Timestamp, Model Name, and Sparks Cost */}
        <div
          className={`flex items-center gap-2 text-xs mt-1 text-text-secondary ${
            isUser ? "group-hover:opacity-100 opacity-0" : "opacity-100" // Keep hover for user
          } transition-opacity`}
        >
          {modelName && <span className="font-medium">{modelName}</span>}
          {modelName && timestamp && <span>•</span>}
          <span>{timestamp}</span>
          {/* Render the final sparks cost for assistant messages */}
          {!isUser && sparksCost && sparksCost > 0 && (
            <>
              <span>•</span>
              <FinalSparksCost cost={sparksCost} />
            </>
          )}
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
