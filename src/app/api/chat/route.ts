import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { createServer as createSupabaseUserContextClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Tables, TablesInsert } from "@/types/supabase";
import {
  LIMITS,
  MODEL_DETAILS,
  ResponseLengthSetting,
  type GeminiModelId,
} from "@/types";
import { estimateTokenCount, calculateSparksCost } from "@/lib/sparks";

export const runtime = "edge";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
});

const createSystemPrompt = (
  modelId: GeminiModelId,
  responseLength: ResponseLengthSetting
): Content => {
  const modelInfo = MODEL_DETAILS.find((model) => model.id === modelId);
  const modelName = modelInfo?.name || modelId;

  let promptContent = `You are ${modelName}, a powerful AI language model.`;

  if (responseLength === "detailed") {
    promptContent += " Please provide comprehensive and detailed responses.";
  } else {
    promptContent += " Keep your responses concise and to the point.";
  }

  return {
    role: "system",
    parts: [{ text: promptContent }],
  };
};

interface ChatRequestBody {
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
  }[];
  data?: {
    modelId?: GeminiModelId;
    chatId?: string;
    attachment_url?: string;
    attachment_content?: string;
    attachment_name?: string;
    attachment_type?: string;
    responseLength?: ResponseLengthSetting;
  };
}

export async function POST(req: Request) {
  const supabaseUserClient = await createSupabaseUserContextClient();
  const supabaseServiceAdmin = createSupabaseServiceRoleClient();

  const {
    data: { user },
    error: authError,
  } = await supabaseUserClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userProfile = (
    await supabaseServiceAdmin
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single()
  ).data as Tables<"user_profiles"> | null;

  if (!userProfile) {
    // Create profile if it doesn't exist
  }

  let requestBody: ChatRequestBody;
  try {
    requestBody = await req.json();
  } catch (_parseError) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { messages, data } = requestBody;
  const modelId = data?.modelId || "gemini-2.0-flash-lite";
  const responseLength = data?.responseLength || "brief";
  const clientProvidedChatId = data?.chatId;

  if (!messages || messages.length === 0 || !clientProvidedChatId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const lastUserMessage = messages[messages.length - 1];
  const userMessageContent = lastUserMessage.content || "";
  const allConversationContent = messages.map((m) => m.content).join(" ");
  const estimatedInputTokens = estimateTokenCount(allConversationContent);
  const estimatedSparksCost = calculateSparksCost(
    modelId,
    estimatedInputTokens
  );

  if ((userProfile?.current_sparks || 0) < estimatedSparksCost) {
    return NextResponse.json({ error: "Insufficient sparks" }, { status: 429 });
  }

  try {
    const messagesForLlm: Content[] = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const attachmentContent = data?.attachment_content || null;
    const attachmentType = data?.attachment_type || null;

    if (attachmentContent && attachmentType && messagesForLlm.length > 0) {
      const lastLlmUserMessage = messagesForLlm[messagesForLlm.length - 1];
      if (lastLlmUserMessage.role === "user") {
        if (!lastLlmUserMessage.parts) {
          lastLlmUserMessage.parts = [];
        }
        const base64Data = attachmentContent.split(",")[1];
        lastLlmUserMessage.parts.push({
          inlineData: { data: base64Data, mimeType: attachmentType },
        });
      }
    }

    const systemPromptObject = createSystemPrompt(modelId, responseLength);
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
    const completionTokens = estimateTokenCount(assistantResponseText);

    const { data: savedUserMessage } = await supabaseUserClient
      .from("messages")
      .insert({
        chat_id: clientProvidedChatId,
        user_id: user.id,
        role: "user",
        content: userMessageContent,
        model_used: modelId,
        attachment_url: data?.attachment_url,
        attachment_name: data?.attachment_name,
        attachment_type: data?.attachment_type,
      })
      .select("id")
      .single();

    const { data: assistantMessageShell, error: shellError } =
      await supabaseServiceAdmin
        .from("messages")
        .insert({
          chat_id: clientProvidedChatId,
          user_id: user.id,
          role: "assistant",
          content: assistantResponseText,
          model_used: modelId,
        })
        .select("id")
        .single();

    if (shellError || !assistantMessageShell) {
      throw new Error("Failed to save assistant message.");
    }

    const { data: sparksResult, error: sparksError } =
      await supabaseServiceAdmin.rpc(
        "log_and_spend_sparks_for_assistant_message",
        {
          p_user_id: user.id,
          p_assistant_message_id: assistantMessageShell.id,
          p_model_id: modelId,
          p_prompt_tokens: estimatedInputTokens,
          p_completion_tokens: completionTokens,
        }
      );

    if (sparksError) {
      console.error("Error in log_and_spend_sparks RPC:", sparksError.message);
    }

    const finalAssistantMessage = {
      id: assistantMessageShell.id,
      role: "assistant",
      content: assistantResponseText,
      created_at: new Date().toISOString(),
      model_used: modelId,
      sparks_cost: sparksResult?.sparks_spent,
    };

    return NextResponse.json({
      message: finalAssistantMessage,
      newBalance: sparksResult?.new_balance,
    });
  } catch (error: unknown) {
    console.error("API Route Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
