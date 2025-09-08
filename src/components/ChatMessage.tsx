"use client"; // Needs client-side libraries for rendering

import React, { useState } from "react";
import Image from "next/image"; // Import next/image
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";
import { UserIcon, BotIcon, CopyIcon, CheckIcon } from "lucide-react";
import { Message } from "@/types";

import SearchReferences from "./chat/SearchReferences";

interface ChatMessageProps {
  message: Message; // Expect our Message type
  userAvatar?: string | null;
  isStreaming?: boolean;
}

export default function ChatMessage({
  message,
  userAvatar,
  isStreaming = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  const isErrorMessage = !!(
    message.role === "assistant" &&
    message.usage_metadata &&
    typeof message.usage_metadata === "object" &&
    (message.usage_metadata as { error?: unknown }).error
  );

  // Copy state management
  const [isCopied, setIsCopied] = useState(false);
  const [copiedCodeBlock, setCopiedCodeBlock] = useState<string | null>(null);

  // Copy functionality
  const copyToClipboard = async (
    text: string,
    isCodeBlock = false,
    blockId?: string
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isCodeBlock && blockId) {
        setCopiedCodeBlock(blockId);
        setTimeout(() => setCopiedCodeBlock(null), 2000);
      } else {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Extract attachment data
  const imageUrl = message.attachment_url;
  const imageName = message.attachment_name;
  const imageType = message.attachment_type;
  const localPreviewSrc = message.attachment_preview;

  const displayableImageSrc =
    imageUrl || (imageType?.startsWith("image/") ? localPreviewSrc : null);
  const isImageAttachment =
    isUser && imageType?.startsWith("image/") && displayableImageSrc;

  // Get timestamp
  const timestamp = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // Custom components for markdown rendering
  const components = {
    // Override paragraph to use animated text only for animating messages
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p {...props}>{children}</p>
    ),
    // Override other text elements
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong {...props}>{children}</strong>
    ),
    em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <em {...props}>{children}</em>
    ),
    code: ({
      inline,
      className,
      children,
      ...props
    }: {
      inline?: boolean;
      className?: string;
      children?: React.ReactNode;
    } & React.HTMLAttributes<HTMLElement>) => {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";
      const codeString = String(children).replace(/\n$/, "");
      const blockId = `${message.id || "msg"}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      if (!inline) {
        if (!language) {
          return (
            <code
              className={`${className} inline-block bg-gray-800 px-1 mx-1 py-1 rounded text-xs border border-gray-700 whitespace-nowrap`}
              {...props}
            >
              {children}
            </code>
          );
        }
        return (
          <div className="relative group/code w-full max-w-[calc(100vw-2rem)] sm:max-w-full">
            <div className="flex items-center justify-between bg-gray-800 px-3 py-2 text-xs text-gray-300 rounded-t-md border-b border-gray-700">
              <span className="truncate">{language}</span>
              <button
                onClick={() => copyToClipboard(codeString, true, blockId)}
                className="opacity-0 group-hover/code:opacity-100 transition-opacity flex items-center gap-1 hover:text-white flex-shrink-0 ml-2"
                title="Copy code"
              >
                {copiedCodeBlock === blockId ? (
                  <>
                    <CheckIcon size={14} />
                    <span className="hidden sm:inline">Copied!</span>
                  </>
                ) : (
                  <>
                    <CopyIcon size={14} />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-gray-900 px-3 rounded-b-md overflow-x-auto text-sm">
              <code
                className={`${className} text-sm whitespace-pre`}
                {...props}
              >
                {children}
              </code>
            </pre>
          </div>
        );
      } else {
        return (
          <code className={`${className} text-sm`} {...props}>
            {children}
          </code>
        );
      }
    },
  };

  // Use the full content for non-animating messages, animated content for animating ones
  const contentToRender = message.content;

  return (
    <>
      <style jsx>{`
        .prose strong {
          color: white !important;
          font-weight: 600;
        }
        .prose b {
          color: white !important;
          font-weight: 600;
        }
        .prose code {
          font-size: 0.875rem !important;
        }
        .prose pre {
          font-size: 0.875rem !important;
        }
        .prose > * {
          max-width: 100% !important;
        }
        .prose table {
          width: 100% !important;
          table-layout: auto !important;
        }
        .prose ul,
        .prose ol {
          width: 100% !important;
        }
        @media (max-width: 640px) {
          .prose *,
          .prose pre,
          .prose code,
          .prose div,
          .prose p {
            max-width: calc(100vw - 2rem) !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
          .prose pre {
            overflow-x: auto !important;
            white-space: pre !important;
          }
        }
      `}</style>
      <div
        className={`group flex items-start gap-3 ${
          isUser ? "justify-end" : "justify-start"
        } px-2 sm:px-0`}
      >
        {!isUser && (
          <div
            className={`hidden sm:flex w-8 h-8 rounded-full items-center justify-center bg-bg-input flex-shrink-0 transition-opacity ${
              isStreaming ? "opacity-0" : "opacity-100"
            }`}
          >
            <BotIcon size={16} className="text-text-secondary" />
          </div>
        )}
        <div
          className={`flex flex-col w-full max-w-[calc(100vw-1rem)] sm:max-w-[75%] ${
            isUser ? "items-end" : "items-start"
          }`}
        >
          <div className="relative group/message">
            <button
              onClick={() => copyToClipboard(message.content)}
              className={`absolute -top-2 -right-2 transition-opacity p-1.5 bg-gray-700 hover:bg-gray-600 rounded-full shadow-lg z-10 ${
                isStreaming
                  ? "opacity-0"
                  : "opacity-0 group-hover/message:opacity-100"
              }`}
              title="Copy message"
            >
              {isCopied ? (
                <CheckIcon size={14} className="text-green-400" />
              ) : (
                <CopyIcon
                  size={14}
                  className="text-gray-300 hover:text-white"
                />
              )}
            </button>
            <motion.div
              className={`p-3 rounded-lg max-w-[calc(100vw-1rem)] sm:max-w-full transition-colors ${
                isUser
                  ? "bg-btn-primary text-text-primary rounded"
                  : isErrorMessage
                  ? "bg-bg-input text-red-400 border border-red-200 rounded"
                  : isStreaming
                  ? "text-text-primary rounded"
                  : "bg-bg-input text-text-primary rounded"
              }`}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {isUser ? (
                <div className="text-sm">
                  {isImageAttachment && displayableImageSrc && (
                    <div className="mb-2 relative w-full max-w-[calc(100vw-4rem)] sm:max-w-[20rem] aspect-[5/4]">
                      <Image
                        src={displayableImageSrc}
                        alt={imageName || "Uploaded image"}
                        fill
                        className="rounded-md object-contain"
                      />
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ) : (
                <div className="prose prose-sm prose-invert  text-white w-full overflow-hidden max-w-[calc(100vw-2rem)] sm:max-w-full">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[rehypeKatex]}
                    components={components}
                  >
                    {contentToRender + (isStreaming ? " ●" : "")}
                  </ReactMarkdown>
                  {message.search_references && (
                    <SearchReferences references={message.search_references} />
                  )}
                </div>
              )}
            </motion.div>
          </div>
          <div
            className={`flex items-center gap-2 text-xs mt-1 text-text-secondary transition-opacity ${
              isUser
                ? "group-hover:opacity-100 opacity-0"
                : isStreaming
                ? "opacity-0"
                : "opacity-100"
            }`}
          >
            <span>{timestamp}</span>
          </div>
        </div>
        {isUser && (
          <div className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center bg-bg-input flex-shrink-0 overflow-hidden">
            {userAvatar ? (
              <Image
                src={userAvatar}
                alt="User Avatar"
                width={32}
                height={32}
                className="object-cover w-full h-full"
              />
            ) : (
              <UserIcon size={16} className="text-text-secondary" />
            )}
          </div>
        )}
      </div>
    </>
  );
}
