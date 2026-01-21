"use client";

import React from "react";
import ChatInterface from "@/components/ChatInterface";
import { useSearchParams, useParams } from "next/navigation";

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const searchParams = useSearchParams();
  const isNewChat = searchParams.get("newChat") === "true";

  // Render ChatInterface immediately - it handles its own loading/error states
  // The chat.history query in useChat validates ownership and shows errors if needed
  return <ChatInterface chatId={isNewChat ? "new" : chatId} />;
}
