// Ensure correct imports from 'ai' and provider
import { GoogleGenAI, type Content, type Part } from "@google/genai";
// Import both client creation functions
import { createServer as createSupabaseUserContextClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Tables, TablesInsert } from "@/types/supabase";
import {
  LIMITS,
  MODEL_DETAILS,
  ResponseLengthSetting,
  type GeminiModelId,
} from "@/lib/types";
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

  let promptContent = `You are ${modelName}, a powerful AI language model developed by Google. The user can change the AI model they are interacting with at any time using the model selector in the chat interface.`;

  if (responseLength === "detailed") {
    promptContent +=
      " Please provide comprehensive and detailed responses. Elaborate on topics, explain concepts thoroughly, and give extensive examples where appropriate.";
  } else {
    // 'brief'
    promptContent +=
      " Keep your responses concise and to the point. Avoid over-explaining unless the user explicitly asks for more detail.";
  }

  promptContent += ` If users ask about your capabilities or what model you are, you can mention that you are ${modelName}.`;

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
    attachment_url?: string; // The public URL from Supabase
    attachment_content?: string; // The base64 content for the LLM
    attachment_name?: string; // The original file name
    attachment_type?: string; // The file's MIME type
    responseLength?: ResponseLengthSetting;
  };
}

function getCurrentUtcDateString() {
  return new Date().toISOString().split("T")[0];
}

