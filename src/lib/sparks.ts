import { MODEL_MULTIPLIERS } from "./constants";
import type { GeminiModelId } from "../types/models";

/**
 * Calculate sparks cost for a message based on token usage
 * @param modelId - The model being used
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens (defaults to inputTokens if not provided)
 * @returns Estimated sparks cost
 */
export function calculateSparksCost(
  modelId: GeminiModelId,
  inputTokens: number,
  outputTokens?: number,
  useSearch?: boolean
): number {
  // This function is now for client-side *estimation only*.
  // The authoritative calculation is done by the `calculate_sparks_cost` function in the database.
  // This estimation uses a simplified baseline to show users the *relative* cost between models.

  const estimatedOutput = outputTokens || inputTokens;
  const totalTokens = inputTokens + estimatedOutput;

  // Baseline cost: ~25 sparks per 1k tokens for a 1.0x multiplier model.
  // This is a simplified approximation for UI purposes.
  const BASE_SPARKS_PER_1K_TOKENS = 25;

  const modelMultiplier = MODEL_MULTIPLIERS[modelId] || 0.1; // Default to cheapest multiplier

  let estimatedCost =
    (totalTokens / 1000) * BASE_SPARKS_PER_1K_TOKENS * modelMultiplier;

  if (useSearch) {
    estimatedCost *= 1.2; // 20% increase for search grounding
  }

  // Ensure a minimum cost of 1 spark for display
  return Math.max(1, Math.ceil(estimatedCost));
}

/**
 * Estimate token count for a text string
 * This is a rough estimation - actual token count may vary
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  // This is a simplification - actual tokenization is more complex
  return Math.ceil(text.length / 4);
}

/**
 * Calculate estimated sparks cost for a conversation
 * @param messages - Array of message content strings
 * @param currentMessage - The current message being typed
 * @param modelId - The model being used
 * @returns Estimated sparks cost
 */
export function estimateConversationCost(
  messages: string[],
  currentMessage: string,
  modelId: GeminiModelId,
  useSearch?: boolean
): number {
  // Calculate total input tokens (all conversation history + current message)
  const allContent = [...messages, currentMessage].join(" ");
  const inputTokens = estimateTokenCount(allContent);

  // Estimate output tokens as equal to input tokens (conservative estimate)
  const outputTokens = inputTokens;

  return calculateSparksCost(modelId, inputTokens, outputTokens, useSearch);
}

/**
 * Format sparks number for display
 * @param sparks - Number of sparks
 * @returns Formatted string
 */
export function formatSparks(sparks: number): string {
  if (sparks >= 1000000) {
    return `${(sparks / 1000000).toFixed(1)}M`;
  } else if (sparks >= 1000) {
    return `${(sparks / 1000).toFixed(1)}K`;
  }
  return sparks.toString();
}
