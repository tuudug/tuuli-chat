// Ensure correct imports from 'ai' and provider
import { streamText, generateText, type CoreMessage, StreamData } from "ai"; // Add generateText
import { createGoogleGenerativeAI } from "@ai-sdk/google"; // Use the provider-specific function
import { createServer } from "@/lib/supabase/server"; // Correct function name
import { cookies } from "next/headers"; // Keep cookies if needed elsewhere, though not used directly here
import { NextResponse } from "next/server";

export const runtime = "edge"; // Required for Vercel AI SDK

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
  messages: CoreMessage[]; // Use CoreMessage type from 'ai'
  data?: {
    // Optional data, we'll use it for modelId and chatId
    modelId?: string;
    chatId?: string;
  };
}

export async function POST(req: Request) {
  // Await the creation of the Supabase client (no arguments needed)
  const supabase = await createServer();

  // 1. Authenticate the user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(); // Now call methods on the resolved client
  if (authError || !user) {
    console.error("API Auth Error:", authError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const modelId = data?.modelId || "gemini-1.5-flash-latest"; // Default model if not provided
  let chatId = data?.chatId; // Existing chat ID or undefined for new chat
  const isNewChat = !chatId; // Flag to determine if this is the first message of a new chat

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  // Initialize StreamData only for streaming responses (not for the first message)
  let dataStream: StreamData | undefined;
  if (!isNewChat) {
    dataStream = new StreamData();
  }
  // Remove the separate newChatId variable, we'll use chatId directly
  // let newChatId: string | null = null; // Removed

  try {
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage.role !== "user") {
      return NextResponse.json(
        { error: "Last message must be from user" },
        { status: 400 }
      );
    }

    // Safely get user message content as string
    const userMessageContent =
      typeof lastUserMessage.content === "string"
        ? lastUserMessage.content
        : JSON.stringify(lastUserMessage.content);

    // 2. Handle new chat (non-streaming first response) vs. existing chat (streaming)
    if (isNewChat) {
      // --- Handle FIRST MESSAGE of a NEW CHAT (Non-Streaming) ---

      // Create new chat entry in DB
      const title = userMessageContent.substring(0, 50) || "New Chat";
      const { data: chatData, error: chatError } = await supabase
        .from("chats")
        .insert({ user_id: user.id, title: title })
        .select("id")
        .single();

      if (chatError || !chatData) {
        console.error("Error creating new chat:", chatError);
        return NextResponse.json(
          { error: "Could not create new chat" },
          { status: 500 }
        );
      }
      chatId = chatData.id; // Assign the newly created chat ID

      // Save the first user message
      const { error: firstUserMessageError } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          user_id: user.id,
          role: "user",
          content: userMessageContent,
          model_used: modelId,
        });
      if (firstUserMessageError) {
        console.error(
          "Error saving first user message:",
          firstUserMessageError
        );
        // Log and continue
      }

      // Generate the first AI response (non-streaming)
      const { text: aiResponseText, finishReason } = await generateText({
        model: google(modelId),
        messages: [systemPrompt, ...messages], // Prepend system prompt
      });

      // Save the first AI response
      if (finishReason === "stop" || finishReason === "length") {
        // Only save if generation was successful/complete
        const { error: firstAiMessageError } = await supabase
          .from("messages")
          .insert({
            chat_id: chatId,
            user_id: user.id, // Associate with the user who initiated
            role: "assistant",
            content: aiResponseText,
            model_used: modelId,
          });
        if (firstAiMessageError) {
          console.error("Error saving first AI message:", firstAiMessageError);
          // Log and continue, but the frontend won't get this message initially via this response
        }
      } else {
        console.error(
          "AI generation failed for first message. Reason:",
          finishReason
        );
        // Potentially return an error or specific response?
        // For now, we'll just return the chatId so the user lands on the page.
      }

      // Return the new chatId. The frontend will navigate and then fetch messages.
      return NextResponse.json({ chatId: chatId });
    } else {
      // --- Handle SUBSEQUENT MESSAGES in an EXISTING CHAT (Streaming) ---

      // Ensure chatId is valid (should be, as isNewChat is false)
      if (!chatId) {
        console.error(
          "Logical error: chatId is missing in existing chat flow."
        );
        return NextResponse.json(
          { error: "Internal server error: Missing chat ID" },
          { status: 500 }
        );
      }

      // Save user message to existing chat
      const { error: messageError } = await supabase.from("messages").insert({
        chat_id: chatId,
        user_id: user.id,
        role: "user",
        content: userMessageContent,
        model_used: modelId,
      });
      if (messageError) {
        console.error("Error saving user message:", messageError);
        // Continue, but log the error
      }

      // Initialize StreamData here, only when streaming
      // Ensure dataStream is defined before use
      if (!dataStream) {
        dataStream = new StreamData();
      }

      // Save the AI response after the stream completes using onFinish
      const result = streamText({
        model: google(modelId),
        messages: [systemPrompt, ...messages], // Prepend system prompt
        async onFinish({ text, toolCalls, toolResults, usage, finishReason }) {
          // Ensure the stream finished successfully before saving
          if (finishReason === "stop" || finishReason === "length") {
            console.log(
              `Stream finished for chat ${chatId}. Saving AI response.`
            );
            const { error: aiSaveError } = await supabase
              .from("messages")
              .insert({
                chat_id: chatId, // chatId is available in this scope
                user_id: user.id, // user is available in this scope
                role: "assistant",
                content: text, // The fully generated text
                model_used: modelId, // modelId is available in this scope
              });

            if (aiSaveError) {
              console.error(
                `Error saving streamed AI response for chat ${chatId}:`,
                aiSaveError
              );
              // Decide how to handle this error - maybe log it, maybe try to signal frontend?
              // For now, just logging.
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
        },
      });

      // Explicitly close the data stream when done (might help signal completion)
      dataStream?.close();

      // Return the streaming response
      return result.toDataStreamResponse({ data: dataStream });
    }
  } catch (error: unknown) {
    console.error("API Chat Route Error:", error);
    let errorMessage = "An internal server error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Ensure dataStream is closed in case of error after it was initialized
    if (dataStream && typeof dataStream.close === "function") {
      dataStream.close();
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
