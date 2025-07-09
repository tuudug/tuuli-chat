"use client";

import React, { useEffect, useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import ChatNotFound from "@/components/ChatNotFound";
import { createClient } from "@/lib/supabase/client";
import { notFound, useSearchParams, useParams } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

type ValidationStatus = "valid" | "not_found" | "unauthorized" | "loading";

async function validateChat(chatId: string): Promise<ValidationStatus> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "unauthorized";

  const { data: chat, error } = await supabase
    .from("chats")
    .select("user_id")
    .eq("id", chatId)
    .single();

  if (error || !chat) return "not_found";
  if (chat.user_id !== user.id) return "unauthorized";

  return "valid";
}

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const searchParams = useSearchParams();
  const isNewChat = searchParams.get("newChat") === "true";
  const [validationStatus, setValidationStatus] =
    useState<ValidationStatus>("loading");

  useEffect(() => {
    if (chatId === "new" || isNewChat) {
      setValidationStatus("valid");
      return;
    }

    const checkChat = async () => {
      const status = await validateChat(chatId);
      setValidationStatus(status);
    };

    checkChat();
  }, [chatId, isNewChat]);

  if (validationStatus === "loading") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (validationStatus === "not_found") {
    return <ChatNotFound reason="not_found" />;
  }

  if (validationStatus === "unauthorized") {
    notFound();
  }

  return <ChatInterface chatId={chatId} />;
}
