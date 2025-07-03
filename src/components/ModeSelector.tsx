"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, MessageCircle } from "lucide-react";

export default function ModeSelector() {
  const pathname = usePathname();
  const isExperimental = pathname.startsWith("/exp");
  const isClassic = pathname.startsWith("/chat") || pathname === "/";

  return (
    <div className="flex items-center gap-2 p-1 bg-bg-input rounded-lg border border-border-primary">
      <Link
        href="/chat/new"
        className={`relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isClassic
            ? "text-text-primary"
            : "text-text-secondary hover:text-text-primary"
        }`}
      >
        {isClassic && (
          <motion.div
            layoutId="mode-selector"
            className="absolute inset-0 bg-bg-primary border border-border-primary rounded-md"
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          />
        )}
        <MessageCircle size={16} className="relative z-10" />
        <span className="relative z-10">Classic</span>
      </Link>

      <Link
        href="/exp"
        className={`relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isExperimental
            ? "text-text-primary"
            : "text-text-secondary hover:text-text-primary"
        }`}
      >
        {isExperimental && (
          <motion.div
            layoutId="mode-selector"
            className="absolute inset-0 bg-bg-primary border border-border-primary rounded-md"
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          />
        )}
        <Zap size={16} className="relative z-10" />
        <span className="relative z-10">Experimental</span>
      </Link>
    </div>
  );
}
