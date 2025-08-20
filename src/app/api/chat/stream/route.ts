import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { GeminiModelId, ChatSettings } from "@/types";
import { randomUUID } from "crypto";
import { handleMessageLimit } from "@/lib/trpc/routers/user";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
});

const createSystemPrompt = (
  modelId: GeminiModelId,
  settings: ChatSettings
): Content => {
  const promptContent = `You are a helpful AI assistant. Keep your responses conversational and helpful.`;

  if (settings.responseLength === "detailed") {
    return {
      role: "user",
      parts: [
        {
          text:
            promptContent +
            " Please provide comprehensive and detailed responses with thorough explanations.",
        },
      ],
    };
  } else {
    return {
      role: "user",
      parts: [
        {
          text:
            promptContent + " Keep your responses concise and to the point.",
        },
      ],
    };
  }
};

export async function POST(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    // Get the full user object if authenticated
    const user = userId ? await currentUser() : null;

    if (!user || !userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Handle message limit logic
    await handleMessageLimit(userId);

    // Get the Clerk JWT token to pass to Supabase for RLS
    const clerkToken = await getToken({ template: "supabase" });

    // Create Supabase client with Clerk JWT for RLS policies
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${clerkToken}`,
          },
        },
      }
    );

    const body = await req.json();
    const { messages, data: requestData } = body;

    const modelId = requestData?.modelId || "gemini-2.0-flash-lite";
    const chatSettings = requestData?.chatSettings || {
      temperature: 0.9,
      responseLength: "brief",
      tone: "formal",
      focusMode: "balanced",
      explanationStyle: "direct",
    };
    const chatId = requestData?.chatId;

    if (!messages || messages.length === 0 || !chatId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const encoder = new TextEncoder();

    // Create a transform stream for better streaming control
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendEvent = async (event: string, data: Record<string, unknown>) => {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(message));
    };

    // Start the streaming process asynchronously
    (async () => {
      try {
        const supabaseServiceAdmin = createSupabaseServiceRoleClient();

        // Save the user message first
        const lastUserMessage = messages[messages.length - 1];
        const userMessageContent = lastUserMessage.content || "";

        await supabase.from("messages").insert({
          chat_id: chatId,
          user_id: userId,
          role: "user",
          content: userMessageContent,
          model_used: modelId,
          attachment_url: requestData?.attachment_url,
          attachment_name: requestData?.attachment_name,
          attachment_type: requestData?.attachment_type,
        });

        // --- START OF SEARCH LOGIC ---
        const today = new Date().toLocaleDateString("en-US", {
          timeZone: "America/Los_Angeles",
        });

        const { data: usageData, error: usageError } =
          await supabaseServiceAdmin
            .from("grounding_api_usage")
            .select("call_count, is_disabled")
            .eq("date", today)
            .single();

        if (usageError && usageError.code !== "PGRST116") {
          console.error("Error fetching search usage:", usageError);
        }

        const isSearchDisabled =
          usageData?.is_disabled || (usageData?.call_count || 0) >= 1450;
        const useSearch = requestData?.useSearch && !isSearchDisabled;
        // --- END OF SEARCH LOGIC ---

        // Prepare system prompt and call LLM
        const systemPromptObject = createSystemPrompt(modelId, chatSettings);
        const systemPromptText =
          (systemPromptObject.parts?.[0] as Part)?.text || "";

        const messagesForLlm: Content[] = messages.map(
          (msg: { role: string; content: string }) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          })
        );

        // Add attachment content if present
        const attachmentContent = requestData?.attachment_content || null;
        const attachmentType = requestData?.attachment_type || null;

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

        const contentsForLlm = [
          { role: "user" as const, parts: [{ text: systemPromptText }] },
          {
            role: "model" as const,
            parts: [{ text: "Okay, I will follow these instructions." }],
          },
          ...messagesForLlm,
        ];

        // --- START of LLM Call modification ---
        const groundingTool = {
          googleSearch: {},
        };

        const resultStream = await genAI.models.generateContentStream({
          config: {
            temperature: chatSettings.temperature,
            // Only include tools if useSearch is true
            ...(useSearch && { tools: [groundingTool] }),
          },
          model: modelId,
          contents: contentsForLlm,
        });
        // --- END of LLM Call modification ---

        let assistantResponseText = "";
        const assistantMessageId = randomUUID();
        let searchReferences: { url: string; title: string }[] = [];

        await sendEvent("messageStart", {
          id: assistantMessageId,
          role: "assistant",
          created_at: new Date().toISOString(),
          model_used: modelId,
        });

        for await (const chunk of resultStream) {
          const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            // Break down large chunks into smaller pieces for better streaming UX
            const words = text.split(/(\s+)/); // Split by whitespace but keep separators

            for (let i = 0; i < words.length; i++) {
              const word = words[i];
              assistantResponseText += word;

              // Send individual words/tokens for smoother streaming
              await sendEvent("chunk", { text: word });

              // Add a small delay for smoother visual streaming (optional)
              if (word.trim() && i < words.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
            }
          }

          // --- START of grounding metadata processing ---
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
          // --- END of grounding metadata processing ---
        }

        // Save the complete assistant message
        const { data: assistantMessageShell, error: shellError } =
          await supabaseServiceAdmin
            .from("messages")
            .insert({
              chat_id: chatId,
              user_id: userId,
              role: "assistant",
              content: assistantResponseText,
              model_used: modelId,
              search_references: searchReferences, // Save references
            })
            .select("id")
            .single();

        if (shellError || !assistantMessageShell) {
          await sendEvent("error", {
            message: "Failed to save assistant message.",
          });
          return;
        }

        // --- START of search usage update ---
        if (searchReferences.length > 0) {
          const { error: newUsageError } = await supabaseServiceAdmin
            .from("grounding_api_usage")
            .upsert(
              {
                date: today,
                call_count: (usageData?.call_count || 0) + 1,
                is_disabled: (usageData?.call_count || 0) + 1 >= 1450,
              },
              { onConflict: "date" }
            );
          if (newUsageError) {
            // Log this error but don't block the user response
            console.error("Error updating search usage:", newUsageError);
          }
        }
        // --- END of search usage update ---

        // Send completion event
        await sendEvent("messageComplete", {
          id: assistantMessageShell.id,
          role: "assistant",
          content: assistantResponseText,
          created_at: new Date().toISOString(),
          model_used: modelId,
          search_references: searchReferences, // Send references to client
        });

        await sendEvent("done", {});
      } catch (err) {
        console.error("Streaming error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred.";
        await sendEvent("error", { message: errorMessage });
      } finally {
        await writer.close();
      }
    })();

    return new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
