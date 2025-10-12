"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MessageCircle, Image as ImageIcon } from "lucide-react";

export default function ChatImageToggle() {
  const pathname = usePathname();
  const isChatMode = pathname.startsWith("/chat") || pathname === "/";
  const isImageMode = pathname.startsWith("/image");

  return (
    <div className="flex items-center gap-0.5  bg-bg-input rounded-md border border-border-primary">
      <Link
        href="/chat/new"
        className={`relative flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          isChatMode
            ? "text-text-primary"
            : "text-text-secondary hover:text-text-primary"
        }`}
      >
        {isChatMode && (
          <motion.div
            layoutId="chat-image-toggle"
            className="absolute inset-0 bg-bg-primary border border-border-primary rounded"
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          />
        )}
        <MessageCircle size={12} className="relative z-10" />
        <span className="relative z-10">Chat</span>
      </Link>

      <Link
        href="/image/new"
        className={`relative flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          isImageMode
            ? "text-text-primary"
            : "text-text-secondary hover:text-text-primary"
        }`}
      >
        {isImageMode && (
          <motion.div
            layoutId="chat-image-toggle"
            className="absolute inset-0 bg-bg-primary border border-border-primary rounded"
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          />
        )}
        <ImageIcon size={12} className="relative z-10" />
        <span className="relative z-10">Image</span>
      </Link>
    </div>
  );
}
