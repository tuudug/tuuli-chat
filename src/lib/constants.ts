import type { GeminiModelId } from "./types";

export const MODEL_PRICES: Record<
  GeminiModelId,
  { input: number; output: number }
> = {
  "gemini-2.0-flash-lite": {
    input: 0.075 / 1_000_000,
    output: 0.3 / 1_000_000,
  },
  "gemini-2.0-flash": { input: 0.1 / 1_000_000, output: 0.4 / 1_000_000 },
  "gemini-2.5-flash-preview-05-20": {
    input: 0.15 / 1_000_000,
    output: 0.6 / 1_000_000,
  },
  "gemini-2.5-pro-preview-05-06": {
    input: 1.25 / 1_000_000,
    output: 10.0 / 1_000_000,
  },
  // Add other models here if they become available and are used
};

// It was mentioned that PRO_MODEL_ID might not be strictly needed for the analytics page itself,
// but it's good for consistency if used elsewhere for rate limiting.
// If it's already defined in types.ts or another constants file, this can be removed or reconciled.
export const PRO_MODEL_ID: GeminiModelId = "gemini-2.5-pro-preview-05-06";

export const DATE_RANGE_OPTIONS = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

export type DateRangeValue = (typeof DATE_RANGE_OPTIONS)[number]["value"];
