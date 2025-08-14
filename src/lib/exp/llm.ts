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

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
});

export interface LLMMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

/**
 * Creates the system prompt with optional user memories
 */
export const createExpSystemPrompt = (userMemories: string[] = []): Content => {
  let promptContent = `You are a friendly and casual AI. Your personality is like a close friend. Use informal language, short sentences. Be fun and engaging. Keep punctuation use to a minimum. Do not use markdown. Use emojis sparesely, and only when appropriate. Keep responses to one or two sentences. The user's previous messages are provided as a reference. But if the current message is not related at all to the previous messages, you can ignore the previous messages.`;

  // Add user memories to the system prompt if available
  if (userMemories.length > 0) {
    promptContent += `\n\nHere are some important things to remember about this user:\n${userMemories
      .map((memory) => `- ${memory}`)
      .join("\n")}`;
  }

  return {
    role: "system",
    parts: [{ text: promptContent }],
  };
};

/**
 * Prepares messages for LLM format
 */
export const prepareMessagesForLLM = (messages: LLMMessage[]): Content[] => {
  return messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
};

/**
 * Creates the complete LLM contents including system prompt and messages
 */
export const createLLMContents = (
  messages: LLMMessage[],
  userMemories: string[] = []
): Content[] => {
  const systemPromptObject = createExpSystemPrompt(userMemories);
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

/**
 * Tool execution helper - dynamically handles all tools
 */
export const executeToolCall = async (
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

/**
 * Enhanced AI response generation with tool calling support
 */
export const generateAIResponseWithTools = async (
  contents: Content[],
  ctx: { supabase: SupabaseClient<Database>; user: User }
): Promise<{ text: string; toolsUsed: string[] }> => {
  // First call to LLM
  console.log(getAllToolDeclarations());
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
