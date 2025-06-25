"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { MessageSquareIcon } from "lucide-react";
import { useChatHistory } from "@/hooks/useChatHistory";

export default function ChatHistoryList() {
  const { chats, loading, error } = useChatHistory();
  const params = useParams();
  const currentChatId = params?.chatId as string | undefined;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center px-3">
        <div className="animate-pulse text-gray-400">Loading chats...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 text-center text-red-400">
        <p>Error loading chats:</p>
        <p className="text-xs">{error}</p>
      </div>
    );
  }

  return (
    <ScrollArea.Root className="flex-1 overflow-hidden w-full px-3">
      <ScrollArea.Viewport className="h-full w-full rounded">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 text-text-secondary">
            <MessageSquareIcon className="mb-2" size={32} />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {chats.map((chat) => (
              <li key={chat.id}>
                <Link
                  href={`/chat/${chat.id}`}
                  className={`block w-full text-left px-2 py-1.5 rounded text-sm text-text-primary hover:bg-bg-input focus:outline-none focus:bg-bg-input transition-colors truncate ${
                    currentChatId === chat.id ? "bg-bg-input" : ""
                  }`}
                >
                  {chat.title ||
                    `Chat ${new Date(chat.created_at).toLocaleDateString()}`}
                </Link>
              </li>
            ))}
          </ul>
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
  );
}
