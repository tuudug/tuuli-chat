import { createClient } from "@supabase/supabase-js";
import { Tables } from "@/types/supabase";

// Note: supabaseAdmin uses the SERVICE_ROLE_KEY which you must only use in a secure server environment.
// NEVER expose this key client-side.
export const supabaseAdmin = createClient<Tables<"user_profiles">>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
