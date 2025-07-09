import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { GoogleGenAI, type Content, type Part } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
});

const createExpSystemPrompt = (): Content => {
  const promptContent = `You are a friendly and casual AI. Your personality is like a close friend. Use informal language, short sentences. Be fun and engaging. Keep punctuation use to a minimum. Do not use markdown. Use emojis sparesely, and only when appropriate. Keep responses to one or two sentences. The user's previous messages are provided as a reference. But if the current message is not related at all to the previous messages, you can ignore the previous messages.`;
  return {
    role: "system",
    parts: [{ text: promptContent }],
  };
};

export const expRouter = createTRPCRouter({
  history: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).nullish(),
        cursor: z.string().nullish(), // Cursor will be a timestamp
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      const limit = input.limit ?? 10;
      const { cursor } = input;

      let query = supabase
        .from("exp_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }) // Add secondary sort for stability
        .limit(limit + 2); // Fetch extra message to avoid missing edge cases

      if (cursor) {
        // For now, use simple timestamp-based cursor
        // This should work for most cases since created_at has microsecond precision
        query = query.lt("created_at", cursor);
      }

      const { data: messages, error: messagesError } = await query;

      if (messagesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch messages",
        });
      }

      let nextCursor: typeof cursor | undefined = undefined;
      if (messages.length > limit) {
        // Remove extra messages and use the last one for cursor
        while (messages.length > limit) {
          const nextItem = messages.pop();
          if (!nextCursor) {
            nextCursor = nextItem!.created_at;
          }
        }
      }

      return {
        messages: messages.reverse(),
        nextCursor,
      };
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            id: z.string(),
            role: z.enum(["user", "assistant"]),
            content: z.string(),
            created_at: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      const { messages } = input;
      const modelId = "gemini-2.5-flash-lite-preview-06-17";

      if (!messages || messages.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing required fields",
        });
      }

      const lastUserMessage = messages[messages.length - 1];

      await supabase.from("exp_messages").insert({
        user_id: user.id,
        role: "user",
        content: lastUserMessage.content,
      });

      const messagesForLlm: Content[] = messages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const systemPromptObject = createExpSystemPrompt();
      const systemPromptText =
        (systemPromptObject.parts?.[0] as Part)?.text || "";

      const contentsForLlm = [
        { role: "user" as const, parts: [{ text: systemPromptText }] },
        {
          role: "model" as const,
          parts: [{ text: "Okay, I will follow these instructions." }],
        },
        ...messagesForLlm,
      ];

      const resultStream = await genAI.models.generateContentStream({
        model: modelId,
        contents: contentsForLlm,
      });

      let assistantResponseText = "";
      for await (const chunk of resultStream) {
        const text = chunk.text;
        if (typeof text === "string") {
          assistantResponseText += text;
        }
      }

      const { data: assistantMessageShell, error: shellError } = await supabase
        .from("exp_messages")
        .insert({
          user_id: user.id,
          role: "assistant",
          content: assistantResponseText,
        })
        .select("id, created_at, role, content")
        .single();

      if (shellError || !assistantMessageShell) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save assistant message.",
        });
      }

      return {
        message: assistantMessageShell,
      };
    }),
});
