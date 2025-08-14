import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Fetches user memories from the database
 */
export const fetchUserMemories = async (
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string[]> => {
  const { data: memories, error } = await supabase
    .from("user_memories")
    .select("content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20); // Limit to recent 20 memories to avoid context overflow

  if (error) {
    console.error("Error fetching user memories:", error);
    return [];
  }

  return memories?.map((memory) => memory.content) || [];
};
