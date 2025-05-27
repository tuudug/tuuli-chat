import React from "react";
import ChatInterface from "@/components/ChatInterface";
import ChatNotFound from "@/components/ChatNotFound";
import { createServer } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ChatPage({
  params,
  searchParams,
}: ChatPageProps) {
  const { chatId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  // Allow "new" chat without validation OR if it's a client-side generated ID with newChat=true
  if (
    chatId === "new" ||
    (chatId && resolvedSearchParams?.newChat === "true")
  ) {
    return <ChatInterface chatId={chatId} />;
  }

  // Validate chat existence and ownership for existing chats (that are not part of the newChat=true flow)
  const supabase = await createServer();

  // Get the current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // User not authenticated, redirect to 404
    notFound();
  }

  // Check if chat exists and belongs to the user
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id, user_id")
    .eq("id", chatId)
    .single();

  if (chatError || !chat) {
    // Chat doesn't exist
    return <ChatNotFound reason="not_found" />;
  }

  if (chat.user_id !== user.id) {
    // Chat exists but doesn't belong to the user
    return <ChatNotFound reason="unauthorized" />;
  }

  // Chat exists and belongs to the user
  return <ChatInterface chatId={chatId} />;
}
