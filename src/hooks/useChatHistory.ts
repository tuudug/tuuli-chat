"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/types/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

const supabase = createClient();

// A more robust state machine to manage the singleton subscription
// and prevent race conditions from React Strict Mode's double-invokes.
const subscriptionState: {
  channel: RealtimeChannel | null;
  status: "idle" | "subscribing" | "subscribed" | "error";
} = {
  channel: null,
  status: "idle",
};

const setupSubscription = async () => {
  // If we are already subscribed or in the process of subscribing, do nothing.
  if (
    subscriptionState.status === "subscribed" ||
    subscriptionState.status === "subscribing"
  ) {
    return;
  }

  // Set status to 'subscribing' immediately to win the race condition.
  subscriptionState.status = "subscribing";

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // If no user, reset to idle and exit.
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
          // Reset to idle to allow a retry on the next component mount.
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
  const [chats, setChats] = useState<Tables<"chats">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setChats([]);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;
      setChats(data || []);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An unknown error occurred.";
      console.error("Error fetching chat history:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
    setupSubscription();

    const handleInsert = (event: Event) => {
      const newChat = (event as CustomEvent).detail;
      setChats((currentChats) => {
        if (currentChats.some((chat) => chat.id === newChat.id)) {
          return currentChats;
        }
        return [newChat, ...currentChats];
      });
    };

    const handleUpdate = (event: Event) => {
      const updatedChat = (event as CustomEvent).detail;
      setChats((currentChats) =>
        currentChats.map((chat) =>
          chat.id === updatedChat.id ? updatedChat : chat
        )
      );
    };

    const handleChatDeleted = () => fetchChats();

    window.addEventListener("chat-history-insert", handleInsert);
    window.addEventListener("chat-history-update", handleUpdate);
    window.addEventListener("chatDeleted", handleChatDeleted);

    return () => {
      window.removeEventListener("chat-history-insert", handleInsert);
      window.removeEventListener("chat-history-update", handleUpdate);
      window.removeEventListener("chatDeleted", handleChatDeleted);
    };
  }, [fetchChats]);

  return { chats, loading, error, refetch: fetchChats };
};
