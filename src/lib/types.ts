// Define shared types for the application

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model_used?: string; // Optional: Track which model generated the response
  created_at: string;
};

// --- Model Definitions ---

export type GeminiModelId =
  | "gemini-2.5-pro-preview-05-06"
  | "gemini-2.5-flash-preview-04-17"
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite"; // Added new model ID

export interface ModelDetail {
  id: GeminiModelId;
  name: string;
  stars: number;
}

export const MODEL_DETAILS: ModelDetail[] = [
  {
    id: "gemini-2.5-pro-preview-05-06",
    name: "Gemini 2.5 Pro",
    stars: 4,
  },
  {
    id: "gemini-2.5-flash-preview-04-17",
    name: "Gemini 2.5 Flash",
    stars: 3,
  },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", stars: 2 },
  { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", stars: 1 },
];

export const DEFAULT_MODEL_ID: GeminiModelId = "gemini-2.0-flash-lite";

// Type alias for backward compatibility or specific use cases if needed
export type GeminiModel = GeminiModelId;

// You can add other shared types here as the application grows
