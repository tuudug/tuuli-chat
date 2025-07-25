"use client";

import { motion } from "framer-motion";
import { formatTimeAgo } from "@/lib/dateUtils";
import { Message } from "@/types/messages";

interface CasualMessageProps {
  message: Message;
}

export default function CasualMessage({ message }: CasualMessageProps) {
  const isUser = message.role === "user";
  const timeAgo = formatTimeAgo(message.timestamp);
  const hasToolsUsed = message.toolsUsed && message.toolsUsed.length > 0;

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case "save_memory":
        return "💾";
      default:
        return "🔧";
    }
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`flex items-end gap-3 max-w-sm lg:max-w-lg ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar */}
        {!isUser && (
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
              hasToolsUsed ? "bg-purple-500" : "bg-text-accent"
            }`}
          >
            {hasToolsUsed ? "🤖" : "🌙"}
          </div>
        )}

        {/* Message Bubble */}
        <motion.div
          className={`px-4 py-3 rounded-2xl relative ${
            isUser
              ? "bg-text-accent text-white rounded-br-lg"
              : hasToolsUsed
              ? "bg-gradient-to-r from-purple-50 to-blue-50 text-text-primary rounded-bl-lg border border-purple-200"
              : "bg-bg-sidebar text-text-primary rounded-bl-lg border border-border-primary"
          }`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {/* Tool Usage Indicator */}
          {hasToolsUsed && !isUser && (
            <div className="flex items-center gap-1 mb-2 text-xs text-purple-600 font-medium">
              <span className="text-purple-500">⚡</span>
              <span>Used tools:</span>
              {message.toolsUsed?.map((tool) => (
                <span key={tool} className="inline-flex items-center gap-1">
                  {getToolIcon(tool)}
                  <span className="capitalize">{tool.replace("_", " ")}</span>
                </span>
              ))}
            </div>
          )}

          {/* Message Content */}
          <div className="text-sm leading-relaxed">{message.content}</div>

          {/* Timestamp */}
          <div
            className={`text-xs mt-2 ${
              isUser ? "text-white/60" : "text-text-secondary"
            }`}
          >
            {timeAgo}
          </div>
        </motion.div>

        {/* User avatar placeholder for alignment */}
        {isUser && <div className="w-8 h-8 flex-shrink-0" />}
      </div>
    </div>
  );
}
