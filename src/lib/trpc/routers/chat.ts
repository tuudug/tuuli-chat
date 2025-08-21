import { z } from "zod";
import {
  protectedProcedure,
  createTRPCRouter,
  createCallerFactory,
} from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  MODEL_DETAILS,
  ResponseLengthSetting,
  type GeminiModelId,
} from "@/types";
import { ChatSettings } from "@/types/settings";
import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { randomUUID } from "crypto";
import { userRouter } from "./user";

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

  if (settings.responseLength === "detailed") {
    promptContent +=
      " Please provide comprehensive and detailed responses with thorough explanations.";
  } else {
    promptContent += " Keep your responses concise and to the point.";
  }

  if (settings.tone === "casual") {
    promptContent +=
      " Use a friendly, conversational tone. Feel free to use contractions and informal language.";
  } else {
    promptContent +=
      " Maintain a professional and formal tone in your responses.";
  }

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

const userCaller = createCallerFactory(userRouter);

export const chatRouter = createTRPCRouter({
  isOwner: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase, user, userId } = ctx;
      if (!user || !userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      const { chatId } = input;

      const { data, error } = await supabase
        .from("chats")
        .select("id")
        .eq("id", chatId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        return false;
      }

      return !!data;
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            id: z.string(),
            role: z.enum(["user", "assistant"]),
            content: z.string(),
            created_at: z.string(),
          })
        ),
        data: z
          .object({
            modelId: z.custom<GeminiModelId>().optional(),
            chatId: z.string().uuid().optional(),
            attachment_url: z.string().optional(),
            attachment_content: z.string().optional(),
            attachment_name: z.string().optional(),
            attachment_type: z.string().optional(),
            chatSettings: z.custom<ChatSettings>().optional(),
            useSearch: z.boolean().optional(),
            responseLength: z.custom<ResponseLengthSetting>().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user, userId } = ctx;
      if (!user || !userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const { messages, data } = input;
      const supabaseServiceAdmin = createSupabaseServiceRoleClient();

      // Check message limits using the user router
      const caller = userCaller(ctx);
      const limitCheck = await caller.checkMessageLimit();

      if (!limitCheck.canSendMessage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Daily message limit reached. You have used ${limitCheck.currentCount}/${limitCheck.limit} messages. Limit resets tomorrow.`,
        });
      }

      const modelId = data?.modelId || "gemini-2.0-flash-lite";

      const chatSettings = data?.chatSettings || {
        responseLength: data?.responseLength || "brief",
        tone: "formal",
        focusMode: "balanced",
        explanationStyle: "direct",
      };

      // Temperature is always hardcoded to 0.9
      const temperature = 0.9;

      const clientProvidedChatId = data?.chatId;

      if (!messages || messages.length === 0 || !clientProvidedChatId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing required fields",
        });
      }

      const today = new Date().toLocaleDateString("en-US", {
        timeZone: "America/Los_Angeles",
      });

      const { data: usageData, error: usageError } = await supabaseServiceAdmin
        .from("grounding_api_usage")
        .select("call_count, is_disabled")
        .eq("date", today)
        .single();

      if (usageError && usageError.code !== "PGRST116") {
        console.error("Error fetching search usage:", usageError);
      }

      const isSearchDisabled =
        usageData?.is_disabled || (usageData?.call_count || 0) >= 1450;
      
      // Check if user is premium before allowing search
      const userProfile = await caller.getProfile();
      const isPremium = userProfile.tier === "premium";
      
      const useSearch = data?.useSearch && !isSearchDisabled && isPremium;

      const lastUserMessage = messages[messages.length - 1];
      const userMessageContent = lastUserMessage.content || "";

      // Build messages for LLM
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

      // Save the user message BEFORE contacting the LLM so errors still persist the user's input
      await supabase.from("messages").insert({
        chat_id: clientProvidedChatId,
        user_id: user.id,
        role: "user",
        content: userMessageContent,
        model_used: modelId,
        attachment_url: data?.attachment_url,
        attachment_name: data?.attachment_name,
        attachment_type: data?.attachment_type,
      });

      try {
        // Prepare system prompt and call LLM
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
            temperature: temperature,
            tools: useSearch ? [groundingTool] : undefined,
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
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save assistant message.",
          });
        }

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
            console.error("Error updating search usage:", newUsageError);
          }
        }

        // Increment user's daily message count
        await caller.incrementMessageCount();

        const finalAssistantMessage = {
          id: assistantMessageShell.id,
          role: "assistant",
          content: assistantResponseText,
          created_at: new Date().toISOString(),
          model_used: modelId,
          search_references: searchReferences,
        };

        return {
          message: finalAssistantMessage,
        };
      } catch (err) {
        // On ANY error during generation or saving, persist an assistant error message
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred.";
        const safeErrorText = `Sorry, I hit an error while generating a response.\n\nDetails: ${errorMessage}`;

        const { data: errorAssistantMessage } = await supabaseServiceAdmin
          .from("messages")
          .insert({
            chat_id: clientProvidedChatId,
            user_id: user.id,
            role: "assistant",
            content: safeErrorText,
            model_used: modelId,
            usage_metadata: {
              error: true,
              stage: "generation",
              message: errorMessage,
            },
          })
          .select("id")
          .single();

        // Even if the insert above fails silently, still return a client-visible error message
        return {
          message: {
            id: errorAssistantMessage?.id || randomUUID(),
            role: "assistant" as const,
            content: safeErrorText,
            created_at: new Date().toISOString(),
            model_used: modelId,
            usage_metadata: { error: true },
          },
        };
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientChatId: z.string().uuid(),
        title: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user, userId } = ctx;

      if (!user || !userId) {
        console.error("❌ User not authenticated");
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const { clientChatId, title } = input;

      if (!title || title.trim().length === 0) {
        console.error("❌ Missing or invalid title");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing or invalid title",
        });
      }
      const { error: insertError } = await supabase.from("chats").insert({
        id: clientChatId,
        user_id: user.id,
        title: title.trim(),
      });

      if (insertError) {
        console.error("❌ Chat insertion failed:", {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        });

        if (insertError.code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Chat ID already exists.",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Could not create new chat shell: ${insertError.message}`,
        });
      }
      return {
        message: "Chat shell created successfully",
        chatId: clientChatId,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user, userId } = ctx;
      if (!user || !userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      const { chatId } = input;

      const { data: chat, error: fetchError } = await supabase
        .from("chats")
        .select("id, user_id")
        .eq("id", chatId)
        .single();

      if (fetchError || !chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      if (chat.user_id !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized access to chat",
        });
      }

      const { error: messagesDeleteError } = await supabase
        .from("messages")
        .delete()
        .eq("chat_id", input.chatId);

      if (messagesDeleteError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete chat messages",
        });
      }

      const { error: chatDeleteError } = await supabase
        .from("chats")
        .delete()
        .eq("id", input.chatId);

      if (chatDeleteError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete chat",
        });
      }

      return { success: true };
    }),

  editTitle: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        title: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user, userId } = ctx;
      if (!user || !userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      const { chatId, title } = input;

      const { data: chat, error: fetchError } = await supabase
        .from("chats")
        .select("id, user_id")
        .eq("id", chatId)
        .single();

      if (fetchError || !chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      if (chat.user_id !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized access to chat",
        });
      }

      const { data: updatedChat, error: updateError } = await supabase
        .from("chats")
        .update({ title: title.trim() })
        .eq("id", chatId)
        .select("id, title")
        .single();

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update chat title",
        });
      }

      return {
        success: true,
        chat: updatedChat,
      };
    }),

  generateTitle: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        userPrompt: z.string(),
        assistantResponse: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user, userId } = ctx;
      if (!user || !userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      const { chatId, userPrompt, assistantResponse } = input;

      const { data: chat, error: fetchError } = await supabase
        .from("chats")
        .select("id, user_id")
        .eq("id", chatId)
        .single();

      if (fetchError || !chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      if (chat.user_id !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized access to chat",
        });
      }

      const modelId = "gemini-2.0-flash-lite";
      const titlePrompt = `Based on the following conversation, create a concise and relevant title with a maximum of 48 characters.
ONLY RESPOND WITH THE TITLE, NOTHING ELSE.

User: "${userPrompt}"

Assistant: "${assistantResponse}"

Title:`;

      const resultStream = await genAI.models.generateContentStream({
        model: modelId,
        contents: [{ role: "user", parts: [{ text: titlePrompt }] }],
      });

      let newTitle = "";
      for await (const chunk of resultStream) {
        const text = chunk.text;
        if (typeof text === "string") {
          newTitle += text;
        }
      }

      newTitle = newTitle.trim().replace(/"/g, "");

      if (!newTitle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Title generation failed.",
        });
      }

      const { data: updatedChat, error: updateError } = await supabase
        .from("chats")
        .update({ title: newTitle })
        .eq("id", chatId)
        .select("id, title")
        .single();

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update chat title in database",
        });
      }

      return {
        success: true,
        newTitle: updatedChat.title,
      };
    }),

  history: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        limit: z.number().optional(),
        before: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase, user, userId } = ctx;
      if (!user || !userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      const { chatId, limit, before } = input;

      const { data: chat, error: chatError } = await supabase
        .from("chats")
        .select("title")
        .eq("id", chatId)
        .eq("user_id", user.id)
        .single();

      if (chatError) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      let query = supabase.from("messages").select("*").eq("chat_id", chatId);

      if (limit) {
        query = query.order("created_at", { ascending: false });
        if (before) {
          query = query.lt("created_at", before);
        }
        query = query.limit(limit);
      } else {
        query = query.order("created_at", { ascending: true });
      }

      const { data: messagesData, error: messagesError } = await query;

      if (messagesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch messages",
        });
      }

      let messages = messagesData;
      if (limit) {
        messages = messagesData.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      return {
        title: chat.title,
        messages,
      };
    }),
  historyList: protectedProcedure.input(z.object({})).query(async ({ ctx }) => {
    const { supabase, user, userId } = ctx;
    if (!user || !userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    const { data: chats, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch chat history",
      });
    }

    return chats;
  }),
});
