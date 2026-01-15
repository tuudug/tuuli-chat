import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { GoogleGenAI, type Content } from "@google/genai";
import { handleMessageLimit, refundMessageCost, USER_TIERS } from "./user";
import { type GeminiModelId } from "@/types/models";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
});

const TRANSCRIBE_MODEL = "gemini-3-pro-preview";

// Retry configuration
const MAX_RETRIES = 100; // Will retry for up to ~5 seconds
const RETRY_DELAY_MS = 50; // 50ms between retries
const MAX_RETRY_TIME_MS = 5000; // Cap at 5 seconds total

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function transcribeWithRetry(
  imageData: string,
  imageMimeType: string
): Promise<string> {
  const systemPrompt = `You are an expert at transcribing mathematical, scientific, and physics content from images.

Your task is to convert handwritten or printed mathematical notation, equations, formulas, and scientific text into clean, readable text with proper LaTeX formatting.

CRITICAL INSTRUCTIONS:
- Output ONLY the transcribed content
- Do NOT add any introductions, explanations, or commentary
- Do NOT say things like "Here is the transcription:" or "The content shows:"
- Do NOT provide analysis or descriptions
- Start immediately with the actual transcribed content
- End immediately after the last piece of content

FORMATTING GUIDELINES:
- Use LaTeX for ALL mathematical expressions, equations, and symbols
- Inline math should be wrapped in $...$
- Display math (standalone equations) should be wrapped in $$...$$
- Preserve the exact structure and organization of the content as it appears
- Include variable definitions and explanations exactly as written
- For complex expressions, ensure proper LaTeX syntax (use \\frac{}{} for fractions, \\sqrt{} for roots, etc.)
- Transcribe exactly what you see - don't solve or simplify
- If there are multiple equations or steps, preserve their order and structure
- Include any text labels, annotations, or explanations exactly as they appear
- Use proper LaTeX commands for Greek letters (\\alpha, \\beta, etc.), operators (\\sum, \\int, etc.), and special symbols

Remember: Output ONLY the pure transcription with no additional text before or after.`;

  const contents: Content[] = [
    {
      role: "user",
      parts: [
        { text: systemPrompt },
        {
          inlineData: {
            data: imageData,
            mimeType: imageMimeType,
          },
        },
      ],
    },
  ];

  let lastError: Error | null = null;
  const startTime = Date.now();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Check if we've exceeded the time limit
    if (Date.now() - startTime > MAX_RETRY_TIME_MS) {
      throw new Error(
        `Transcription timeout after ${MAX_RETRY_TIME_MS}ms. Last error: ${
          lastError?.message || "Unknown error"
        }`
      );
    }

    try {
      const response = await genAI.models.generateContent({
        model: TRANSCRIBE_MODEL,
        contents,
        config: {
          temperature: 0.4,
        },
      });

      const text = response.text;
      if (!text || text.trim().length === 0) {
        throw new Error("Empty response from model");
      }

      return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Check if it's a retryable error (overload, rate limit, etc.)
      const errorMessage = lastError.message.toLowerCase();
      const isRetryable =
        errorMessage.includes("overload") ||
        errorMessage.includes("503") ||
        errorMessage.includes("429") ||
        errorMessage.includes("resource exhausted") ||
        errorMessage.includes("rate limit");

      if (!isRetryable) {
        // Non-retryable error, throw immediately
        throw lastError;
      }

      // Wait before retrying
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw new Error(
    `Failed after ${MAX_RETRIES} attempts. Last error: ${
      lastError?.message || "Unknown error"
    }`
  );
}

export const transcribeRouter = createTRPCRouter({
  transcribe: protectedProcedure
    .input(
      z.object({
        image: z.object({
          content: z.string(),
          name: z.string(),
          type: z.string(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      }

      // Check if user is premium
      const supabaseAdmin = createSupabaseServiceRoleClient();
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .select("tier")
        .eq("id", user.id)
        .single();

      if (profileError || !userProfile) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch user profile",
        });
      }

      if (userProfile.tier !== USER_TIERS.PREMIUM) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Transcription is only available for Premium users",
        });
      }

      // Transcription costs 1 message
      try {
        await handleMessageLimit(user.id, TRANSCRIBE_MODEL as GeminiModelId, 1);
      } catch (err) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            err instanceof Error ? err.message : "Message limit exceeded",
        });
      }

      try {
        // Extract base64 data
        const base64Data = input.image.content.includes(",")
          ? input.image.content.split(",")[1]
          : input.image.content;

        // Call the retry-enabled transcription
        const transcribedText = await transcribeWithRetry(
          base64Data,
          input.image.type
        );

        return {
          success: true,
          text: transcribedText,
        };
      } catch (err) {
        // Refund the message cost on failure
        await refundMessageCost(user.id, TRANSCRIBE_MODEL as GeminiModelId, 1);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Transcription failed",
        });
      }
    }),
});
