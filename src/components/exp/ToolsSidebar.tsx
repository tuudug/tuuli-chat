"use client";

import React from "react";
import Image from "next/image";
import {
  MessageSquare,
  CheckSquare,
  Brain,
  StickyNote,
  Calendar,
  Bookmark,
  Mic,
  FileText,
  BarChart3,
  Search,
  Paperclip,
  Bell,
  BookOpen,
  Heart,
  Settings,
} from "lucide-react";
import SparksDisplay from "@/components/SparksDisplay";
import UserProfileWidget from "@/components/user/UserProfileWidget";
import Link from "next/link";

interface Tool {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
  comingSoon?: boolean;
}

const tools: Tool[] = [
  {
    id: "threads",
    name: "Threads",
    icon: MessageSquare,
    description: "Conversation topics",
  },
  {
    id: "todos",
    name: "Todos",
    icon: CheckSquare,
    description: "Task management",
  },
  {
    id: "memories",
    name: "Memories",
    icon: Brain,
    description: "AI remembers for you",
  },
  {
    id: "notes",
    name: "Notes",
    icon: StickyNote,
    description: "Quick notes & ideas",
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: Calendar,
    description: "Schedule & events",
    comingSoon: true,
  },
  {
    id: "bookmarks",
    name: "Bookmarks",
    icon: Bookmark,
    description: "Saved links & pages",
    comingSoon: true,
  },
  {
    id: "documents",
    name: "Documents",
    icon: FileText,
    description: "Files & documents",
    comingSoon: true,
  },
  {
    id: "insights",
    name: "Insights",
    icon: BarChart3,
    description: "Analytics & trends",
    comingSoon: true,
  },
  {
    id: "search",
    name: "Search",
    icon: Search,
    description: "Find anything",
    comingSoon: true,
  },
  {
    id: "attachments",
    name: "Files",
    icon: Paperclip,
    description: "Shared attachments",
    comingSoon: true,
  },
  {
    id: "reminders",
    name: "Reminders",
    icon: Bell,
    description: "Never forget",
    comingSoon: true,
  },
  {
    id: "journal",
    name: "Journal",
    icon: BookOpen,
    description: "Daily reflections",
    comingSoon: true,
  },
  {
    id: "mood",
    name: "Mood",
    icon: Heart,
    description: "Track how you feel",
    comingSoon: true,
  },
  {
    id: "settings",
    name: "Settings",
    icon: Settings,
    description: "Customize experience",
    comingSoon: true,
  },
];

interface ToolCardProps {
  tool: Tool;
  onClick: () => void;
  isActive?: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  onClick,
  isActive = false,
}) => {
  const IconComponent = tool.icon;

  return (
    <button
      onClick={onClick}
      disabled={tool.comingSoon}
      className={`relative group w-full h-14 p-2 rounded-md transition-colors duration-150 border ${
        isActive
          ? "border-text-accent bg-text-accent/10"
          : "border-border-primary"
      } ${
        tool.comingSoon
          ? "opacity-50 cursor-not-allowed bg-bg-input"
          : "hover:bg-bg-input cursor-pointer bg-bg-primary"
      }`}
    >
      <div className="flex flex-col items-center justify-center h-full space-y-1">
        <div className="flex items-center justify-center">
          <IconComponent
            size={16}
            className={`${
              isActive
                ? "text-text-accent"
                : tool.comingSoon
                ? "text-text-secondary"
                : "text-text-primary"
            }`}
          />
        </div>
        <div className="text-center">
          <p className="text-xs font-medium text-text-primary leading-tight">
            {tool.name}
          </p>
        </div>
      </div>
    </button>
  );
};

interface ToolsSidebarProps {
  showThreads?: boolean;
  onToggleThreads?: () => void;
}

export default function ToolsSidebar({
  showThreads = false,
  onToggleThreads,
}: ToolsSidebarProps) {
  const handleToolClick = (toolId: string) => {
    if (toolId === "threads" && onToggleThreads) {
      onToggleThreads();
    } else {
      console.log(`Opening ${toolId}...`);
    }
  };

  return (
    <div className="relative h-full flex flex-col bg-bg-sidebar text-text-primary space-y-4 overflow-hidden">
      <div className="pt-6 px-3">
        <div className="flex items-center justify-between">
          <Link href="/chat/new" className="relative group">
            <Image
              src="/logo.png"
              alt="Logo"
              width={0}
              height={0}
              sizes="100vw"
              className="w-auto h-10 max-w-[120px] cursor-pointer hover:opacity-80 transition-opacity"
              priority
            />
            <span className="absolute -top-1 -right-1 z-50 bg-purple-600 before:text-white text-[10px] px-1.5 rounded-full font-medium">
              exp
            </span>
          </Link>
          <SparksDisplay />
        </div>
      </div>

      {/* Tools Grid */}
      <div className="flex-1 px-3 pb-4">
        <div className="grid grid-cols-3 gap-y-2 gap-x-2">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onClick={() => handleToolClick(tool.id)}
              isActive={tool.id === "threads" && showThreads}
            />
          ))}
        </div>
      </div>

      <UserProfileWidget />
    </div>
  );
}
