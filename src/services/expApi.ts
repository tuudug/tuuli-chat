import { vanillaTrpcClient } from "@/lib/trpc/client";
import { Tables } from "@/types/supabase";

export type ExpMessage = Omit<Tables<"exp_messages">, "role"> & {
  role: "user" | "assistant";
};

// Fetches the initial data for the exp chat
export const fetchExpChatHistory = async (
  cursor?: string | null,
  limit?: number
) => {
  return await vanillaTrpcClient.exp.history.query({ cursor, limit });
};

// Sends messages to the exp chat API and returns a single message object
export const sendExpChatMessage = async (messages: ExpMessage[]) => {
  return await vanillaTrpcClient.exp.sendMessage.mutate({
    messages,
  });
};
