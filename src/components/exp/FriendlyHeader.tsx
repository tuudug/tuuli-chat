"use client";

import { motion } from "framer-motion";
import { MessageCircle, Menu } from "lucide-react";

interface FriendlyHeaderProps {
  onToggleThreads: () => void;
  showThreads: boolean;
  threadCount: number;
}

export default function FriendlyHeader({
  onToggleThreads,
  showThreads,
  threadCount,
}: FriendlyHeaderProps) {
  return (
    <motion.div
      className="px-6 py-4 bg-bg-sidebar border-b border-border-primary"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Profile & Status */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 bg-text-accent rounded-full flex items-center justify-center text-lg font-bold text-white">
              🌙
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-bg-sidebar" />
          </div>

          <div>
            <h1 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              Luna
              <span className="text-sm">✨</span>
            </h1>
            <p className="text-sm text-text-secondary flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              Online & ready to chat
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <motion.button
            onClick={onToggleThreads}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              showThreads
                ? "bg-text-accent text-white"
                : "bg-bg-input text-text-secondary hover:text-text-primary hover:bg-bg-input/80"
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <MessageCircle size={16} />
            <span>Threads</span>
            {threadCount > 0 && (
              <span className="bg-white text-text-accent text-xs px-2 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                {threadCount}
              </span>
            )}
          </motion.button>

          <motion.button
            className="p-2 rounded-lg bg-bg-input text-text-secondary hover:text-text-primary hover:bg-bg-input/80 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Menu size={18} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
