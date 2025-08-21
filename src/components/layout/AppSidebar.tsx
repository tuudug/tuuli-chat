"use client";

import ChatHistoryList from "@/components/chat/ChatHistoryList";
import UserProfileWidget from "@/components/user/UserProfileWidget";
import { PlusIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { useChatLayout } from "@/contexts/ChatLayoutContext";

const AppSidebarContent = () => {
  const { activeChatId } = useChatLayout();

  // Handle New Chat click - detect pseudo-state where we're on /chat/new but have an effective chat ID
  const handleNewChatClick = (e: React.MouseEvent) => {
    // Check if we're in pseudo-state by looking at browser URL vs route
    const currentUrl = window.location.pathname;
    const isInPseudoState =
      activeChatId === "new" && currentUrl !== "/chat/new";

    if (isInPseudoState) {
      e.preventDefault(); // Prevent default Link behavior

      // Dispatch event to reset chat state and navigate properly
      window.dispatchEvent(new CustomEvent("reset-to-new-chat"));

      // Reset browser URL to /chat/new
      window.history.pushState(null, "", "/chat/new");
    }
    // If not in pseudo-state, let the Link component handle navigation normally
  };

  return (
    <div className="relative h-full flex flex-col bg-bg-sidebar text-text-primary space-y-4">
      <div className="pt-6 px-3">
        <div className="flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Logo"
            width={0}
            height={0}
            sizes="100vw"
            className="w-auto h-10 max-w-[120px] cursor-pointer hover:opacity-80 transition-opacity"
            priority
          />
        </div>
      </div>

      <div className="px-3">
        <Link
          href="/chat/new"
          onClick={handleNewChatClick}
          className={`w-full px-4 py-2 rounded-md bg-btn-primary hover:bg-btn-primary-hover text-text-primary text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
            activeChatId === "new" ? "bg-bg-input" : ""
          }`}
        >
          <PlusIcon size={16} />
          New Chat
        </Link>
      </div>

      <ChatHistoryList />
      <UserProfileWidget />
    </div>
  );
};

export default function AppSidebar() {
  return <AppSidebarContent />;
}
