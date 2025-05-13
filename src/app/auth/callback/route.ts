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
      // Use environment variable for site URL, fallback to request.url if not set
      const siteUrlEnv = process.env.NEXT_PUBLIC_SITE_URL;
      let redirectUrl;
      if (siteUrlEnv) {
        redirectUrl = `${siteUrlEnv.replace(/\/$/, "")}${next}`; // Ensure no double slashes
      } else {
        // Fallback to using the request's origin if env var is not set
        redirectUrl = new URL(next, request.url).toString();
      }
      return NextResponse.redirect(redirectUrl);
    } else {
      console.error("Auth Callback Error:", error.message);
    }
  }

  // Redirect to an error page or home page if code exchange fails
  // Adding error query param might be useful for debugging or showing user feedback
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
