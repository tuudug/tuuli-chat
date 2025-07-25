// --- Message Definitions ---

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model_used?: string; // Optional: Track which model generated the response
  created_at: string;
  timestamp: Date; // Add timestamp for casual chat
  attachment_url?: string | null; // From DB
  attachment_name?: string | null; // From DB
  attachment_type?: string | null; // From DB
  attachment_preview?: string | null; // For local base64 preview before upload
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  sparks_cost?: number | null; // Add sparks cost field
  estimated_input_tokens?: number | null;
  estimated_output_tokens?: number | null;
  search_references?: { url: string; title: string }[] | null;
  isNew?: boolean; // Client-side flag for new messages to animate
  isThread?: boolean; // For thread functionality
  toolsUsed?: string[]; // Track which tools were used in generating this message
  data?: {
    ui_model_used?: string;
    ui_created_at?: string;
    [key: string]: unknown; // Use unknown instead of any for stricter typing
  };
};

// --- Thread Definitions for Casual Chat ---

export type Thread = {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  lastActivity: Date;
  isActive: boolean;
};
