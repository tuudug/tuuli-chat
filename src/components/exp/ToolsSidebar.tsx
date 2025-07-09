"use client";

import SparksDisplay from "@/components/SparksDisplay";
import UserProfileWidget from "@/components/user/UserProfileWidget";
import {
  BarChart3,
  Bell,
  Bookmark,
  BookOpen,
  Brain,
  Calendar,
  CheckSquare,
  FileText,
  Heart,
  MessageSquare,
  Paperclip,
  Search,
  Settings,
  StickyNote,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

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

interface ConversationItemProps {
  isActive?: boolean;
  onClick?: () => void;
}

const LunaConversationItem: React.FC<ConversationItemProps> = ({
  isActive = false,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 flex items-center gap-3 transition-colors duration-150 ${
        isActive ? "bg-text-accent/10" : "hover:bg-bg-input"
      }`}
    >
      {/* Profile Picture */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 bg-text-accent rounded-full flex items-center justify-center text-lg font-bold text-white">
          🌙
        </div>
        {/* Online status */}
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-bg-sidebar"></div>
      </div>

      {/* Conversation Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary text-sm truncate">
            Luna ✨
          </h3>
          <span className="text-xs text-text-secondary ml-2 flex-shrink-0">
            2m ago
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-text-secondary truncate">
            Hey there! 👋 I&apos;m Luna, your friendly AI companion...
          </p>
          {/* Unread indicator */}
          <div className="w-2 h-2 bg-text-accent rounded-full ml-2 flex-shrink-0"></div>
        </div>
      </div>
    </button>
  );
};

interface ToolItemProps {
  tool: Tool;
  onClick: () => void;
  isActive?: boolean;
}

const ToolItem: React.FC<ToolItemProps> = ({
  tool,
  onClick,
  isActive = false,
}) => {
  const IconComponent = tool.icon;

  return (
    <button
      onClick={onClick}
      disabled={tool.comingSoon}
      className={`w-full py-3 px-3 my-2 flex items-center gap-3 transition-colors duration-150 rounded-lg ${
        isActive ? "bg-[#8774e1]" : "hover:bg-bg-input"
      } ${
        tool.comingSoon ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {/* Tool Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-bg-input flex items-center justify-center">
        <IconComponent
          size={18}
          className={`${
            isActive
              ? "text-text-accent"
              : tool.comingSoon
              ? "text-text-secondary"
              : "text-text-primary"
          }`}
        />
      </div>

      {/* Tool Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm truncate">
            {tool.name}
            {tool.comingSoon && (
              <span className="ml-2 text-xs text-text-secondary">
                (Coming Soon)
              </span>
            )}
          </h4>
        </div>
        <p className="text-sm text-gray-300 truncate mt-0.5">
          {tool.description}
        </p>
      </div>
    </button>
  );
};

interface ToolsSidebarProps {
  selectedTool?: string;
  onToolSelect?: (toolId: string) => void;
}

export default function ToolsSidebar({
  selectedTool,
  onToolSelect,
}: ToolsSidebarProps) {
  const handleToolClick = (toolId: string) => {
    onToolSelect?.(toolId);
    console.log(`Opening ${toolId}...`);
  };

  const handleLunaClick = () => {
    // Navigate to Luna chat or make it active
    onToolSelect?.("luna");
  };

  return (
    <div className="relative h-full flex flex-col bg-bg-sidebar text-text-primary overflow-hidden">
      {/* Header */}
      <div className="pt-6 px-4 pb-4">
        <div className="flex items-center justify-between">
          <Link href="/chat/new" className="relative group">
            <Image
              src="/logo.png"
              alt="Logo"
              width={0}
              height={0}
              sizes="100vw"
              className="w-auto h-8 max-w-[100px] cursor-pointer hover:opacity-80 transition-opacity"
              priority
            />
            <span className="absolute -top-1 -right-1 z-50 bg-purple-600 before:text-white text-[10px] px-1.5 rounded-full font-medium">
              exp
            </span>
          </Link>
          <SparksDisplay />
        </div>
      </div>

      {/* Conversations Section */}
      <div className="border-b border-border-primary">
        <div className="px-4 py-2"></div>
        <LunaConversationItem
          isActive={selectedTool === "luna"}
          onClick={handleLunaClick}
        />
      </div>

      {/* Tools Section */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="px-3 pb-4 mt-4">
          {tools.map((tool) => (
            <ToolItem
              key={tool.id}
              tool={tool}
              onClick={() => handleToolClick(tool.id)}
              isActive={selectedTool === tool.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
