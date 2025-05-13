// Ensure correct imports from 'ai' and provider
import { streamText, generateText, type CoreMessage, StreamData } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
// Import both client creation functions
import { createServer as createSupabaseUserContextClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Tables } from "../../../types/supabase";
import { LIMITS, type GeminiModelId } from "../../../lib/types";

export const runtime = "edge";

// Use the provider-specific function to initialize
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
});

const systemPrompt: CoreMessage = {
  role: "system",
  content:
    "System Prompt: Keep your responses concise and to the point. Avoid over-explaining unless the user explicitly asks for more detail.",
};

// Define the expected request body structure from the Vercel AI SDK useChat hook
interface ChatRequestBody {
  messages: CoreMessage[];
  data?: {
    modelId?: GeminiModelId; // Use specific model ID type
    chatId?: string;
  };
}

// Helper function to get current UTC date as YYYY-MM-DD
function getCurrentUtcDateString() {
  return new Date().toISOString().split("T")[0];
}

export async function POST(req: Request) {
  const supabaseUserClient = await createSupabaseUserContextClient(); // Client for user context (auth)
  const supabaseServiceAdmin = createSupabaseServiceRoleClient(); // Client for admin operations (service role)

  const {
    data: { user },
    error: authError,
  } = await supabaseUserClient.auth.getUser(); // Changed to supabaseUserClient

  if (authError || !user) {
    console.error("API Auth Error:", authError?.message, authError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch user profile
  const userProfileResult = await supabaseServiceAdmin // Made const, using service client for profile read
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profileError = userProfileResult.error;
  let userProfile = userProfileResult.data as Tables<"user_profiles"> | null;

  if (profileError && profileError.code !== "PGRST116") {
    // PGRST116: single row not found
    console.error(
      "Error fetching user profile:",
      profileError.message,
      profileError
    );
    return NextResponse.json(
      { error: "Error fetching user profile." },
      { status: 500 }
    );
  }

  if (!userProfile) {
    // This case should ideally be handled by the DB trigger that creates a profile on new user signup.
    // If it still occurs, it indicates an issue with the trigger or a user exists in auth.users but not user_profiles.
    // For robustness, we could attempt to create one here, but it's better to rely on the trigger.
    console.warn(
      `User profile not found for user ${user.id}. A profile should have been auto-created.`
    );
    // Attempt to insert a default profile if none exists - this is a fallback.
    const { data: newProfile, error: newProfileError } =
      await supabaseServiceAdmin // Use service client
        .from("user_profiles")
        .insert({ id: user.id }) // Defaults will be applied by the DB
        .select()
        .single();
    if (newProfileError || !newProfile) {
      console.error(
        "Failed to create fallback user profile:",
        newProfileError?.message,
        newProfileError
      );
      return NextResponse.json(
        { error: "User profile not found and could not be created." },
        { status: 500 }
      );
    }
    userProfile = newProfile;
    console.log(`Fallback user profile created for user ${user.id}`);
  }

  // After potential creation, if userProfile is still null, something is wrong.
  if (!userProfile) {
    console.error(
      `User profile is unexpectedly null after creation attempt for user ${user.id}.`
    );
    return NextResponse.json(
      { error: "Critical error: User profile could not be established." },
      { status: 500 }
    );
  }

  // Daily Reset Logic
  // At this point, userProfile is guaranteed to be non-null.
  const currentUtcDateStr = getCurrentUtcDateString();
  const lastResetDateStr = new Date(userProfile.last_message_reset_at) // No longer possibly null
    .toISOString()
    .split("T")[0];

  if (currentUtcDateStr > lastResetDateStr) {
    const { data: updatedProfileData, error: resetError } =
      await supabaseServiceAdmin // Use service client
        .from("user_profiles")
        .update({
          daily_message_count: 0,
          daily_pro_message_count: 0,
          last_message_reset_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

    if (resetError) {
      console.error(
        "Error resetting daily counts (update failed):",
        resetError.message,
        resetError
      );
      // Non-fatal, proceed with potentially stale counts for this request, but log it.
    } else if (!updatedProfileData) {
      console.error(
        "Error resetting daily counts (no data returned after update for user):",
        user.id
      );
      // Non-fatal, proceed with potentially stale counts.
    } else {
      // Update the existing userProfile object's properties
      userProfile.daily_message_count = updatedProfileData.daily_message_count;
      userProfile.daily_pro_message_count =
        updatedProfileData.daily_pro_message_count;
      userProfile.last_message_reset_at =
        updatedProfileData.last_message_reset_at;
      console.log(`Daily message counts reset for user ${user.id}`);
    }
  }

  let requestBody: ChatRequestBody;
  try {
    requestBody = await req.json();
  } catch (parseError) {
    console.error("API Request Body Parse Error:", parseError);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { messages, data } = requestBody;
  const modelId = data?.modelId || "gemini-2.0-flash-lite"; // Default to a non-pro model
  let chatId = data?.chatId;
  const isNewChat = !chatId;

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  // Check Limits
  const isProModel = modelId === LIMITS.PRO_MODEL_ID;
  let limitExceeded = false;

  if (userProfile.is_verified) {
    if (
      isProModel &&
      userProfile.daily_pro_message_count >=
        LIMITS.VERIFIED.PRO_MESSAGES_PER_DAY
    ) {
      limitExceeded = true;
    }
    // General messages are unlimited for verified users (Infinity check not strictly needed)
  } else {
    // Non-verified user
    if (
      isProModel &&
      userProfile.daily_pro_message_count >=
        LIMITS.NON_VERIFIED.PRO_MESSAGES_PER_DAY
    ) {
      limitExceeded = true;
    } else if (
      !isProModel &&
      userProfile.daily_message_count >=
        LIMITS.NON_VERIFIED.GENERAL_MESSAGES_PER_DAY
    ) {
      limitExceeded = true;
    }
  }

  if (limitExceeded) {
    console.log(
      `User ${user.id} exceeded message limit for model ${modelId}. Verified: ${userProfile.is_verified}`
    );
    return NextResponse.json(
      {
        error:
          "Message limit reached for today. Please try again tomorrow or upgrade for higher limits.",
      },
      { status: 429 } // Too Many Requests
    );
  }

  // If limits are not exceeded, increment count BEFORE making the AI call
  const updateCountField = isProModel
    ? "daily_pro_message_count"
    : "daily_message_count";
  const { error: countIncrementError } = await supabaseServiceAdmin // Use service client
    .from("user_profiles")
    .update({ [updateCountField]: userProfile[updateCountField] + 1 })
    .eq("id", user.id);

  if (countIncrementError) {
    console.error(
      "Error incrementing message count:",
      countIncrementError.message,
      countIncrementError
    );
    // Non-fatal, proceed with AI call but log the error.
    // The user got the message through, but their count might be off.
  }

  let dataStream: StreamData | undefined;
  if (!isNewChat) {
    // Initialize StreamData only for streaming responses
    dataStream = new StreamData();
  }

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

    const recentMessages = messages.slice(-5);

    if (isNewChat) {
      const title = userMessageContent.substring(0, 50) || "New Chat";
      const { data: chatData, error: chatError } = await supabaseUserClient // Changed to supabaseUserClient
        .from("chats")
        .insert({ user_id: user.id, title: title })
        .select("id")
        .single();

      if (chatError || !chatData) {
        console.error("Error creating new chat:", chatError.message, chatError);
        return NextResponse.json(
          { error: "Could not create new chat" },
          { status: 500 }
        );
      }
      chatId = chatData.id;

      const { error: firstUserMessageError } = await supabaseUserClient // Changed to supabaseUserClient
        .from("messages")
        .insert({
          chat_id: chatId,
          user_id: user.id,
          role: "user",
          content: userMessageContent,
          model_used: modelId, // Save model used
        });
      if (firstUserMessageError) {
        console.error(
          "Error saving first user message:",
          firstUserMessageError.message,
          firstUserMessageError
        );
      }

      const { text: aiResponseText, finishReason } = await generateText({
        model: google(modelId as GeminiModelId), // Cast modelId
        messages: [systemPrompt, ...recentMessages],
      });

      if (finishReason === "stop" || finishReason === "length") {
        const { error: firstAiMessageError } = await supabaseUserClient // Changed to supabaseUserClient
          .from("messages")
          .insert({
            chat_id: chatId,
            user_id: user.id,
            role: "assistant",
            content: aiResponseText,
            model_used: modelId, // Save model used
          });
        if (firstAiMessageError) {
          console.error(
            "Error saving first AI message:",
            firstAiMessageError.message,
            firstAiMessageError
          );
        }
      } else {
        console.error(
          "AI generation failed for first message. Reason:",
          finishReason
        );
      }
      return NextResponse.json({ chatId: chatId });
    } else {
      // Existing chat (streaming)
      if (!chatId) {
        console.error(
          "Logical error: chatId is missing in existing chat flow."
        );
        return NextResponse.json(
          { error: "Internal server error: Missing chat ID" },
          { status: 500 }
        );
      }

      const { error: messageError } = await supabaseUserClient
        .from("messages")
        .insert({
          // Changed to supabaseUserClient
          chat_id: chatId,
          user_id: user.id,
          role: "user",
          content: userMessageContent,
          model_used: modelId, // Save model used
        });
      if (messageError) {
        console.error(
          "Error saving user message:",
          messageError.message,
          messageError
        );
      }

      if (!dataStream) {
        // Should have been initialized if !isNewChat
        dataStream = new StreamData();
      }

      const result = streamText({
        model: google(modelId as GeminiModelId), // Cast modelId
        messages: [systemPrompt, ...recentMessages],
        async onFinish({ text, finishReason }) {
          if (finishReason === "stop" || finishReason === "length") {
            // The message is saved to DB here, which includes model_used and DB-generated created_at
            const { error: aiSaveError } = await supabaseUserClient
              .from("messages")
              .insert({
                chat_id: chatId!,
                user_id: user.id,
                role: "assistant",
                content: text,
                model_used: modelId, // Save model used
              });
            if (aiSaveError) {
              console.error(
                `Error saving streamed AI response for chat ${chatId}:`,
                aiSaveError.message,
                aiSaveError
              );
            } else {
              console.log(
                `Successfully saved streamed AI response for chat ${chatId}`
              );
            }
          } else {
            console.warn(
              `Stream for chat ${chatId} finished with reason: ${finishReason}. AI response not saved.`
            );
          }
          // dataStream?.close(); // Close inside onFinish if appropriate, or after toDataStreamResponse
        },
      });

      // Append custom data to the stream if needed, for example, the modelId used.
      // dataStream.append({ modelUsed: modelId }); // Example if you want to send this info via stream

      // It's important to close the stream once all data is appended.
      // If onFinish is the last thing, closing it there or right after returning the response might be options.
      // For Vercel AI SDK, the stream is typically managed by the library when returning result.toDataStreamResponse().
      // Let's ensure it's closed if not handled by the library after the response is sent.
      // The original code had dataStream?.close() after result.toDataStreamResponse(), which might be too late.
      // Let's try closing it if we are sure no more appends will happen.
      // However, the SDK might handle this. For now, let's rely on the SDK's stream management.
      // If issues arise, dataStream.close() can be called in onFinish or after all appends.

      // Append metadata for the client to use immediately
      if (dataStream) {
        // Ensure dataStream is defined
        dataStream.append({
          // These keys should ideally match what `useChat` or your client-side rendering expects
          // for an AI message object, or you'll need to adapt the client.
          // Standard Vercel AI SDK 'experimental_StreamData' often expects these to be part of the core message.
          // For now, we send them as extra data. Client might need adjustment if it doesn't pick them up.
          // A more robust way is to ensure the AI SDK message object itself can be populated.
          // However, sending it in StreamData is a common workaround.
          ui_model_used: modelId, // Prefixing with ui_ to avoid potential conflicts if SDK has own model_used
          ui_created_at: new Date().toISOString(), // Client-side timestamp for immediate display
        });
        dataStream.close(); // Close the stream now that all data is appended
      }

      return result.toDataStreamResponse({ data: dataStream });
    }
  } catch (error: unknown) {
    console.error(
      "API Chat Route Error:",
      error instanceof Error ? error.message : error,
      error
    );
    let errorMessage = "An internal server error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Ensure dataStream is closed in case of an error after it was initialized
    if (dataStream && typeof dataStream.close === "function") {
      // Removed !dataStream.isClosed
      dataStream.close();
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
