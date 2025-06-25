// --- Sparks Definitions ---

// Sparks system constants
export const SPARKS = {
  DAILY_CLAIM: {
    NON_VERIFIED: 5000,
    VERIFIED: 10000,
  },
  // Minimum cost per message
  MIN_COST: 1,
} as const;

// Sparks-related types
export type SparkTransaction = {
  id: string;
  user_id: string;
  transaction_type: "daily_claim" | "message_cost" | "admin_adjustment";
  amount: number;
  balance_after: number;
  message_id?: string;
  model_used?: string;
  estimated_tokens?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type SparkBalance = {
  current_sparks: number;
  can_claim_today: boolean;
  is_verified: boolean;
  last_claim_at: string;
};
