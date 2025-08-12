import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { GoogleGenAI, type Content, type Part } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { User } from "@supabase/supabase-js";
import {
  saveMemoryToolDeclaration,
  saveMemoryProcedure,
} from "@/lib/tools/save_memory";

// Type for tool procedure functions with flexible args
type ToolProcedure = (
  ctx: { supabase: SupabaseClient<Database>; user: User },
  args: unknown
) => Promise<void>;

// Tool registry - maps tool names to their procedures and casts them to our flexible type
const TOOL_REGISTRY: Record<string, ToolProcedure> = {
  save_memory: saveMemoryProcedure as ToolProcedure,
};

// Get all tool declarations for the LLM
const getAllToolDeclarations = () => {
  return [saveMemoryToolDeclaration];
};

// Constants
const MODEL_ID = "gemini-2.5-flash-lite";

// Types
interface ExpMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface DbExpMessage {
  id: string;
  user_id: string;
  role: string;
  content: string;
  created_at: string;
  tools_used: string[] | null;
}

interface HistoryQuery {
  limit: number;
  cursor?: string;
}

interface HistoryResult {
  messages: DbExpMessage[];
  nextCursor?: string;
}

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
});

// System prompt configuration
const createExpSystemPrompt = (): Content => {
  const promptContent = `You are a friendly and casual AI. Your personality is like a close friend. Use informal language, short sentences. Be fun and engaging. Keep punctuation use to a minimum. Do not use markdown. Use emojis sparesely, and only when appropriate. Keep responses to one or two sentences. The user's previous messages are provided as a reference. But if the current message is not related at all to the previous messages, you can ignore the previous messages.`;
  return {
    role: "system",
    parts: [{ text: promptContent }],
  };
};

// Helper functions
const buildHistoryQuery = (
  supabase: SupabaseClient<Database>,
  userId: string,
  { limit, cursor }: HistoryQuery
) => {
  let query = supabase
    .from("exp_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 2);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  return query;
};

const processHistoryResults = (
  messages: DbExpMessage[],
  limit: number
): HistoryResult => {
  let nextCursor: string | undefined = undefined;

  if (messages.length > limit) {
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
};

const saveUserMessage = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  content: string
) => {
  const { error } = await supabase.from("exp_messages").insert({
    user_id: userId,
    role: "user",
    content,
  });

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save user message",
    });
  }
};

const prepareMessagesForLLM = (messages: ExpMessage[]): Content[] => {
  return messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
};

const createLLMContents = (messages: ExpMessage[]): Content[] => {
  const systemPromptObject = createExpSystemPrompt();
  const systemPromptText = (systemPromptObject.parts?.[0] as Part)?.text || "";
  const messagesForLlm = prepareMessagesForLLM(messages);

  return [
    { role: "user" as const, parts: [{ text: systemPromptText }] },
    {
      role: "model" as const,
      parts: [{ text: "Okay, I will follow these instructions." }],
    },
    ...messagesForLlm,
  ];
};

// Tool execution helper - now dynamically handles all tools
const executeToolCall = async (
  toolName: string,
  args: Record<string, unknown>,
  ctx: { supabase: SupabaseClient<Database>; user: User }
): Promise<string> => {
  try {
    // Check if the tool exists in our registry
    const toolProcedure = TOOL_REGISTRY[toolName];

    if (!toolProcedure) {
      return `Unknown tool: ${toolName}`;
    }

    // Execute the tool procedure
    await toolProcedure(ctx, args);
    return `${toolName} executed successfully`;
  } catch (error) {
    console.error(`Error executing ${toolName}:`, error);
    return `Error executing ${toolName}: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
};

// Enhanced AI response generation with tool calling support
const generateAIResponseWithTools = async (
  contents: Content[],
  ctx: { supabase: SupabaseClient<Database>; user: User }
): Promise<{ text: string; toolsUsed: string[] }> => {
  // First call to LLM
  const initialResult = await genAI.models.generateContent({
    config: {
      tools: [
        {
          functionDeclarations: getAllToolDeclarations(),
        },
      ],
    },
    model: MODEL_ID,
    contents,
  });

  console.dir(initialResult, { depth: null });

  // Check if the response contains function calls
  const candidate = initialResult.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  const functionCalls = parts.filter((part) => "functionCall" in part);

  if (functionCalls.length === 0) {
    // No tool calls, return the text response
    return {
      text: initialResult.text || "<no response>",
      toolsUsed: [],
    };
  }

  // Execute tool calls
  const toolResponses: Content[] = [];
  const toolsUsed: string[] = [];

  for (const part of functionCalls) {
    if ("functionCall" in part && part.functionCall) {
      const { name, args } = part.functionCall;
      if (name) {
        const toolResult = await executeToolCall(name, args || {}, ctx);
        toolsUsed.push(name);

        // Add function call and response to conversation
        toolResponses.push({
          role: "model",
          parts: [part], // The original function call
        });

        toolResponses.push({
          role: "function",
          parts: [
            {
              functionResponse: {
                name,
                response: { result: toolResult },
              },
            },
          ],
        });
      }
    }
  }

  // Make second call with tool responses to get user-facing response
  const finalContents = [...contents, ...toolResponses];

  const finalResult = await genAI.models.generateContent({
    model: MODEL_ID,
    contents: finalContents,
  });

  console.log("Final response after tool execution:", finalResult.text);

  return {
    text: finalResult.text || "<no response>",
    toolsUsed,
  };
};

const saveAssistantMessage = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  content: string,
  toolsUsed?: string[]
) => {
  const { data: assistantMessage, error } = await supabase
    .from("exp_messages")
    .insert({
      user_id: userId,
      role: "assistant",
      content,
      tools_used: toolsUsed && toolsUsed.length > 0 ? toolsUsed : null,
    })
    .select("id, created_at, role, content, tools_used")
    .single();

  if (error || !assistantMessage) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save assistant message",
    });
  }

  return assistantMessage;
};

export const expRouter = createTRPCRouter({
  history: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).nullish(),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      const limit = input.limit ?? 10;
      const cursor = input.cursor ?? undefined;

      const query = buildHistoryQuery(supabase, user.id, { limit, cursor });
      const { data: messages, error: messagesError } = await query;

      if (messagesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch messages",
        });
      }

      return processHistoryResults(messages || [], limit);
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

      if (!messages || messages.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing required fields",
        });
      }

      const lastUserMessage = messages[messages.length - 1];

      // Save user message
      await saveUserMessage(supabase, user.id, lastUserMessage.content);

      // Generate AI response with tool support
      const llmContents = createLLMContents(messages);
      const assistantResponse = await generateAIResponseWithTools(
        llmContents,
        ctx
      );

      console.log("Generated AI response:", assistantResponse);

      // Save assistant message
      const assistantMessage = await saveAssistantMessage(
        supabase,
        user.id,
        assistantResponse.text,
        assistantResponse.toolsUsed
      );

      return {
        message: assistantMessage,
      };
    }),
});
