"use client";

import { usePin } from "@/contexts/PinContext";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/trpc/client";
import { Tables } from "@/types/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect } from "react";

const supabase = createClient();

const subscriptionState: {
  channel: RealtimeChannel | null;
  status: "idle" | "subscribing" | "subscribed" | "error";
} = {
  channel: null,
  status: "idle",
};

const setupSubscription = async () => {
  if (
    subscriptionState.status === "subscribed" ||
    subscriptionState.status === "subscribing"
  ) {
    return;
  }

  subscriptionState.status = "subscribing";

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      subscriptionState.status = "idle";
      return;
    }

    const handleNewChat = (payload: { new: Tables<"chats"> }) => {
      window.dispatchEvent(
        new CustomEvent("chat-history-insert", { detail: payload.new })
      );
    };

    const handleUpdatedChat = (payload: { new: Tables<"chats"> }) => {
      window.dispatchEvent(
        new CustomEvent("chat-history-update", { detail: payload.new })
      );
    };

    const channel = supabase
      .channel("chat-history-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chats",
          filter: `user_id=eq.${user.id}`,
        },
        handleNewChat
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chats",
          filter: `user_id=eq.${user.id}`,
        },
        handleUpdatedChat
      )
      .subscribe((status, err) => {
        if (err) {
          console.error("Realtime subscription error:", err);
          if (subscriptionState.channel) {
            supabase.removeChannel(subscriptionState.channel);
          }
          subscriptionState.channel = null;
          subscriptionState.status = "idle";
        }
      });

    subscriptionState.channel = channel;
    subscriptionState.status = "subscribed";
  } catch (err) {
    console.error("Failed to setup subscription:", err);
    subscriptionState.status = "error";
  }
};

export const useChatHistory = () => {
  const { isPinValidated, storedPin } = usePin();

  const {
    data: chats,
    isLoading: loading,
    error,
    refetch,
  } = api.chat.historyList.useQuery(
    {
      pin: storedPin || undefined,
    },
    {
      enabled: isPinValidated,
    }
  );

  useEffect(() => {
    if (isPinValidated) {
      setupSubscription();
    }
  }, [isPinValidated]);

  useEffect(() => {
    const handleInsert = () => refetch();
    const handleUpdate = () => refetch();
    const handleChatDeleted = () => refetch();

    window.addEventListener("chat-history-insert", handleInsert);
    window.addEventListener("chat-history-update", handleUpdate);
    window.addEventListener("chatDeleted", handleChatDeleted);

    return () => {
      window.removeEventListener("chat-history-insert", handleInsert);
      window.removeEventListener("chat-history-update", handleUpdate);
      window.removeEventListener("chatDeleted", handleChatDeleted);
    };
  }, [refetch]);

  return {
    chats: isPinValidated ? chats || [] : [],
    loading,
    error: error ? error.message : null,
    refetch,
  };
};
