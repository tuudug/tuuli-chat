import { createServer as createSupabaseUserContextClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { Tables } from "@/types/supabase";

export async function POST(req: Request) {
  const supabase = await createSupabaseUserContextClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pin } = await req.json();

  const { data: userProfile } = (await supabase
    .from("user_profiles")
    .select("pin_code")
    .eq("id", user.id)
    .single()) as { data: Pick<Tables<"user_profiles">, "pin_code"> | null };

  if (userProfile?.pin_code && userProfile.pin_code !== pin) {
    return NextResponse.json({ chats: [] });
  }

  const { data: chats, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ chats });
}
