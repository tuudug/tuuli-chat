"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MenuIcon } from "lucide-react";
import ImageHistorySidebar from "@/components/image/ImageEditorSidebar";

interface ImageAppLayoutProps {
  children: React.ReactNode;
}

export default function ImageAppLayout({ children }: ImageAppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const mobileSidebarVariants = {
    open: {
      x: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
    closed: {
      x: "-100%",
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
  };

  const desktopSidebarVariants = {
    open: {
      width: "18rem",
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
        duration: 0.2,
      },
    },
    closed: {
      width: 0,
      opacity: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
        duration: 0.2,
      },
    },
  };

  return (
    <div className="flex h-screen relative overflow-hidden">
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            key="desktop-sidebar"
            className="hidden md:block flex-shrink-0 bg-bg-sidebar h-screen overflow-hidden"
            initial="closed"
            animate="open"
            exit="closed"
            variants={desktopSidebarVariants}
          >
            <div className="h-full overflow-y-auto w-72">
              <ImageHistorySidebar />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        key="mobile-sidebar"
        className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-bg-sidebar h-screen shadow-xl"
        initial={false}
        animate={isSidebarOpen ? "open" : "closed"}
        variants={mobileSidebarVariants}
        style={{ pointerEvents: isSidebarOpen ? "auto" : "none" }}
      >
        <div className="h-full overflow-y-auto">
          <ImageHistorySidebar />
        </div>
      </motion.div>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col bg-bg-primary h-screen overflow-y-auto relative">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="md:hidden fixed top-4 left-4 z-[60] p-2 bg-bg-sidebar rounded-md text-text-primary hover:bg-opacity-80"
          aria-label="Toggle sidebar"
        >
          <MenuIcon size={24} />
        </button>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden md:block absolute top-4 left-4 z-10 p-2 bg-bg-input rounded-md text-text-primary hover:bg-opacity-80"
          aria-label="Toggle sidebar"
        >
          <MenuIcon size={20} />
        </button>

        {children}
      </div>
    </div>
  );
}
