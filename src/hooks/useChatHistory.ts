"use client";

import { createClient } from "@/lib/supabase/client";
import { createBrowserClient } from "@supabase/ssr";
import { api } from "@/lib/trpc/client";
// Import debug utility for development
import "@/lib/supabase/realtime-debug";

import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

export const useChatHistory = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribingRef = useRef(false);
  const {
    data: chats,
    isLoading: loading,
    error,
    refetch,
  } = api.chat.historyList.useQuery({});

  useEffect(() => {
    // Only set up realtime if user is authenticated and not already subscribing
    if (!user || isSubscribingRef.current) return;

    let cleanup: (() => void) | null = null;

    const setupRealtime = async () => {
      try {
        // Prevent multiple simultaneous subscription attempts
        if (isSubscribingRef.current || channelRef.current) {
          console.log("Realtime subscription already exists, skipping...");
          return;
        }

        isSubscribingRef.current = true;
        console.log("Setting up realtime subscription for chat history...");

        // Get authenticated Supabase client
        const token = await getToken({ template: "supabase" });
        const supabase = token
          ? createBrowserClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              {
                global: {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              }
            )
          : createClient();

        // Create unique channel name to avoid conflicts
        const channelName = `chat-history-${user.id}-${Date.now()}`;

        // Create realtime subscription with simplified configuration
        const channel = supabase
          .channel(channelName)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "chats",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log("New chat detected via realtime:", payload.new);
              refetch();
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "chats",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log("Chat updated via realtime:", payload.new);
              refetch();
            }
          )
          .on(
            "postgres_changes",
            {
              event: "DELETE",
              schema: "public",
              table: "chats",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log("Chat deleted via realtime:", payload.old);
              refetch();
            }
          )
          .subscribe((status, err) => {
            console.log("Realtime subscription status:", status);
            if (err) {
              console.error("Realtime subscription error:", err);
              isSubscribingRef.current = false;
            } else if (status === "SUBSCRIBED") {
              console.log("✅ Successfully subscribed to chat history changes");
            } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
              console.warn(
                "Realtime subscription closed or errored, will use fallback events only"
              );
              isSubscribingRef.current = false;
            }
          });

        channelRef.current = channel;

        cleanup = () => {
          if (channelRef.current) {
            console.log("Cleaning up realtime subscription...");
            channelRef.current.unsubscribe();
            channelRef.current = null;
          }
          isSubscribingRef.current = false;
        };
      } catch (error) {
        console.error("Failed to setup realtime subscription:", error);
        isSubscribingRef.current = false;
      }
    };

    setupRealtime();

    // Listen for manual chat events (fallback for realtime)
    const handleChatInsert = () => {
      console.log("Chat insert event received, refetching...");
      refetch();
    };

    const handleChatUpdate = () => {
      console.log("Chat update event received, refetching...");
      refetch();
    };

    const handleChatDeleted = () => {
      console.log("Chat deleted event received, refetching...");
      refetch();
    };

    window.addEventListener("chat-history-insert", handleChatInsert);
    window.addEventListener("chat-history-update", handleChatUpdate);
    window.addEventListener("chatDeleted", handleChatDeleted);

    return () => {
      cleanup?.();
      window.removeEventListener("chat-history-insert", handleChatInsert);
      window.removeEventListener("chat-history-update", handleChatUpdate);
      window.removeEventListener("chatDeleted", handleChatDeleted);
    };
  }, [user, getToken, refetch]);

  return {
    chats: chats || [],
    loading,
    error: error ? error.message : null,
    refetch,
  };
};
