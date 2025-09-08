import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { GeminiModelId } from "@/types/models";

// User tier definitions
export const USER_TIERS = {
  BASIC: "basic",
  PREMIUM: "premium",
} as const;

export type UserTier = (typeof USER_TIERS)[keyof typeof USER_TIERS];

// Daily message limits by tier
export const MESSAGE_LIMITS = {
  [USER_TIERS.BASIC]: 50,
  [USER_TIERS.PREMIUM]: 500,
} as const;

// Utility function to ensure user profile exists
async function ensureUserProfileExists(userId: string) {
  const supabaseAdmin = createSupabaseServiceRoleClient();

  const { data: existingProfile, error } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("❌ Failed to check user profile:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to check user profile.",
    });
  }

  // If user doesn't exist, create a new profile
  if (!existingProfile) {
    const newProfile = {
      id: userId,
      tier: USER_TIERS.BASIC,
      daily_message_count: 0,
      last_message_reset_at: new Date().toISOString(),
    };

    const { data: createdProfile, error: createError } = await supabaseAdmin
      .from("user_profiles")
      .insert(newProfile)
      .select("*")
      .single();

    if (createError) {
      console.error("❌ Failed to create user profile:", {
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to create user profile: ${createError.message}`,
      });
    }

    return createdProfile;
  }

  return existingProfile;
}

export async function handleMessageLimit(
  userId: string,
  modelId: GeminiModelId,
  overrideMessageCost?: number
) {
  const userProfile = await ensureUserProfileExists(userId);

  // Check if we need to reset daily count
  const lastReset = new Date(userProfile.last_message_reset_at);
  const now = new Date();
  const isNewDay = now.toDateString() !== lastReset.toDateString();

  let currentCount = userProfile.daily_message_count;
  if (isNewDay) {
    currentCount = 0;
  }

  // Check if user can send message
  const tier = userProfile.tier as UserTier;
  const limit = MESSAGE_LIMITS[tier] || MESSAGE_LIMITS[USER_TIERS.BASIC];
  const canSendMessage = currentCount < limit;

  if (!canSendMessage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You have exceeded your daily message limit.",
    });
  }

  // Default uniform cost is 1; allow override for special modes (e.g., Think Longer)
  const messageCost = Math.max(1, overrideMessageCost ?? 1);

  // Increment the count
  const newCount = isNewDay ? messageCost : currentCount + messageCost;
  const supabaseAdmin = createSupabaseServiceRoleClient();
  const { error: updateError } = await supabaseAdmin
    .from("user_profiles")
    .update({
      daily_message_count: newCount,
      last_message_reset_at: isNewDay
        ? now.toISOString()
        : userProfile.last_message_reset_at,
    })
    .eq("id", userId);

  if (updateError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to update message count.",
    });
  }

  return { success: true, newCount, limit };
}

// Function to refund message cost when API fails
export async function refundMessageCost(
  userId: string,
  modelId: GeminiModelId,
  overrideMessageCost?: number
) {
  const supabaseAdmin = createSupabaseServiceRoleClient();

  // Get current user profile
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileError || !userProfile) {
    console.error("❌ Failed to get user profile for refund:", profileError);
    return { success: false, error: "Failed to get user profile" };
  }

  // Uniform refund is 1 unless overridden
  const messageCost = Math.max(1, overrideMessageCost ?? 1);

  // Calculate new count (ensure it doesn't go below 0)
  const newCount = Math.max(0, userProfile.daily_message_count - messageCost);

  // Update the count
  const { error: updateError } = await supabaseAdmin
    .from("user_profiles")
    .update({
      daily_message_count: newCount,
    })
    .eq("id", userId);

  if (updateError) {
    console.error("❌ Failed to refund message cost:", updateError);
    return { success: false, error: "Failed to refund message cost" };
  }

  console.log(`✅ Refunded ${messageCost} message(s) for user ${userId}`);
  return { success: true, refundedCount: messageCost, newCount };
}

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const { user, userId } = ctx;
    if (!user || !userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    return await ensureUserProfileExists(user.id);
  }),

  checkMessageLimit: protectedProcedure.query(async ({ ctx }) => {
    const { user, userId } = ctx;
    if (!user || !userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    const userProfile = await ensureUserProfileExists(user.id);

    // Check if we need to reset daily count (new day)
    const lastReset = new Date(userProfile.last_message_reset_at);
    const now = new Date();
    const isNewDay = now.toDateString() !== lastReset.toDateString();

    let currentCount = userProfile.daily_message_count;

    if (isNewDay) {
      // Reset the count for new day
      currentCount = 0;
      const supabaseAdmin = createSupabaseServiceRoleClient();
      await supabaseAdmin
        .from("user_profiles")
        .update({
          daily_message_count: 0,
          last_message_reset_at: now.toISOString(),
        })
        .eq("id", user.id);
    }

    const tier = userProfile.tier as UserTier;
    const limit = MESSAGE_LIMITS[tier] || MESSAGE_LIMITS[USER_TIERS.BASIC];
    const canSendMessage = currentCount < limit;
    const remainingMessages = Math.max(0, limit - currentCount);

    return {
      canSendMessage,
      currentCount,
      limit,
      remainingMessages,
      tier,
    };
  }),

  incrementMessageCount: protectedProcedure.mutation(async ({ ctx }) => {
    const { user, userId } = ctx;
    if (!user || !userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    const userProfile = await ensureUserProfileExists(user.id);

    // Check if we need to reset daily count (new day)
    const lastReset = new Date(userProfile.last_message_reset_at);
    const now = new Date();
    const isNewDay = now.toDateString() !== lastReset.toDateString();

    let newCount: number;

    if (isNewDay) {
      newCount = 1; // First message of the day
    } else {
      newCount = userProfile.daily_message_count + 1;
    }

    // Update the count
    const supabaseAdmin = createSupabaseServiceRoleClient();
    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        daily_message_count: newCount,
        last_message_reset_at: isNewDay
          ? now.toISOString()
          : userProfile.last_message_reset_at,
      })
      .eq("id", user.id);

    if (updateError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update message count.",
      });
    }

    const tier = userProfile.tier as UserTier;
    const limit = MESSAGE_LIMITS[tier] || MESSAGE_LIMITS[USER_TIERS.BASIC];
    const remainingMessages = Math.max(0, limit - newCount);

    return {
      newCount,
      remainingMessages,
      tier,
      limit,
    };
  }),

  updateTier: protectedProcedure
    .input(z.object({ tier: z.enum([USER_TIERS.BASIC, USER_TIERS.PREMIUM]) }))
    .mutation(async ({ ctx, input }) => {
      const { user, userId } = ctx;
      if (!user || !userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      const { tier } = input;
      const supabaseAdmin = createSupabaseServiceRoleClient();

      const { data: updatedProfile, error } = await supabaseAdmin
        .from("user_profiles")
        .update({ tier })
        .eq("id", user.id)
        .select("*")
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user tier.",
        });
      }

      return updatedProfile;
    }),

  // Export the utility function for use in other routers
  ensureUserProfileExists: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const userId = input.userId || user?.id;

      if (!userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User ID required",
        });
      }

      return await ensureUserProfileExists(userId);
    }),
});
