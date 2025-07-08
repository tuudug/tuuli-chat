import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
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
    console.error("Error fetching search status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }

  const isDisabled = data?.is_disabled || (data?.call_count || 0) >= 1450;

  return NextResponse.json({
    is_disabled: isDisabled,
  });
}
