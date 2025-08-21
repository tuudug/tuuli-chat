import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Invalid redeem code" },
        { status: 400 }
      );
    }

    // Create Supabase service role client
    const supabase = createSupabaseServiceRoleClient();

    // Check if the redeem code exists and is not used
    const { data: redeemCode, error: fetchError } = await supabase
      .from("redeem_codes")
      .select("*")
      .eq("code", code.trim())
      .single();

    if (fetchError || !redeemCode) {
      return NextResponse.json(
        { error: "Invalid redeem code" },
        { status: 400 }
      );
    }

    // Check if code is already used
    if (redeemCode.is_used) {
      return NextResponse.json(
        { error: "This redeem code has already been used" },
        { status: 400 }
      );
    }

    // Check if code has expired
    if (redeemCode.expires_at && new Date(redeemCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This redeem code has expired" },
        { status: 400 }
      );
    }

    // First, check if user profile exists, if not create it
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (profileCheckError && profileCheckError.code !== "PGRST116") {
      console.error("Error checking user profile:", profileCheckError);
      return NextResponse.json(
        { error: "Failed to verify user profile" },
        { status: 500 }
      );
    }

    // If user profile doesn't exist, create it
    if (!existingProfile) {
      const { error: createProfileError } = await supabase
        .from("user_profiles")
        .insert({
          id: userId,
          tier: "premium",
          daily_message_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_message_reset_at: new Date().toISOString(),
        });

      if (createProfileError) {
        console.error("Error creating user profile:", createProfileError);
        return NextResponse.json(
          { error: "Failed to create user profile" },
          { status: 500 }
        );
      }
    } else {
      // Upgrade existing user to premium tier
      const { error: upgradeError } = await supabase
        .from("user_profiles")
        .update({
          tier: "premium",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (upgradeError) {
        console.error("Error upgrading user:", upgradeError);
        return NextResponse.json(
          { error: "Failed to upgrade account" },
          { status: 500 }
        );
      }
    }

    // Mark code as used
    const { error: updateCodeError } = await supabase
      .from("redeem_codes")
      .update({
        is_used: true,
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq("code", code.trim());

    if (updateCodeError) {
      console.error("Error updating redeem code:", updateCodeError);
      return NextResponse.json(
        { error: "Failed to process redeem code" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account successfully upgraded to premium!",
        description: redeemCode.description,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in redeem code API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
