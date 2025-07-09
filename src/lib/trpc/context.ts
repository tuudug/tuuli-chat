import { type NextRequest } from "next/server";
import { createServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function createTRPCContext(req: NextRequest) {
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    req,
    supabase,
    user,
    supabaseAdmin,
  };
}
