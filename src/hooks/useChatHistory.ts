"use client";

import { createClient } from "@/lib/supabase/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { api } from "@/lib/trpc/client";
import { Tables } from "@/types/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

const supabase = createClient();

const subscriptionState: {
  channel: RealtimeChannel | null;
  status: "idle" | "subscribing" | "subscribed" | "error";
} = {
  channel: null,
  status: "idle",
};

const setupSubscription = async (getToken?: () => Promise<string | null>) => {
  if (
    subscriptionState.status === "subscribed" ||
    subscriptionState.status === "subscribing"
  ) {
    return;
  }

  subscriptionState.status = "subscribing";

  try {
    // Use Clerk JWT if available, otherwise fall back to regular client
    let clientToUse = supabase;

    if (getToken) {
      const token = await getToken();
      if (token) {
        clientToUse = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          }
        );
      }
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

    // Note: For realtime subscriptions with RLS, we need proper JWT authentication
    // The subscription will be filtered server-side based on RLS policies
    const channel = clientToUse
      .channel("chat-history-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chats",
        },
        handleNewChat
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chats",
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
  const { getToken } = useAuth();
  const {
    data: chats,
    isLoading: loading,
    error,
    refetch,
  } = api.chat.historyList.useQuery({});

  useEffect(() => {
    const tokenGetter = () => getToken({ template: "supabase" });
    setupSubscription(tokenGetter);
  }, [getToken]);

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
    chats: chats || [],
    loading,
    error: error ? error.message : null,
    refetch,
  };
};
