import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const pinRouter = createTRPCRouter({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx;

    const { data: userProfile, error } = await supabase
      .from("user_profiles")
      .select("pin_code")
      .eq("id", user.id)
      .single();

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch PIN status",
      });
    }

    if (!userProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User profile not found",
      });
    }

    return {
      has_pin: !!userProfile.pin_code,
    };
  }),

  set: protectedProcedure
    .input(
      z.object({
        pin: z
          .string()
          .length(6)
          .regex(/^\d{6}$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { pin } = input;

      const supabaseServiceRoleClient = createSupabaseServiceRoleClient();
      const { data: updatedProfile, error } = await supabaseServiceRoleClient
        .from("user_profiles")
        .upsert({ id: user.id, pin_code: pin })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set PIN",
        });
      }

      return {
        success: true,
        message: "PIN set successfully",
        profile: updatedProfile,
      };
    }),

  validate: protectedProcedure
    .input(
      z.object({
        pin: z
          .string()
          .length(6)
          .regex(/^\d{6}$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      const { pin } = input;

      const { data: userProfile, error } = await supabase
        .from("user_profiles")
        .select("pin_code")
        .eq("id", user.id)
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to validate PIN",
        });
      }

      if (!userProfile || !userProfile.pin_code) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No PIN set",
        });
      }

      const isValid = pin === userProfile.pin_code;

      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid PIN",
        });
      }

      return {
        success: true,
        message: "PIN validated successfully",
      };
    }),
});
