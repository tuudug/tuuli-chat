"use client";

import { motion } from "framer-motion";
import { formatTimeAgo } from "@/lib/dateUtils";
import { MessageSquare, Clock } from "lucide-react";
import { Thread } from "@/types/messages";

interface ThreadCardProps {
  thread: Thread;
  onClick?: () => void;
}

export default function ThreadCard({ thread, onClick }: ThreadCardProps) {
  const timeAgo = formatTimeAgo(thread.lastActivity);

  return (
    <motion.div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
        thread.isActive
          ? "bg-text-accent/10 border-text-accent"
          : "bg-bg-input border-border-primary hover:bg-bg-input/80 hover:border-text-secondary"
      }`}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Thread Header */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm text-text-primary line-clamp-1">
          {thread.title}
        </h4>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            thread.isActive
              ? "bg-text-accent text-white"
              : "bg-bg-sidebar text-text-secondary"
          }`}
        >
          {thread.messageCount}
        </span>
      </div>

      {/* Thread Preview */}
      <p className="text-xs text-text-secondary mb-3 line-clamp-2">
        {thread.preview}
      </p>

      {/* Thread Footer */}
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <div className="flex items-center gap-1">
          <MessageSquare size={12} />
          <span>{thread.messageCount} messages</span>
        </div>

        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>{timeAgo}</span>
        </div>
      </div>

      {/* Active indicator */}
      {thread.isActive && (
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-purple-500 rounded-r-full"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.2 }}
        />
      )}
    </motion.div>
  );
}
