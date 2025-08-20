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
  supportsSearch: boolean;
  supportsFast: boolean;
  cost: number;
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
    supportsSearch: true,
    supportsFast: false,
    cost: 2,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Fast and efficient with excellent performance",
    version: "2.5",
    performance: "Flash",
    stars: 3,
    supportsFiles: true,
    supportsSearch: true,
    supportsFast: false,
    cost: 1,
  },
  {
    id: "gemini-2.5-flash-lite-preview-06-17",
    name: "Gemini 2.5 Flash Lite",
    description: "Lightweight version optimized for speed and cost",
    version: "2.5",
    performance: "Flash Lite",
    stars: 2,
    supportsFiles: false,
    supportsSearch: false,
    supportsFast: true,
    cost: 1,
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
    supportsSearch: false,
    supportsFast: false,
    cost: 1,
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite",
    description: "Most cost-effective option with good performance",
    version: "2.0",
    performance: "Flash Lite",
    stars: 1,
    supportsFiles: false,
    supportsSearch: false,
    supportsFast: true,
    cost: 1,
  },
];

export const DEFAULT_MODEL_ID: GeminiModelId = "gemini-2.0-flash-lite";

// Type alias for backward compatibility or specific use cases if needed
export type GeminiModel = GeminiModelId;
