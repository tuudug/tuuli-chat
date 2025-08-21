"use client";

import { api } from "@/lib/trpc/client";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export const useChatHistory = () => {
  const { user } = useUser();
  const {
    data: chats,
    isLoading: loading,
    error,
    refetch,
  } = api.chat.historyList.useQuery({});

  useEffect(() => {
    // Only listen for events when user is authenticated
    if (!user) return;

    // Listen for new chat creation with title set
    const handleNewChatWithTitle = () => {
      refetch();
    };

    // Listen for chat deletion
    const handleChatDeleted = () => {
      refetch();
    };

    window.addEventListener("chat-created-with-title", handleNewChatWithTitle);
    window.addEventListener("chatDeleted", handleChatDeleted);

    return () => {
      window.removeEventListener("chat-created-with-title", handleNewChatWithTitle);
      window.removeEventListener("chatDeleted", handleChatDeleted);
    };
  }, [user, refetch]);

  return {
    chats: chats || [],
    loading,
    error: error ? error.message : null,
    refetch,
  };
};
