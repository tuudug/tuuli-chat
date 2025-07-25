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
import { estimateTokenCount } from "@/lib/sparks";
import { sparksRouter } from "./sparks";

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

const sparksCaller = createCallerFactory(sparksRouter);

export const chatRouter = createTRPCRouter({
  isOwner: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
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
            temperature: z.number().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      const { messages, data } = input;
      const supabaseServiceAdmin = createSupabaseServiceRoleClient();

      const { data: userProfile, error: profileError } =
        await supabaseServiceAdmin
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

      if (profileError && profileError.code !== "PGRST116") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch user profile.",
        });
      }

      if (!userProfile) {
        const { error: createProfileError } = await supabaseServiceAdmin
          .from("user_profiles")
          .insert({ id: user.id });
        if (createProfileError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user profile.",
          });
        }
      }

      const modelId = data?.modelId || "gemini-2.0-flash-lite";

      const chatSettings = data?.chatSettings || {
        temperature: data?.temperature || 0.9,
        responseLength: data?.responseLength || "brief",
        tone: "formal",
        focusMode: "balanced",
        explanationStyle: "direct",
      };

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
      const useSearch = data?.useSearch && !isSearchDisabled;

      const lastUserMessage = messages[messages.length - 1];
      const userMessageContent = lastUserMessage.content || "";
      const allConversationContent = messages.map((m) => m.content).join(" ");
      const estimatedInputTokens = estimateTokenCount(allConversationContent);

      // We need to call the tRPC procedure here
      // const estimatedSparksCost = calculateSparksCost(
      //   modelId,
      //   estimatedInputTokens,
      //   undefined,
      //   data?.useSearch
      // );

      // if ((userProfile?.current_sparks || 0) < estimatedSparksCost) {
      //   throw new TRPCError({
      //     code: "INSUFFICIENT_FUNDS",
      //     message: "Insufficient sparks",
      //   });
      // }

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
      const completionTokens = estimateTokenCount(assistantResponseText);

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

      const caller = sparksCaller(ctx);

      const sparksResult = await caller.logAndSpend({
        model_id: modelId,
        prompt_tokens: estimatedInputTokens,
        completion_tokens: completionTokens,
        assistant_message_id: assistantMessageShell.id,
        use_search: useSearch || false,
      });

      const finalAssistantMessage = {
        id: assistantMessageShell.id,
        role: "assistant",
        content: assistantResponseText,
        created_at: new Date().toISOString(),
        model_used: modelId,
        sparks_cost: sparksResult?.sparks_spent,
        search_references: searchReferences,
      };

      return {
        message: finalAssistantMessage,
        newBalance: sparksResult?.new_balance,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientChatId: z.string().uuid(),
        title: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      const { clientChatId, title } = input;

      if (!title || title.trim().length === 0) {
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
        if (insertError.code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Chat ID already exists.",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not create new chat shell",
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
      const { supabase, user } = ctx;
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
      const { supabase, user } = ctx;
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
      const { supabase, user } = ctx;
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
      const { supabase, user } = ctx;
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
  historyList: protectedProcedure
    .input(z.object({ pin: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      const { pin } = input;

      // This is a simplified authentication check.
      // In a real application, you would have a more robust system for pin validation.
      if (process.env.APP_PIN && pin !== process.env.APP_PIN) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid PIN",
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
