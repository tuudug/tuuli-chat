import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { TRPCError } from "@trpc/server";

export interface DbExpMessage {
  id: string;
  user_id: string;
  role: string;
  content: string;
  created_at: string;
  tools_used: string[] | null;
}

export interface HistoryQuery {
  limit: number;
  cursor?: string;
}

export interface HistoryResult {
  messages: DbExpMessage[];
  nextCursor?: string;
}

/**
 * Builds a query for fetching message history
 */
export const buildHistoryQuery = (
  supabase: SupabaseClient<Database>,
  userId: string,
  { limit, cursor }: HistoryQuery
) => {
  let query = supabase
    .from("exp_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 2);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  return query;
};

/**
 * Processes raw history results and handles pagination
 */
export const processHistoryResults = (
  messages: DbExpMessage[],
  limit: number
): HistoryResult => {
  let nextCursor: string | undefined = undefined;

  if (messages.length > limit) {
    while (messages.length > limit) {
      const nextItem = messages.pop();
      if (!nextCursor) {
        nextCursor = nextItem!.created_at;
      }
    }
  }

  return {
    messages: messages.reverse(),
    nextCursor,
  };
};

/**
 * Saves a user message to the database
 */
export const saveUserMessage = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  content: string
) => {
  const { error } = await supabase.from("exp_messages").insert({
    user_id: userId,
    role: "user",
    content,
  });

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save user message",
    });
  }
};

/**
 * Saves an assistant message to the database
 */
export const saveAssistantMessage = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  content: string,
  toolsUsed?: string[]
) => {
  const { data: assistantMessage, error } = await supabase
    .from("exp_messages")
    .insert({
      user_id: userId,
      role: "assistant",
      content,
      tools_used: toolsUsed && toolsUsed.length > 0 ? toolsUsed : null,
    })
    .select("id, created_at, role, content, tools_used")
    .single();

  if (error || !assistantMessage) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save assistant message",
    });
  }

  return assistantMessage;
};
