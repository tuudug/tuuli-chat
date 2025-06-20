import { NextResponse } from "next/server";
import {
  createServer,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";

export async function POST() {
  const supabaseUserClient = await createServer();
  const supabaseServiceAdmin = createSupabaseServiceRoleClient();

  const {
    data: { user },
    error: authError,
  } = await supabaseUserClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Call the database function to claim daily sparks
    const { data, error } = await supabaseServiceAdmin.rpc(
      "claim_daily_sparks",
      { user_uuid: user.id }
    );

    if (error) {
      console.error("Error claiming daily sparks:", error);
      return NextResponse.json(
        { error: "Failed to claim daily sparks" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Sparks claim API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
