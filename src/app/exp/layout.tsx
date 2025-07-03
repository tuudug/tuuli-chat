"use client";
import React, { useState } from "react";
import ToolsSidebar from "@/components/exp/ToolsSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { MenuIcon } from "lucide-react";
import { SparksProvider } from "@/contexts/SparksContext";
import { PinProvider } from "@/contexts/PinContext";
import PinModal from "@/components/dialogs/PinModal";

interface ExpLayoutProps {
  children: React.ReactNode;
}

export default function ExpLayout({ children }: ExpLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default to open on desktop
  const [showThreads, setShowThreads] = useState(false);

  // Mobile variant: Slides in/out
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

  // Desktop variant: Animates width and opacity
  const desktopSidebarVariants = {
    open: {
      width: "18rem", // w-72
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
    <SparksProvider>
      <PinProvider>
        <PinModal />
        <div className="flex h-screen relative overflow-hidden">
          {/* Sidebar for Desktop - Conditionally rendered with AnimatePresence */}
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
                {/* Content container needs fixed width */}
                <div className="h-full overflow-y-auto w-72">
                  <ToolsSidebar
                    showThreads={showThreads}
                    onToggleThreads={() => setShowThreads(!showThreads)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sidebar for Mobile (Overlay) */}
          <motion.div
            key="mobile-sidebar"
            className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-bg-sidebar h-screen shadow-xl"
            initial={false}
            animate={isSidebarOpen ? "open" : "closed"}
            variants={mobileSidebarVariants}
            style={{ pointerEvents: isSidebarOpen ? "auto" : "none" }}
          >
            <div className="h-full overflow-y-auto">
              <ToolsSidebar
                showThreads={showThreads}
                onToggleThreads={() => setShowThreads(!showThreads)}
              />
            </div>
          </motion.div>

          {/* Overlay for Mobile - Conditionally rendered */}
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

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col bg-bg-primary h-screen overflow-y-auto relative">
            {/* Hamburger Menu Button - Mobile */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden fixed top-4 left-4 z-[60] p-2 bg-bg-sidebar rounded-md text-text-primary hover:bg-opacity-80"
              aria-label="Toggle sidebar"
            >
              <MenuIcon size={24} />
            </button>
            {/* Toggle Button - Desktop */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:block absolute top-4 left-4 z-10 p-2 bg-bg-input rounded-md text-text-primary hover:bg-opacity-80"
              aria-label="Toggle sidebar"
            >
              <MenuIcon size={20} />
            </button>

            {/* Render children (CasualChatInterface) */}
            {React.cloneElement(children as React.ReactElement, {
              showThreads,
            })}
          </div>
        </div>
      </PinProvider>
    </SparksProvider>
  );
}
