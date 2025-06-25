import type { GeminiModelId } from "../types/models";

export const MODEL_PRICES: Record<
  GeminiModelId,
  { input: number; output: number }
> = {
  // Gemini 2.5 Models
  "gemini-2.5-pro": {
    input: 1.25 / 1_000_000,
    output: 10.0 / 1_000_000,
  },
  "gemini-2.5-flash": {
    input: 0.3 / 1_000_000,
    output: 2.5 / 1_000_000,
  },
  "gemini-2.5-flash-lite-preview-06-17": {
    input: 0.1 / 1_000_000,
    output: 0.4 / 1_000_000,
  },
  // Gemini 2.0 Models
  "gemini-2.0-flash": {
    input: 0.1 / 1_000_000,
    output: 0.4 / 1_000_000,
  },
  "gemini-2.0-flash-lite": {
    input: 0.075 / 1_000_000,
    output: 0.3 / 1_000_000,
  },
};

// Updated to use the new Pro model ID
// Model multipliers for sparks cost transparency
// Based on gemini-2.5-flash as baseline (1.0x) with nice round progression
export const MODEL_MULTIPLIERS: Record<GeminiModelId, number> = {
  // Gemini 2.0 Models (economy tier)
  "gemini-2.0-flash-lite": 0.1, // Most economical option
  "gemini-2.0-flash": 0.2, // Budget option

  // Gemini 2.5 Models
  "gemini-2.5-flash-lite-preview-06-17": 0.2, // Same tier as 2.0-flash
  "gemini-2.5-flash": 1.0, // Baseline - balanced performance/cost
  "gemini-2.5-pro": 4.0, // Premium tier - highest capability
};

// Model display names for UI
export const MODEL_DISPLAY_NAMES: Record<GeminiModelId, string> = {
  "gemini-2.5-pro": "Pro",
  "gemini-2.5-flash": "Flash",
  "gemini-2.5-flash-lite-preview-06-17": "Flash Lite",
  "gemini-2.0-flash": "Flash",
  "gemini-2.0-flash-lite": "Flash Lite",
};

export const PRO_MODEL_ID: GeminiModelId = "gemini-2.5-pro";

export const DATE_RANGE_OPTIONS = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

export type DateRangeValue = (typeof DATE_RANGE_OPTIONS)[number]["value"];
