// Ensure correct imports from 'ai' and provider
import { streamText, generateText, type CoreMessage, StreamData } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
// Import both client creation functions
import { createServer as createSupabaseUserContextClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Tables, TablesInsert } from "../../../types/supabase";
import { LIMITS, type GeminiModelId } from "../../../lib/types";

export const runtime = "edge";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
});

const systemPrompt: CoreMessage = {
  role: "system",
  content:
    "System Prompt: Keep your responses concise and to the point. Avoid over-explaining unless the user explicitly asks for more detail.",
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
  const modelId = data?.modelId || "gemini-2.0-flash-lite";
  const chatIdFromRequest = data?.chatId;
  const isNewChat = !chatIdFromRequest;

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  if (!userProfile) {
    return NextResponse.json(
      { error: "User profile not available." },
      { status: 500 }
    );
  }

  const isProModel = modelId === LIMITS.PRO_MODEL_ID;
  let limitExceeded = false;
  if (userProfile.is_verified) {
    if (
      isProModel &&
      userProfile.daily_pro_message_count >=
        LIMITS.VERIFIED.PRO_MESSAGES_PER_DAY
    )
      limitExceeded = true;
  } else {
    if (
      isProModel &&
      userProfile.daily_pro_message_count >=
        LIMITS.NON_VERIFIED.PRO_MESSAGES_PER_DAY
    )
      limitExceeded = true;
    else if (
      !isProModel &&
      userProfile.daily_message_count >=
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
  await supabaseServiceAdmin
    .from("user_profiles")
    .update({ [updateCountField]: userProfile[updateCountField] + 1 })
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
        : JSON.stringify(lastUserMessage.content);
    const messagesForLlm: CoreMessage[] = messages.map((m) => ({ ...m }));

    const uploadedAttachmentUrl =
      (data?.attachment_url as string | null) || null;
    const savedAttachmentName =
      (data?.attachment_name as string | null) || null;
    const savedAttachmentType =
      (data?.attachment_type as string | null) || null;

    let currentChatId: string;

    if (isNewChat) {
      const titleForNewChat =
        (
          userMessageContent.substring(0, 40) +
          (savedAttachmentName
            ? ` (w/ ${savedAttachmentName.substring(0, 10)}...)`
            : "")
        ).substring(0, 50) || "New Chat";
      const { data: chatData, error: chatError } = await supabaseUserClient
        .from("chats")
        .insert({ user_id: user.id, title: titleForNewChat })
        .select("id")
        .single();
      if (chatError || !chatData) {
        console.error("Error creating new chat:", chatError?.message);
        return NextResponse.json(
          { error: "Could not create new chat" },
          { status: 500 }
        );
      }
      currentChatId = chatData.id;
    } else {
      if (!chatIdFromRequest) {
        console.error(
          "Error: chatIdFromRequest is undefined for an existing chat."
        );
        return NextResponse.json(
          { error: "Missing chat ID for existing chat." },
          { status: 500 }
        );
      }
      currentChatId = chatIdFromRequest;
    }

    const recentMessagesForLlm = messagesForLlm.slice(-5); // Prepare messages for LLM

    // Save user message (common for both new and existing chats before LLM call)
    const userMessageToSave: TablesInsert<"messages"> = {
      chat_id: currentChatId,
      user_id: user.id,
      role: "user",
      content: userMessageContent,
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

    if (isNewChat) {
      const {
        text: aiResponseText,
        finishReason,
        usage,
        // rawResponse, // Omitting rawResponse for now to avoid potential type issues
      } = await generateText({
        model: google(modelId as GeminiModelId),
        messages: [systemPrompt, ...recentMessagesForLlm],
      });

      if (finishReason === "stop" || finishReason === "length") {
        await supabaseUserClient.from("messages").insert({
          chat_id: currentChatId,
          user_id: user.id,
          role: "assistant",
          content: aiResponseText,
          model_used: modelId,
          prompt_tokens: usage?.promptTokens,
          completion_tokens: usage?.completionTokens,
          total_tokens: usage?.totalTokens,
          usage_metadata: usage, // Store the usage object
        });
      }
      // For new chats, client expects a JSON response with chatId to navigate
      return NextResponse.json({ chatId: currentChatId });
    } else {
      // Existing chat, use streamText
      dataStreamForResponse = new StreamData();

      const result = streamText({
        model: google(modelId as GeminiModelId),
        messages: [systemPrompt, ...recentMessagesForLlm],
        async onFinish({ text, finishReason, usage /*, rawResponse */ }) {
          if (finishReason === "stop" || finishReason === "length") {
            await supabaseUserClient.from("messages").insert({
              chat_id: currentChatId,
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
            dataStreamForResponse.append({
              /* any final metadata if necessary */
            });
            dataStreamForResponse.close();
          }
        },
      });

      // Append initial data for client UI (already done by useChat hook, but can add more here)
      dataStreamForResponse.append({
        ui_model_used: modelId, // Example: send model used for UI indication
        ui_created_at: new Date().toISOString(),
      });
      // Do not close dataStreamForResponse here, it's closed in onFinish or if an error occurs

      return result.toDataStreamResponse({ data: dataStreamForResponse });
    }
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
