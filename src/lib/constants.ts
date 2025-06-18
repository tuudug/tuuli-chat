import type { GeminiModelId } from "./types";

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
export const PRO_MODEL_ID: GeminiModelId = "gemini-2.5-pro";

export const DATE_RANGE_OPTIONS = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

export type DateRangeValue = (typeof DATE_RANGE_OPTIONS)[number]["value"];
