import { type NextRequest } from "next/server";
import { createServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export async function createTRPCContext(req: NextRequest) {
  const { userId, getToken } = await auth();

  // Get the full user object if authenticated
  const user = userId ? await currentUser() : null;

  // Get the Clerk JWT token to pass to Supabase for RLS
  const clerkToken = userId ? await getToken({ template: "supabase" }) : null;

  // Create Supabase client with Clerk JWT for RLS policies
  const supabase = clerkToken
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${clerkToken}`,
            },
          },
        }
      )
    : await createServer(); // Fallback to regular client for unauthenticated requests

  return {
    req,
    supabase,
    userId,
    user, // Full Clerk user object when available
    supabaseAdmin,
  };
}
