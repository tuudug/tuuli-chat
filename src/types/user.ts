import { GeminiModelId } from "./models";

// --- User Profile and Limits ---

export type UserProfile = {
  id: string;
  is_verified: boolean;
  daily_message_count: number;
  daily_pro_message_count: number;
  last_message_reset_at: string; // TIMESTAMPTZ as string
  created_at: string;
  updated_at: string;
  // Sparks-related fields to match Supabase schema
  current_sparks: number | null;
  last_sparks_claim_at: string | null;
  total_sparks_earned: number | null;
  total_sparks_spent: number | null;
};

export const LIMITS = {
  NON_VERIFIED: {
    GENERAL_MESSAGES_PER_DAY: 100,
    PRO_MESSAGES_PER_DAY: 10,
  },
  VERIFIED: {
    GENERAL_MESSAGES_PER_DAY: Infinity,
    PRO_MESSAGES_PER_DAY: 500,
  },
  PRO_MODEL_ID: "gemini-2.5-pro" as GeminiModelId,
};
