// Ensure correct imports from 'ai' and provider
import { streamText, type CoreMessage, StreamData } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
// Import both client creation functions
import { createServer as createSupabaseUserContextClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Tables, TablesInsert } from "../../../types/supabase";
import { LIMITS, MODEL_DETAILS, type GeminiModelId, ResponseLengthSetting, DEFAULT_RESPONSE_LENGTH_SETTING } from "../../../lib/types";

export const runtime = "edge";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
});

const createSystemPrompt = (modelId: GeminiModelId, responseLength: ResponseLengthSetting): CoreMessage => {
  const modelInfo = MODEL_DETAILS.find((model) => model.id === modelId);
  const modelName = modelInfo?.name || modelId;

  let promptContent = `You are ${modelName}, a powerful AI language model developed by Google. The user can change the AI model they are interacting with at any time using the model selector in the chat interface.`;

  if (responseLength === "detailed") {
    promptContent += " Please provide comprehensive and detailed responses. Elaborate on topics, explain concepts thoroughly, and give extensive examples where appropriate.";
  } else { // 'brief'
    promptContent += " Keep your responses concise and to the point. Avoid over-explaining unless the user explicitly asks for more detail.";
  }

  promptContent += ` If users ask about your capabilities or what model you are, you can mention that you are ${modelName}.`;

  return {
    role: "system",
    content: promptContent,
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
  const responseLength = data?.responseLength || DEFAULT_RESPONSE_LENGTH_SETTING; // Add this line
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

  const isProModel = modelId === LIMITS.PRO_MODEL_ID;
  let limitExceeded = false;
  const messageCost = responseLength === "detailed" ? 2 : 1; // Define cost

  if (userProfile.is_verified) {
    if (
      isProModel &&
      (userProfile.daily_pro_message_count + messageCost) > // Check against cost
        LIMITS.VERIFIED.PRO_MESSAGES_PER_DAY
    )
      limitExceeded = true;
  } else {
    if (
      isProModel &&
      (userProfile.daily_pro_message_count + messageCost) > // Check against cost
        LIMITS.NON_VERIFIED.PRO_MESSAGES_PER_DAY
    )
      limitExceeded = true;
    else if (
      !isProModel &&
      (userProfile.daily_message_count + messageCost) > // Check against cost
        LIMITS.NON_VERIFIED.GENERAL_MESSAGES_PER_DAY
    )
      limitExceeded = true;
  }

  if (limitExceeded) {
    return NextResponse.json(
      { error: "Message limit reached." },
      { status: 429 }
    );
  }

  const updateCountField = isProModel
    ? "daily_pro_message_count"
    : "daily_message_count";
  const currentCount = userProfile[updateCountField];
  await supabaseServiceAdmin
    .from("user_profiles")
    .update({ [updateCountField]: currentCount + messageCost }) // Use cost here
    .eq("id", user.id);

  let dataStreamForResponse: StreamData | undefined; // Renamed to avoid conflict if StreamData is used internally by SDK

  try {
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
        : JSON.stringify(lastUserMessage.content); // Keep this for saving to DB

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

    const recentMessagesForLlm = messagesForLlm.slice(-5); // Prepare messages for LLM

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
    // IMPORTANT: userMessageContent (the original string) is saved to DB, not the modified array.
    const userMessageToSave: TablesInsert<"messages"> = {
      chat_id: currentChatId, // This is now always the clientProvidedChatId
      user_id: user.id,
      role: "user",
      content: userMessageContent, // Save the original string content
      model_used: modelId, // Associate user message with the model chosen for the response
      attachment_url: uploadedAttachmentUrl,
      attachment_name: savedAttachmentName,
      attachment_type: savedAttachmentType,
    };
    const { error: userMessageSaveError } = await supabaseUserClient
      .from("messages")
      .insert(userMessageToSave);
    if (userMessageSaveError)
      console.error("Error saving user message:", userMessageSaveError.message);

    // ALWAYS use streamText now. The distinction for isNewChat returning JSON is removed.
    dataStreamForResponse = new StreamData();

    const result = streamText({
      model: google(modelId as GeminiModelId),
      messages: [createSystemPrompt(modelId, responseLength), ...recentMessagesForLlm], // Use the potentially modified messages
      async onFinish({ text, finishReason, usage /*, rawResponse */ }) {
        if (finishReason === "stop" || finishReason === "length") {
          await supabaseUserClient.from("messages").insert({
            chat_id: currentChatId, // clientProvidedChatId
            user_id: user.id,
            role: "assistant",
            content: text,
            model_used: modelId,
            prompt_tokens: usage?.promptTokens,
            completion_tokens: usage?.completionTokens,
            total_tokens: usage?.totalTokens,
            usage_metadata: usage, // Store the usage object
          });
        }
        // Append any final data to the stream if needed by client
        if (dataStreamForResponse) {
          // NEW: Append token usage to the data stream
          dataStreamForResponse.append({
            type: "token_usage_update", // A type to identify this data on the client
            promptTokens: usage?.promptTokens,
            completionTokens: usage?.completionTokens,
            totalTokens: usage?.totalTokens,
          });
          dataStreamForResponse.close(); // Close after appending
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
