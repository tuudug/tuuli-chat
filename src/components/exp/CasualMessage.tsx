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

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`flex items-end gap-3 max-w-sm lg:max-w-lg ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar */}
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 bg-text-accent rounded-full flex items-center justify-center text-white text-sm font-bold">
            🌙
          </div>
        )}

        {/* Message Bubble */}
        <motion.div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? "bg-text-accent text-white rounded-br-lg"
              : "bg-bg-sidebar text-text-primary rounded-bl-lg border border-border-primary"
          }`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
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
