// Define shared types for the application

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model_used?: string; // Optional: Track which model generated the response
  created_at: string;
  attachment_url?: string | null; // From DB
  attachment_name?: string | null; // From DB
  attachment_type?: string | null; // From DB
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  data?: {
    ui_model_used?: string;
    ui_created_at?: string;
    attachment?: {
      // For local preview of base64 before it's uploaded and has a URL
      type: string;
      content: string; // Base64 string
      name: string;
    };
    [key: string]: unknown; // Use unknown instead of any for stricter typing
  };
};

// --- Model Definitions ---

export type GeminiModelId =
  | "gemini-2.5-pro"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite-preview-06-17"
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite";

export interface ModelDetail {
  id: GeminiModelId;
  name: string;
  description: string;
  version: "2.0" | "2.5";
  performance: "Pro" | "Flash" | "Flash Lite";
  stars: number;
  supportsFiles: boolean;
}

export const MODEL_DETAILS: ModelDetail[] = [
  // Gemini 2.5 Models
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Most capable model with highest performance and accuracy",
    version: "2.5",
    performance: "Pro",
    stars: 5,
    supportsFiles: true,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Fast and efficient with excellent performance",
    version: "2.5",
    performance: "Flash",
    stars: 3,
    supportsFiles: true,
  },
  {
    id: "gemini-2.5-flash-lite-preview-06-17",
    name: "Gemini 2.5 Flash Lite",
    description: "Lightweight version optimized for speed and cost",
    version: "2.5",
    performance: "Flash Lite",
    stars: 2,
    supportsFiles: false,
  },
  // Gemini 2.0 Models
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Fast and efficient model from previous generation",
    version: "2.0",
    performance: "Flash",
    stars: 2,
    supportsFiles: true,
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite",
    description: "Most cost-effective option with good performance",
    version: "2.0",
    performance: "Flash Lite",
    stars: 1,
    supportsFiles: false,
  },
];

export const DEFAULT_MODEL_ID: GeminiModelId = "gemini-2.0-flash-lite";

// Type alias for backward compatibility or specific use cases if needed
export type GeminiModel = GeminiModelId;

export type ResponseLengthSetting = "brief" | "detailed";

export const DEFAULT_RESPONSE_LENGTH_SETTING: ResponseLengthSetting = "brief";

// You can add other shared types here as the application grows

// --- User Profile and Limits ---

export type UserProfile = {
  id: string;
  is_verified: boolean;
  daily_message_count: number;
  daily_pro_message_count: number;
  last_message_reset_at: string; // TIMESTAMPTZ as string
  created_at: string;
  updated_at: string;
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
