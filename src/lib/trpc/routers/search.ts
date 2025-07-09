import { publicProcedure, createTRPCRouter } from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const searchRouter = createTRPCRouter({
  getStatus: publicProcedure.query(async () => {
    const supabase = createSupabaseServiceRoleClient();

    const today = new Date().toLocaleDateString("en-US", {
      timeZone: "America/Los_Angeles",
    });

    const { data, error } = await supabase
      .from("grounding_api_usage")
      .select("is_disabled, call_count")
      .eq("date", today)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error fetching search status",
      });
    }

    const isDisabled = data?.is_disabled || (data?.call_count || 0) >= 1450;

    return {
      is_disabled: isDisabled,
    };
  }),
});
