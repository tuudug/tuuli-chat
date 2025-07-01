import { NextRequest, NextResponse } from "next/server";
import {
  createServer,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";

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
      .select("pin_code")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return NextResponse.json(
        { error: "Failed to fetch PIN status" },
        { status: 500 }
      );
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      has_pin: !!userProfile.pin_code,
    });
  } catch (error) {
    console.error("PIN status API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabaseUserClient = await createServer();

  const {
    data: { user },
    error: authError,
  } = await supabaseUserClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { pin, action } = body;

    if (!pin || typeof pin !== "string" || pin.length !== 6) {
      return NextResponse.json(
        { error: "PIN must be exactly 6 digits" },
        { status: 400 }
      );
    }

    // Validate PIN contains only digits
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must contain only digits" },
        { status: 400 }
      );
    }

    if (action === "set") {
      const supabaseServiceRoleClient = createSupabaseServiceRoleClient();
      // Set a new PIN
      const { data: updatedProfile, error } = await supabaseServiceRoleClient
        .from("user_profiles")
        .upsert({ id: user.id, pin_code: pin })
        .select()
        .single();

      if (error) {
        console.error("Error setting PIN:", error);
        return NextResponse.json(
          { error: "Failed to set PIN" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "PIN set successfully",
        profile: updatedProfile,
      });
    } else if (action === "validate") {
      // Validate existing PIN
      const { data: userProfile, error } = await supabaseUserClient
        .from("user_profiles")
        .select("pin_code")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        return NextResponse.json(
          { error: "Failed to validate PIN" },
          { status: 500 }
        );
      }

      if (!userProfile || !userProfile.pin_code) {
        return NextResponse.json({ error: "No PIN set" }, { status: 400 });
      }

      const isValid = pin === userProfile.pin_code;

      if (!isValid) {
        return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "PIN validated successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'set' or 'validate'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("PIN API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