export async function POST(req: Request) {
  const supabaseUserClient = await createSupabaseUserContextClient();
  const supabaseServiceAdmin = createSupabaseServiceRoleClient();

  const {
    data: { user },
    error: authError,
  } = await supabaseUserClient.auth.getUser();

  if (authError || !user) {
    console.error("API Auth Error:", authError?.message, authError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userProfile = (
    await supabaseServiceAdmin
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single()
  ).data as Tables<"user_profiles"> | null;

  if (!userProfile) {
    const { data: newProfile, error: newProfileError } =
      await supabaseServiceAdmin
        .from("user_profiles")
        .insert({ id: user.id })
        .select()
        .single();
    if (newProfileError || !newProfile) {
      console.error(
        "Failed to create fallback profile:",
        newProfileError?.message
      );
      return NextResponse.json(
        { error: "User profile issue." },
        { status: 500 }
      );
    }
    userProfile = newProfile;
  }

  // Initialize sparks-related fields if they don't exist (for migration)
  if (userProfile && typeof userProfile.current_sparks !== "number") {
    const initialSparks = userProfile.is_verified ? 10000 : 5000;
    const { data: updatedProfileData, error: updateError } =
      await supabaseServiceAdmin
        .from("user_profiles")
        .update({
          current_sparks: initialSparks,
          total_sparks_earned: initialSparks,
          last_sparks_claim_at: new Date(
            Date.now() - 24 * 60 * 60 * 1000
          ).toISOString(), // Allow immediate claim
        })
        .eq("id", user.id)
        .select()
        .single();
    if (updateError)
      console.error("Error initializing sparks:", updateError.message);
    else if (updatedProfileData) userProfile = updatedProfileData;
  }

  // Legacy: Still handle daily count resets for backward compatibility
  const currentUtcDateStr = getCurrentUtcDateString();
  if (
    userProfile &&
    new Date(userProfile.last_message_reset_at).toISOString().split("T")[0] <
      currentUtcDateStr
  ) {
    const { data: updatedProfileData, error: resetError } =
      await supabaseServiceAdmin
        .from("user_profiles")
        .update({
          daily_message_count: 0,
          daily_pro_message_count: 0,
          last_message_reset_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();
    if (resetError)
      console.error("Error resetting daily counts:", resetError.message);
    else if (updatedProfileData) userProfile = updatedProfileData;
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
  const modelId = data?.modelId || "gemini-2.0-flash-lite"; // Default model
  const responseLength = data?.responseLength || "brief";
  const clientProvidedChatId = data?.chatId; // This is the client-generated UID

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  if (!clientProvidedChatId) {
    console.error("API Error: Missing clientProvidedChatId in request data.");
    return NextResponse.json(
      { error: "Missing chatId in request data" },
      { status: 400 }
    );
  }

  if (!userProfile) {
    return NextResponse.json(
      { error: "User profile not available." },
      { status: 500 }
    );
  }

  // Server-side check for sparks. We do a rough estimation here to fail fast
  // if the user is clearly out of sparks, but the final cost is calculated post-generation.
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage.role !== "user") {
    return NextResponse.json(
      { error: "Last message must be from user" },
      { status: 400 }
    );
  }

  const userMessageContent = lastUserMessage.content || "";

  // Rough estimation for pre-check
  const allConversationContent = messages.map((m) => m.content).join(" ");
  const estimatedInputTokens = estimateTokenCount(allConversationContent);
  const estimatedSparksCost = calculateSparksCost(
    modelId,
    estimatedInputTokens
  );

  // Check if user has enough sparks for a rough estimate.
  // Allow a small buffer; maybe the estimate is high.
  const currentSparks = userProfile.current_sparks || 0;
  if (currentSparks < estimatedSparksCost) {
    return NextResponse.json(
      {
        error: "Insufficient sparks",
        required: estimatedSparksCost,
        current: currentSparks,
      },
      { status: 429 } // 429 Too Many Requests is appropriate for rate limiting/cost limits
    );
  }

  // Legacy: Still update message counts for backward compatibility
  const isProModel = modelId === LIMITS.PRO_MODEL_ID;
  const updateCountField = isProModel
    ? "daily_pro_message_count"
    : "daily_message_count";
  const currentCount = userProfile[updateCountField];
  await supabaseServiceAdmin
    .from("user_profiles")
    .update({ [updateCountField]: currentCount + 1 }) // Increment by 1 message
    .eq("id", user.id);

  try {
    // Create a deep copy of messages for modification to avoid altering the original requestBody.messages
    // Create a deep copy of messages for modification and transform to the format expected by the LLM
    const messagesForLlm: Content[] = JSON.parse(JSON.stringify(messages)).map(
      (msg: { role: "user" | "assistant"; content: string }) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })
    );

    // Extract all attachment-related data from the request
    const attachmentContent = data?.attachment_content || null;
    const attachmentUrl = data?.attachment_url || null;
    const savedAttachmentName = data?.attachment_name || null;
    const savedAttachmentType = data?.attachment_type || null;

    // Use clientProvidedChatId consistently
    const currentChatId = clientProvidedChatId;

    // Ensure chat record exists in DB and belongs to the user
    const { data: existingChat, error: fetchChatError } =
      await supabaseUserClient
        .from("chats")
        .select("id, user_id")
        .eq("id", currentChatId)
        .single();

    if (fetchChatError && fetchChatError.code !== "PGRST116") {
      // PGRST116: 'No rows found' which is fine if we are creating it
      console.error("Error fetching chat:", fetchChatError.message);
      return NextResponse.json(
        { error: "Database error fetching chat." },
        { status: 500 }
      );
    }

    // If chat exists, verify ownership
    if (existingChat && existingChat.user_id !== user.id) {
      console.warn(
        `User ${user.id} attempted to access chat ${currentChatId} owned by ${existingChat.user_id}`
      );
      return NextResponse.json(
        { error: "Unauthorized access to chat." },
        { status: 403 }
      );
    }

    if (!existingChat) {
      // Chat doesn't exist, create it using clientProvidedChatId
      const titleForNewChat =
        (
          userMessageContent.substring(0, 40) +
          (savedAttachmentName
            ? ` (w/ ${savedAttachmentName.substring(0, 10)}...)`
            : "")
        ).substring(0, 50) || "New Chat";

      const { error: newChatError } = await supabaseUserClient
        .from("chats")
        .insert({
          id: currentChatId, // Use client-provided ID
          user_id: user.id,
          title: titleForNewChat,
        });

      if (newChatError) {
        console.error(
          "Error creating new chat with client-provided ID:",
          newChatError.message
        );
        return NextResponse.json(
          { error: "Could not create new chat record" },
          { status: 500 }
        );
      }
    }

    // REMOVED: Use all messages instead of limiting to 5
    const recentMessagesForLlm = messagesForLlm; // Use all conversation history

    // Modify the last user message in recentMessagesForLlm if there's an attachment
    if (
      attachmentContent &&
      savedAttachmentType &&
      recentMessagesForLlm.length > 0
    ) {
      const lastLlmUserMessage =
        recentMessagesForLlm[recentMessagesForLlm.length - 1];
      if (lastLlmUserMessage.role === "user") {
        const originalTextContent = (lastLlmUserMessage.parts || [])
          .map((p: Part) => ("text" in p ? p.text : ""))
          .join("");

        // Remove the "data:image/jpeg;base64," prefix
        const base64Data = attachmentContent.split(",")[1];

        lastLlmUserMessage.parts = [
          { text: originalTextContent },
          {
            inlineData: {
              data: base64Data,
              mimeType: savedAttachmentType,
            },
          },
        ];
      }
    }

    // Save user message (common for both new and existing chats before LLM call)
    // The sparks_cost and token counts are now added *after* the response is generated.
    const userMessageToSave: TablesInsert<"messages"> = {
      chat_id: currentChatId,
      user_id: user.id,
      role: "user",
      content: userMessageContent,
      model_used: modelId,
      attachment_url: attachmentUrl, // Save the public URL from Supabase
      attachment_name: savedAttachmentName,
      attachment_type: savedAttachmentType,
      // spark cost and token counts are null for now
    };

    // Insert user message and get the ID for sparks transaction
    const { data: savedUserMessage, error: userMessageSaveError } =
      await supabaseUserClient
        .from("messages")
        .insert(userMessageToSave)
        .select("id")
        .single();

    if (userMessageSaveError || !savedUserMessage) {
      console.error("Error saving user message:", userMessageSaveError.message);
      return NextResponse.json(
        { error: "Failed to save message" },
        { status: 500 }
      );
    }

    // The user message is saved, now we can proceed with the LLM call.
    // Spark deduction will happen in the onFinish callback.

    const systemPromptObject = createSystemPrompt(modelId, responseLength);
    // Safely extract the text from the system prompt
    const firstPart = systemPromptObject.parts?.[0];
    const systemPromptText =
      firstPart && "text" in firstPart ? firstPart.text : "";

    const contentsForLlm = [
      { role: "user" as const, parts: [{ text: systemPromptText }] },
      {
        role: "model" as const,
        parts: [{ text: "Okay, I will follow these instructions." }],
      },
      ...recentMessagesForLlm,
    ];

    const result = await genAI.models.generateContentStream({
      model: modelId,
      contents: contentsForLlm,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let accumulatedResponse = "";
        // The 'result' is an async iterator of response chunks
        for await (const chunk of result) {
          const text = chunk.text;
          if (typeof text === "string") {
            accumulatedResponse += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        // After the stream is finished, save the assistant message and handle sparks
        const completionTokens = estimateTokenCount(accumulatedResponse);

        // First, insert a placeholder for the assistant message to get an ID
        const { data: assistantMessageShell, error: shellError } =
          await supabaseServiceAdmin
            .from("messages")
            .insert({
              chat_id: currentChatId,
              user_id: user.id,
              role: "assistant",
              content: accumulatedResponse, // Save the full content
              model_used: modelId,
            })
            .select("id")
            .single();

        if (shellError || !assistantMessageShell) {
          console.error(
            "Failed to insert assistant message shell:",
            shellError?.message
          );
          // The stream is already sent, so we can't return an error response.
          // The message will be visible on the client but won't have a cost.
        } else {
          // Now, call the new function to log costs and spend sparks
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
            console.error(
              "Error in log_and_spend_sparks RPC:",
              sparksError.message
            );
          } else if (sparksResult) {
            // Send final metadata to the client
            const metadata = {
              type: "metadata",
              data: {
                messageId: assistantMessageShell.id,
                sparksCost: sparksResult.sparks_spent,
                newBalance: sparksResult.new_balance,
              },
            };
            controller.enqueue(
              encoder.encode(`\n\n[METADATA]${JSON.stringify(metadata)}`)
            );
          }
        }

        controller.close();
      },
      cancel() {
        console.log("Stream cancelled by client.");
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    console.error("API Route Error:", error);
    let errorMessage = "Internal server error.";
    if (error instanceof Error) errorMessage = error.message;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
