import { calculateSparksCost, estimateTokenCount } from "@/lib/sparks";
import {
  createSupabaseServiceRoleClient,
  createServer as createSupabaseUserContextClient,
} from "@/lib/supabase/server";
import {
  MODEL_DETAILS,
  ResponseLengthSetting,
  type GeminiModelId,
} from "@/types";
import { ChatSettings } from "@/types/settings";
import type { Tables } from "@/types/supabase";
import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "edge";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
});

const createSystemPrompt = (
  modelId: GeminiModelId,
  settings: ChatSettings
): Content => {
  const modelInfo = MODEL_DETAILS.find((model) => model.id === modelId);
  const modelName = modelInfo?.name || modelId;

  let promptContent = `You are ${modelName}, a powerful AI language model.`;

  // Response length instructions
  if (settings.responseLength === "detailed") {
    promptContent +=
      " Please provide comprehensive and detailed responses with thorough explanations.";
  } else {
    promptContent += " Keep your responses concise and to the point.";
  }

  // Tone instructions
  if (settings.tone === "casual") {
    promptContent +=
      " Use a friendly, conversational tone. Feel free to use contractions and informal language.";
  } else {
    promptContent +=
      " Maintain a professional and formal tone in your responses.";
  }

  // Focus mode instructions
  if (settings.focusMode === "creative") {
    promptContent +=
      " Prioritize creative, innovative, and imaginative approaches in your responses.";
  } else if (settings.focusMode === "analytical") {
    promptContent +=
      " Focus on logical analysis, data-driven insights, and systematic problem-solving.";
  } else {
    promptContent +=
      " Provide balanced responses that combine both analytical and creative thinking.";
  }

  // Explanation style instructions
  if (settings.explanationStyle === "step-by-step") {
    promptContent +=
      " When explaining concepts, break them down into clear, sequential steps.";
  } else if (settings.explanationStyle === "examples") {
    promptContent +=
      " Use concrete examples and practical illustrations to clarify your explanations.";
  } else {
    promptContent +=
      " Provide direct, straightforward explanations without unnecessary elaboration.";
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
    chatSettings?: ChatSettings;
    useSearch?: boolean;
    // Keep for backward compatibility
    responseLength?: ResponseLengthSetting;
    temperature?: number;
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

  // Use chatSettings if provided, otherwise fall back to individual settings for backward compatibility
  const chatSettings = data?.chatSettings || {
    temperature: data?.temperature || 0.9,
    responseLength: data?.responseLength || "brief",
    tone: "formal",
    focusMode: "balanced",
    explanationStyle: "direct",
  };

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
    estimatedInputTokens,
    undefined,
    data?.useSearch
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

    const systemPromptObject = createSystemPrompt(modelId, chatSettings);
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

    const groundingTool = {
      googleSearch: {},
    };

    const resultStream = await genAI.models.generateContentStream({
      config: {
        temperature: chatSettings.temperature,
        tools: data?.useSearch ? [groundingTool] : undefined,
      },
      model: modelId,
      contents: contentsForLlm,
    });

    let assistantResponseText = "";
    let searchReferences: { url: string; title: string }[] = [];
    for await (const chunk of resultStream) {
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        assistantResponseText += text;
      }

      if (chunk.candidates?.[0]?.finishReason === "STOP") {
        const groundingChunks =
          chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (Array.isArray(groundingChunks)) {
          searchReferences = groundingChunks
            .map((refChunk) => {
              if (refChunk.web && refChunk.web.uri && refChunk.web.title) {
                return {
                  url: refChunk.web.uri,
                  title: refChunk.web.title,
                };
              }
              return null;
            })
            .filter(
              (ref): ref is { url: string; title: string } => ref !== null
            );
        }
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
          search_references: searchReferences,
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
      search_references: searchReferences,
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
