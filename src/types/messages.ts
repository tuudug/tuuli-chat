// --- Message Definitions ---

export type Message = {
  // Database fields (matching supabase.ts messages table)
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  model_used?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  search_references?: { url: string; title: string }[] | null;
  usage_metadata?: Record<string, unknown> | null;

  // Client-side only fields (not in database)
  attachment_preview?: string | null; // For local base64 preview before upload
  isNew?: boolean; // Client-side flag for new messages to animate
  isStreaming?: boolean;
};
