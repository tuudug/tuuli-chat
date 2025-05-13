import { createServer } from "@/lib/supabase/server"; // Use the server helper
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/chat/new"; // Default to /chat/new

  if (code) {
    const supabase = await createServer(); // Use the helper function
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirect to the intended destination (e.g., /chat/new) relative to the request URL
      return NextResponse.redirect(new URL(next, request.url));
    } else {
      console.error("Auth Callback Error:", error.message);
    }
  }

  // Redirect to an error page or home page if code exchange fails
  // Adding error query param might be useful for debugging or showing user feedback
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
