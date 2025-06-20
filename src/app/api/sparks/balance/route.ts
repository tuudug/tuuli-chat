import { NextResponse } from "next/server";
import { createServer } from "@/lib/supabase/server";

export async function GET() {
  const supabaseUserClient = await createServer();

  const {
    data: { user },
    error: authError,
  } = await supabaseUserClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: userProfile, error } = await supabaseUserClient
      .from("user_profiles")
      .select("current_sparks, last_sparks_claim_at, is_verified")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return NextResponse.json(
        { error: "Failed to fetch sparks balance" },
        { status: 500 }
      );
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Check if user can claim today
    const lastClaimDate = new Date(userProfile.last_sparks_claim_at)
      .toISOString()
      .split("T")[0];
    const todayDate = new Date().toISOString().split("T")[0];
    const canClaimToday = lastClaimDate < todayDate;

    return NextResponse.json({
      current_sparks: userProfile.current_sparks,
      can_claim_today: canClaimToday,
      is_verified: userProfile.is_verified,
      last_claim_at: userProfile.last_sparks_claim_at,
    });
  } catch (error) {
    console.error("Sparks balance API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
