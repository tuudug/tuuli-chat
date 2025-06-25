"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { PlusIcon } from "lucide-react";
import ChatHistoryList from "@/components/chat/ChatHistoryList";
import UserProfileWidget from "@/components/user/UserProfileWidget";

export default function AppSidebar() {
  const params = useParams();
  const currentChatId = params?.chatId as string | undefined;

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
        </div>
      </div>
      <div className="px-3">
        <Link
          href="/chat/new"
          className={`w-full px-4 py-2 rounded-md bg-btn-primary hover:bg-btn-primary-hover text-text-primary text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
            currentChatId === "new" ? "bg-bg-input" : ""
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
}
