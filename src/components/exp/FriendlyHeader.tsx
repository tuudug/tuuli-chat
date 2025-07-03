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
      className="pl-16 py-4 bg-bg-sidebar border-b border-border-primary"
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
          </div>

          <div>
            <h1 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              Luna
              <span className="text-sm">✨</span>
            </h1>
            <p className="text-sm text-text-secondary flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              Online
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
