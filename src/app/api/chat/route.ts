// Ensure correct imports from 'ai' and provider
import { streamText, type CoreMessage, StreamData } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
// Import both client creation functions
import { createServer as createSupabaseUserContextClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Tables, TablesInsert } from "@/types/supabase";
import { LIMITS, MODEL_DETAILS, type GeminiModelId } from "@/lib/types";
import { estimateTokenCount, calculateSparksCost } from "@/lib/sparks";

export const runtime = "edge";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
});

const createSystemPrompt = (modelId: GeminiModelId): CoreMessage => {
  const modelInfo = MODEL_DETAILS.find((model) => model.id === modelId);
  const modelName = modelInfo?.name || modelId;

  return {
    role: "system",
    content: `You are ${modelName}, a powerful AI language model developed by Google. Keep your responses concise and to the point. Avoid over-explaining unless the user explicitly asks for more detail. If users ask about your capabilities or what model you are, you can mention that you are ${modelName}.`,
  };
};

interface ChatRequestBody {
  messages: CoreMessage[];
  data?: {
    modelId?: GeminiModelId;
    chatId?: string;
    attachment?: {
      type: string;
      content: string;
      name: string;
    };
    attachment_url?: string;
    attachment_name?: string;
    attachment_type?: string;
    local_attachment_preview?: {
      type?: string;
      content?: string;
      name?: string;
    };
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

  const userMessageContent =
    typeof lastUserMessage.content === "string"
      ? lastUserMessage.content
      : JSON.stringify(lastUserMessage.content);

  // Rough estimation for pre-check
  const allConversationContent = messages
    .map((m) =>
      typeof m.content === "string" ? m.content : JSON.stringify(m.content)
    )
    .join(" ");
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
  await supabaseServiceAdmin
    .from("user_profiles")
    .update({ [updateCountField]: userProfile[updateCountField] + 1 })
    .eq("id", user.id);

  let dataStreamForResponse: StreamData | undefined; // Renamed to avoid conflict if StreamData is used internally by SDK

  try {
    // Create a deep copy of messages for modification to avoid altering the original requestBody.messages
    const messagesForLlm: CoreMessage[] = JSON.parse(JSON.stringify(messages));

    const uploadedAttachmentUrl =
      (data?.attachment_url as string | null) || null;
    const savedAttachmentName =
      (data?.attachment_name as string | null) || null;
    const savedAttachmentType =
      (data?.attachment_type as string | null) || null;

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
      uploadedAttachmentUrl &&
      savedAttachmentType &&
      recentMessagesForLlm.length > 0
    ) {
      const lastLlmUserMessage =
        recentMessagesForLlm[recentMessagesForLlm.length - 1];
      if (lastLlmUserMessage.role === "user") {
        const originalTextContent =
          typeof lastLlmUserMessage.content === "string"
            ? lastLlmUserMessage.content
            : (Array.isArray(lastLlmUserMessage.content) &&
                lastLlmUserMessage.content.find((p) => p.type === "text")
                  ?.text) ||
              "";

        lastLlmUserMessage.content = [
          { type: "text", text: originalTextContent },
          {
            type: "image", // AI SDK uses 'image' part type for data to be fetched (URL)
            image: new URL(uploadedAttachmentUrl),
            mimeType: savedAttachmentType,
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
      attachment_url: uploadedAttachmentUrl,
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

    // ALWAYS use streamText now. The distinction for isNewChat returning JSON is removed.
    dataStreamForResponse = new StreamData();

    const result = streamText({
      model: google(modelId as GeminiModelId),
      messages: [createSystemPrompt(modelId), ...recentMessagesForLlm],
      async onFinish({ text, finishReason, usage }) {
        let assistantMessageId: string | null = null;

        // First, save the assistant's message and get its ID
        if (finishReason === "stop" || finishReason === "length") {
          const { data: assistantMessageData, error: assistantMessageError } =
            await supabaseUserClient
              .from("messages")
              .insert({
                chat_id: currentChatId,
                user_id: user.id,
                role: "assistant",
                content: text,
                model_used: modelId,
              })
              .select("id")
              .single();

          if (assistantMessageError) {
            console.error(
              "Error saving assistant message:",
              assistantMessageError
            );
          } else {
            assistantMessageId = assistantMessageData.id;
          }
        }

        // If we have the assistant message ID, log the cost against it
        if (assistantMessageId) {
          const actualInputTokens = usage?.promptTokens || 0;
          const actualOutputTokens = usage?.completionTokens || 0;

          const { data: transactionResult, error: rpcError } =
            await supabaseServiceAdmin.rpc(
              "log_and_spend_sparks_for_assistant_message",
              {
                p_user_id: user.id,
                p_assistant_message_id: assistantMessageId,
                p_model_id: modelId,
                p_prompt_tokens: actualInputTokens,
                p_completion_tokens: actualOutputTokens,
              }
            );

          if (rpcError) {
            console.error("Error logging sparks transaction:", rpcError);
          }

          // Append final data to the stream for real-time UI updates
          if (dataStreamForResponse) {
            dataStreamForResponse.append({
              type: "final_update",
              sparks_spent: transactionResult?.sparks_spent || 0,
              new_balance: transactionResult?.new_balance,
            });
          }
        }

        // Always close the data stream
        if (dataStreamForResponse) {
          dataStreamForResponse.close();
        }
      },
    });

    // Append initial data for client UI (e.g., model used, if client wants to confirm)
    // The client already knows the model, but this is an example.
    // The main purpose of StreamData here is for the text stream itself.
    // dataStreamForResponse.append({ // This initial append block can be removed or kept if other initial data is needed.
    // ui_model_used: modelId, // Example: send model used for UI indication
    // ui_created_at: new Date().toISOString(),
    // }); // For now, let's assume no other initial data is strictly needed for this flow.
    // Do not close dataStreamForResponse here, it's closed in onFinish or if an error occurs

    return result.toDataStreamResponse({ data: dataStreamForResponse });
  } catch (error: unknown) {
    console.error("API Route Error:", error);
    let errorMessage = "Internal server error.";
    if (error instanceof Error) errorMessage = error.message;
    if (
      dataStreamForResponse &&
      typeof dataStreamForResponse.close === "function"
    ) {
      // Check before closing
      dataStreamForResponse.close();
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
