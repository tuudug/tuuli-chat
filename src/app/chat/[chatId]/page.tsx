"use client";

import React, { useEffect, useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import ChatNotFound from "@/components/ChatNotFound";
import { notFound, useSearchParams, useParams } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { api } from "@/lib/trpc/client";

type ValidationStatus = "valid" | "not_found" | "unauthorized" | "loading";

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const searchParams = useSearchParams();
  const isNewChat = searchParams.get("newChat") === "true";
  const [validationStatus, setValidationStatus] =
    useState<ValidationStatus>("loading");

  // Use tRPC to validate chat ownership
  const {
    data: isOwner,
    isLoading,
    error,
  } = api.chat.isOwner.useQuery(
    { chatId },
    {
      enabled: chatId !== "new" && !isNewChat,
      retry: false,
    }
  );

  useEffect(() => {
    if (chatId === "new" || isNewChat) {
      setValidationStatus("valid");
      return;
    }

    if (isLoading) {
      setValidationStatus("loading");
    } else if (error) {
      if (error.data?.code === "UNAUTHORIZED") {
        setValidationStatus("unauthorized");
      } else {
        setValidationStatus("not_found");
      }
    } else if (isOwner === false) {
      setValidationStatus("not_found");
    } else if (isOwner === true) {
      setValidationStatus("valid");
    }
  }, [chatId, isNewChat, isOwner, isLoading, error]);

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
