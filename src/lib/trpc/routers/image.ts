import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { USER_TIERS } from "./user";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
});

function sanitizeFileName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export const imageRouter = createTRPCRouter({
  listThreads: protectedProcedure.query(async ({ ctx }) => {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("image_threads_with_latest")
      .select("*")
      .order("latest_turn_created_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to load image threads: ${error.message}`,
      });
    }

    return data ?? [];
  }),

  getTurns: protectedProcedure
    .input(z.object({ threadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;
      const { data, error } = await supabase
        .from("image_turns")
        .select("*")
        .eq("thread_id", input.threadId)
        .order("created_at", { ascending: true });
      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to load turns: ${error.message}`,
        });
      }
      return data ?? [];
    }),

  isOwner: protectedProcedure
    .input(z.object({ threadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;
      const { data, error } = await supabase.rpc("is_image_thread_owner", {
        p_thread_id: input.threadId,
      });
      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to verify ownership: ${error.message}`,
        });
      }
      return data === true;
    }),

  generate: protectedProcedure
    .input(
      z.object({
        threadId: z.string().uuid().optional(),
        prompt: z.string().min(1),
        image: z
          .object({ content: z.string(), name: z.string(), type: z.string() })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, supabase } = ctx;
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      }

      // Check if user is premium
      const supabaseServiceAdmin = createSupabaseServiceRoleClient();
      const { data: userProfile, error: profileError } =
        await supabaseServiceAdmin
          .from("user_profiles")
          .select("tier")
          .eq("id", user.id)
          .single();

      if (profileError || !userProfile) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch user profile",
        });
      }

      if (userProfile.tier !== USER_TIERS.PREMIUM) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Image editing is only available for Premium users",
        });
      }

      // 1) Ensure thread exists
      let threadId = input.threadId ?? null;
      if (!threadId) {
        const { data: thread, error: threadError } = await supabase
          .from("image_threads")
          .insert({ user_id: user.id })
          .select("id")
          .single();
        if (threadError || !thread) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create thread: ${threadError?.message}`,
          });
        }
        threadId = thread.id as string;
      }

      // 2) Optional: upload user input image
      let inputImageUrl: string | null = null;
      if (input.image) {
        const sanitizedName = sanitizeFileName(input.image.name);
        const path = `public/${
          user.id
        }/${threadId}/input_${Date.now()}_${sanitizedName}`;

        try {
          const base64 = input.image.content.includes(",")
            ? input.image.content.split(",")[1]
            : input.image.content;
          const buffer = Buffer.from(base64, "base64");
          const { error: uploadError } = await supabaseServiceAdmin.storage
            .from("images")
            .upload(path, buffer, {
              contentType: input.image.type,
              upsert: true,
            });
          if (uploadError) {
            throw uploadError;
          }
          const { data: publicUrlData } = supabaseServiceAdmin.storage
            .from("images")
            .getPublicUrl(path);
          inputImageUrl = publicUrlData.publicUrl;
        } catch (_e) {
          // continue without input image URL if upload fails
          inputImageUrl = null;
        }
      }

      // 2b) If no new input image was provided for an existing thread, use the latest image in the thread
      let fallbackInlineBase64: string | null = null;
      let fallbackInlineMime: string = "image/png";
      if (!input.image && threadId) {
        // Prefer most recent generated output image
        const { data: lastOutput } = await supabase
          .from("image_turns")
          .select("output_image_url")
          .eq("thread_id", threadId)
          .not("output_image_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let sourceUrl: string | null = lastOutput?.output_image_url ?? null;

        if (!sourceUrl) {
          // Fallback to earliest input image
          const { data: firstInput } = await supabase
            .from("image_turns")
            .select("input_image_url")
            .eq("thread_id", threadId)
            .not("input_image_url", "is", null)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          sourceUrl = firstInput?.input_image_url ?? null;
        }

        if (sourceUrl) {
          try {
            const res = await fetch(sourceUrl);
            const contentType = res.headers.get("content-type");
            if (contentType) fallbackInlineMime = contentType;
            const buf = Buffer.from(await res.arrayBuffer());
            fallbackInlineBase64 = buf.toString("base64");
            if (!inputImageUrl) inputImageUrl = sourceUrl;
          } catch (_err) {
            fallbackInlineBase64 = null;
          }
        }
      }

      // 3) Enforce message limit: each image edit costs 10
      // Reuse existing helper by passing any valid model id and override cost
      // Import lazily to avoid circular imports
      const { handleMessageLimit, refundMessageCost } = await import(
        "@/lib/trpc/routers/user"
      );
      try {
        await handleMessageLimit(user.id, "gemini-2.5-flash", 10);
      } catch (err) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            err instanceof Error ? err.message : "Message limit exceeded",
        });
      }

      // 4) Call Gemini image model
      const modelId = "gemini-2.5-flash-image-preview";

      let outputImageBase64: string | null = null;
      try {
        let inlineData: { data: string; mimeType: string } | null = null;
        if (input.image) {
          inlineData = {
            data: input.image.content.includes(",")
              ? input.image.content.split(",")[1]
              : input.image.content,
            mimeType: input.image.type,
          };
        } else if (fallbackInlineBase64) {
          inlineData = {
            data: fallbackInlineBase64,
            mimeType: fallbackInlineMime,
          };
        }

        const userParts: Part[] = [{ text: input.prompt }];
        if (inlineData) {
          userParts.push({ inlineData });
        }

        const contents: Content[] = [
          {
            role: "user",
            parts: userParts,
          },
        ];

        const response = await genAI.models.generateContent({
          model: modelId,
          contents,
        });

        // Prefer first inlineData image
        const parts = (response.candidates?.[0]?.content?.parts ??
          []) as unknown[];
        for (const partUnknown of parts) {
          const part = partUnknown as { inlineData?: { data?: string } };
          if (part.inlineData?.data) {
            outputImageBase64 = part.inlineData.data;
            break;
          }
        }
        if (!outputImageBase64) {
          // Some SDK versions expose a top-level text; treat as error
          throw new Error("No image data returned by model");
        }
      } catch (err) {
        await refundMessageCost(user.id, "gemini-2.5-flash", 10);

        // Persist an error turn for visibility
        await supabase.from("image_turns").insert({
          thread_id: threadId!,
          user_id: user.id,
          prompt: input.prompt,
          input_image_url: inputImageUrl,
          error: err instanceof Error ? err.message : "Generation failed",
          model_id: modelId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error ? err.message : "Image generation failed",
        });
      }

      // 5) Upload output image to storage
      const outputPath = `public/${
        user.id
      }/${threadId}/output_${Date.now()}.png`;
      const outputBuffer = Buffer.from(outputImageBase64, "base64");
      const { error: outUploadErr } = await supabaseServiceAdmin.storage
        .from("images")
        .upload(outputPath, outputBuffer, {
          contentType: "image/png",
          upsert: true,
        });
      if (outUploadErr) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to upload generated image: ${outUploadErr.message}`,
        });
      }
      const { data: outPublicUrl } = supabaseServiceAdmin.storage
        .from("images")
        .getPublicUrl(outputPath);

      // 6) Save turn
      const { data: savedTurn, error: insertErr } = await supabase
        .from("image_turns")
        .insert({
          thread_id: threadId!,
          user_id: user.id,
          prompt: input.prompt,
          input_image_url: inputImageUrl,
          output_image_url: outPublicUrl.publicUrl,
          model_id: modelId,
        })
        .select("id, output_image_url")
        .single();
      if (insertErr || !savedTurn) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to save image turn: ${insertErr?.message}`,
        });
      }

      return {
        threadId,
        turnId: savedTurn.id as string,
        outputImageUrl: savedTurn.output_image_url as string,
      };
    }),
});
