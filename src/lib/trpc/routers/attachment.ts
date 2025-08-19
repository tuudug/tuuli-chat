import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const USER_ATTACHMENTS_BUCKET = "user-attachments";

function sanitizeFileName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export const attachmentRouter = createTRPCRouter({
  upload: protectedProcedure
    .input(
      z.object({
        fileContent: z.string(), // base64 string
        fileName: z.string(),
        fileType: z.string(),
        chatId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { fileContent, fileName, fileType, chatId } = input;
      const supabaseServiceAdmin = createSupabaseServiceRoleClient();

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated.",
        });
      }

      if (!fileContent.includes(",")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid base64 file content",
        });
      }

      const sanitizedFileName = sanitizeFileName(fileName);
      const filePathInBucket = `public/${
        user.id
      }/${chatId}/${Date.now()}_${sanitizedFileName}`;

      const base64Data = fileContent.split(",")[1];
      const fileBuffer = Buffer.from(base64Data, "base64");

      const { error: uploadError } = await supabaseServiceAdmin.storage
        .from(USER_ATTACHMENTS_BUCKET)
        .upload(filePathInBucket, fileBuffer, {
          contentType: fileType,
          upsert: true,
        });

      if (uploadError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Storage upload failed: ${uploadError.message}`,
        });
      }

      const { data: publicUrlData } = supabaseServiceAdmin.storage
        .from(USER_ATTACHMENTS_BUCKET)
        .getPublicUrl(filePathInBucket);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "File uploaded but failed to get public URL.",
        });
      }

      return {
        publicUrl: publicUrlData.publicUrl,
        name: fileName,
        type: fileType,
      };
    }),
});
