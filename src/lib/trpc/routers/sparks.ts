import { z } from "zod";
import {
  publicProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";

const calculateSparksCost = (
  model_id: string,
  input_tokens: number,
  output_tokens: number,
  use_search: boolean
): number => {
  let input_price: number;
  let output_price: number;
  let model_multiplier: number;

  switch (model_id) {
    case "gemini-2.5-pro":
      input_price = 1.25 / 1000000.0;
      output_price = 10.0 / 1000000.0;
      model_multiplier = 4.0;
      break;
    case "gemini-2.5-flash":
      input_price = 0.3 / 1000000.0;
      output_price = 2.5 / 1000000.0;
      model_multiplier = 1.0;
      break;
    case "gemini-2.5-flash-lite-preview-06-17":
      input_price = 0.1 / 1000000.0;
      output_price = 0.4 / 1000000.0;
      model_multiplier = 0.2;
      break;
    case "gemini-2.0-flash":
      input_price = 0.1 / 1000000.0;
      output_price = 0.4 / 1000000.0;
      model_multiplier = 0.2;
      break;
    case "gemini-2.0-flash-lite":
      input_price = 0.075 / 1000000.0;
      output_price = 0.3 / 1000000.0;
      model_multiplier = 0.1;
      break;
    default:
      input_price = 0.075 / 1000000.0;
      output_price = 0.3 / 1000000.0;
      model_multiplier = 0.1;
  }

  const total_cost_usd =
    input_tokens * input_price + output_tokens * output_price;
  let sparks_cost = Math.ceil(total_cost_usd * 100000 * model_multiplier);

  if (use_search) {
    sparks_cost = Math.ceil(sparks_cost * 1.2);
  }

  if (sparks_cost < 1) {
    sparks_cost = 1;
  }

  return sparks_cost;
};

export const sparksRouter = createTRPCRouter({
  calculateCost: publicProcedure
    .input(
      z.object({
        model_id: z.string(),
        input_tokens: z.number(),
        output_tokens: z.number(),
        use_search: z.boolean(),
      })
    )
    .query(({ input }) => {
      return calculateSparksCost(
        input.model_id,
        input.input_tokens,
        input.output_tokens,
        input.use_search
      );
    }),

  logAndSpend: protectedProcedure
    .input(
      z.object({
        model_id: z.string(),
        prompt_tokens: z.number(),
        completion_tokens: z.number(),
        assistant_message_id: z.string().uuid(),
        use_search: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      const {
        model_id,
        prompt_tokens,
        completion_tokens,
        assistant_message_id,
        use_search,
      } = input;
      const user_id = user.id;

      const sparks_cost = calculateSparksCost(
        model_id,
        prompt_tokens,
        completion_tokens,
        use_search
      );

      const { data: user_profile, error: profile_error } = await supabase
        .from("user_profiles")
        .select("current_sparks, total_sparks_spent")
        .eq("id", user_id)
        .single();

      if (profile_error || !user_profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found.",
        });
      }

      let new_balance = user_profile.current_sparks;
      const can_afford = user_profile.current_sparks >= sparks_cost;

      if (can_afford) {
        new_balance -= sparks_cost;
      }

      const { error: message_update_error } = await supabase
        .from("messages")
        .update({
          sparks_cost,
          prompt_tokens,
          completion_tokens,
          total_tokens: prompt_tokens + completion_tokens,
        })
        .eq("id", assistant_message_id);

      if (message_update_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update message.",
        });
      }

      if (can_afford) {
        const { error: profile_update_error } = await supabase
          .from("user_profiles")
          .update({
            current_sparks: new_balance,
            total_sparks_spent: user_profile.total_sparks_spent + sparks_cost,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user_id);

        if (profile_update_error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update user profile.",
          });
        }

        const { error: transaction_error } = await supabase
          .from("sparks_transactions")
          .insert({
            user_id,
            transaction_type: "message_cost",
            amount: -sparks_cost,
            balance_after: new_balance,
            message_id: assistant_message_id,
            model_used: model_id,
            estimated_tokens: prompt_tokens + completion_tokens,
            metadata: {
              input_tokens: prompt_tokens,
              output_tokens: completion_tokens,
              model: model_id,
            },
          });

        if (transaction_error) {
          console.error("Failed to log sparks transaction:", transaction_error);
        }
      }

      return {
        success: can_afford,
        sparks_spent: sparks_cost,
        new_balance,
      };
    }),

  claimDaily: protectedProcedure.mutation(async ({ ctx }) => {
    const { supabase, user, supabaseAdmin } = ctx;
    const user_uuid = user.id;

    const { data: user_profile, error: profile_error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user_uuid)
      .single();

    if (profile_error || !user_profile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found.",
      });
    }

    const last_claim_date = new Date(user_profile.last_sparks_claim_at)
      .toISOString()
      .split("T")[0];
    const today_date = new Date().toISOString().split("T")[0];

    if (last_claim_date >= today_date) {
      const next_claim_at = new Date(today_date);
      next_claim_at.setDate(next_claim_at.getDate() + 1);
      throw new TRPCError({
        code: "CONFLICT",
        message: "Already claimed today.",
        cause: {
          next_claim_at,
        },
      });
    }

    const sparks_to_grant = user_profile.is_verified ? 100000 : 5000;

    const { data: updated_profile, error: update_error } = await supabaseAdmin
      .from("user_profiles")
      .update({
        current_sparks: user_profile.current_sparks + sparks_to_grant,
        last_sparks_claim_at: new Date().toISOString(),
        total_sparks_earned:
          (user_profile.total_sparks_earned || 0) + sparks_to_grant,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_uuid)
      .select("current_sparks")
      .single();

    if (update_error || !updated_profile) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update user profile.",
      });
    }

    const { error: transaction_error } = await supabase
      .from("sparks_transactions")
      .insert({
        user_id: user_uuid,
        transaction_type: "daily_claim",
        amount: sparks_to_grant,
        balance_after: updated_profile.current_sparks,
        metadata: {
          verified_user: user_profile.is_verified,
          claim_date: today_date,
        },
      });

    if (transaction_error) {
      // Log the error, but don't throw, as the user has already received their sparks.
      console.error("Failed to log sparks transaction:", transaction_error);
    }

    return {
      success: true,
      sparks_granted: sparks_to_grant,
      new_balance: updated_profile.current_sparks,
      is_verified: user_profile.is_verified,
    };
  }),

  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx;

    const { data: userProfile, error } = await supabase
      .from("user_profiles")
      .select("current_sparks, last_sparks_claim_at, is_verified")
      .eq("id", user.id)
      .single();

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch sparks balance",
      });
    }

    if (!userProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User profile not found",
      });
    }

    const lastClaimDate = new Date(userProfile.last_sparks_claim_at)
      .toISOString()
      .split("T")[0];
    const todayDate = new Date().toISOString().split("T")[0];
    const canClaimToday = lastClaimDate < todayDate;

    return {
      current_sparks: userProfile.current_sparks,
      can_claim_today: canClaimToday,
      is_verified: userProfile.is_verified,
      last_claim_at: userProfile.last_sparks_claim_at,
    };
  }),
});
