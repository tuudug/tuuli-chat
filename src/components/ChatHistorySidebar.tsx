"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { createClient } from "@/lib/supabase/client";
import { PlusIcon, MessageSquareIcon } from "lucide-react";
import { Tables } from "../types/supabase";
import { useSparks } from "@/contexts/SparksContext";
import SparksDisplay from "./SparksDisplay";

// Define props interface
interface ChatHistorySidebarProps {
  chats: Tables<"chats">[];
  loading: boolean;
}

export default function ChatHistorySidebar({
  chats,
  loading: initialLoading, // Renamed to avoid conflict with internal loading
}: ChatHistorySidebarProps) {
  const params = useParams();
  const router = useRouter();
  const currentChatId = params?.chatId as string | undefined;

  const {
    userProfile,
    setSparksBalance,
    isLoading: profileLoading,
  } = useSparks();

  if (initialLoading || profileLoading) {
    return (
      <div className="h-full flex items-center justify-center px-3">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col bg-bg-sidebar text-text-primary space-y-4 overflow-hidden">
      <div className="pt-6 px-3">
        <div className="flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="Logo"
            width={0}
            height={0}
            sizes="100vw"
            className="w-auto h-10 max-w-[120px]"
            priority
          />
          <div className="flex-shrink-0 min-w-0 ml-2">
            <SparksDisplay
              userProfile={userProfile}
              onSparksUpdate={setSparksBalance}
            />
          </div>
        </div>
      </div>
      <div className="px-3">
        <Link
          href="/chat/new"
          className={`w-full px-4 py-2 rounded-md bg-btn-primary hover:bg-btn-primary-hover text-text-primary text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
            // Added whitespace-nowrap
            currentChatId === "new" ? "bg-bg-input" : "" // Highlight if 'new'
          }`}
        >
          <PlusIcon size={16} />
          New Chat
        </Link>
      </div>
      {/* TODO: Add Search Input here */}
      {/* <div className="relative px-3">
        <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          placeholder="Search your threads..."
          className="w-full pl-9 pr-3 py-1.5 rounded-md bg-bg-input border border-border-primary text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-btn-primary"
        />
      </div> */}
      {/* Scrollable Chat List - Added padding here */}
      <ScrollArea.Root className="flex-1 overflow-hidden w-full px-3">
        {" "}
        <ScrollArea.Viewport className="h-full w-full rounded">
          {" "}
          {/* Removed inner padding */}
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 text-text-secondary">
              <MessageSquareIcon className="mb-2" size={32} />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            <>
              {/* TODO: Implement grouping by date */}
              <ul className="space-y-1">
                {chats.map((chat) => (
                  <li key={chat.id}>
                    <Link
                      href={`/chat/${chat.id}`}
                      className={`block w-full text-left px-2 py-1.5 rounded text-sm text-text-primary hover:bg-bg-input focus:outline-none focus:bg-bg-input transition-colors truncate ${
                        // Keep item padding
                        currentChatId === chat.id ? "bg-bg-input" : "" // Highlight if current
                      }`}
                    >
                      {chat.title ||
                        `Chat ${new Date(
                          chat.created_at
                        ).toLocaleDateString()}`}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          className="flex select-none touch-none p-0.5 bg-transparent transition-colors duration-150 ease-out data-[orientation=vertical]:w-2"
        >
          <ScrollArea.Thumb className="flex-1 bg-text-secondary/50 hover:bg-text-secondary/70 rounded-full relative" />
        </ScrollArea.Scrollbar>
        <ScrollArea.Corner className="bg-transparent" />
      </ScrollArea.Root>
      {/* User Info/Logout Section */}
      <div className="sticky bottom-0 z-10 bg-bg-sidebar p-2 border-t border-border-primary">
        <button
          onClick={async () => {
            const supabase = createClient();
            const { error } = await supabase.auth.signOut();
            if (error) {
              console.error("Error logging out:", error.message);
            } else {
              router.push("/");
            }
          }}
          className="w-full px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
