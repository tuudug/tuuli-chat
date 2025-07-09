"use client";

import { motion } from "framer-motion";
import { MenuIcon } from "lucide-react";
import React from "react";

interface FriendlyHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  selectedTool: string;
}

const toolInfo: Record<
  string,
  { name: string; icon: string; description: string }
> = {
  luna: {
    name: "Luna",
    icon: "🌙",
    description: "Online",
  },
  threads: {
    name: "Threads",
    icon: "🧵",
    description: "Your conversation topics",
  },
  todos: {
    name: "Todos",
    icon: "✅",
    description: "Manage your tasks and to-do lists",
  },
  memories: {
    name: "Memories",
    icon: "🧠",
    description: "AI remembers important information for you",
  },
  notes: {
    name: "Notes",
    icon: "📝",
    description: "Quick notes and ideas",
  },
  calendar: {
    name: "Calendar",
    icon: "📅",
    description: "Schedule and events",
  },
  bookmarks: {
    name: "Bookmarks",
    icon: "🔖",
    description: "Saved links and pages",
  },
  documents: {
    name: "Documents",
    icon: "📄",
    description: "Files and documents",
  },
  insights: {
    name: "Insights",
    icon: "📊",
    description: "Analytics and trends",
  },
  search: { name: "Search", icon: "🔍", description: "Find anything" },
  attachments: {
    name: "Files",
    icon: "📎",
    description: "Shared attachments",
  },
  reminders: {
    name: "Reminders",
    icon: "🔔",
    description: "Never forget important things",
  },
  journal: {
    name: "Journal",
    icon: "📖",
    description: "Daily reflections",
  },
  mood: { name: "Mood", icon: "❤️", description: "Track how you feel" },
  settings: {
    name: "Settings",
    icon: "⚙️",
    description: "Customize your experience",
  },
};

export default function FriendlyHeader({
  isSidebarOpen,
  setIsSidebarOpen,
  selectedTool,
}: FriendlyHeaderProps) {
  const currentTool = toolInfo[selectedTool] || {
    name: "Unknown Tool",
    icon: "❓",
    description: "Tool description",
  };

  return (
    <motion.div
      className="py-4 bg-bg-sidebar border-b border-border-primary"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-start px-4 max-w-4xl mx-auto">
        {/* Hamburger Menu Button - Mobile */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-bg-sidebar rounded-md text-text-primary hover:bg-opacity-80 mr-4"
          aria-label="Toggle sidebar"
        >
          <MenuIcon size={24} />
        </button>
        {/* Profile & Status */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 bg-text-accent rounded-full flex items-center justify-center text-lg font-bold text-white">
              {currentTool.icon}
            </div>
          </div>

          <div>
            <h1 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              {currentTool.name}
              {selectedTool === "luna" && <span className="text-sm">✨</span>}
            </h1>
            <p className="text-sm text-text-secondary flex items-center gap-1">
              {selectedTool === "luna" ? (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  Online
                </>
              ) : (
                currentTool.description
              )}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
