import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Define a function to create a Supabase client for server-side operations
// Use async function as cookies() can be async
export async function createServer() {
  const cookieStore = await cookies();

  // Create and return a Supabase client configured for server-side rendering
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Use getAll to retrieve all cookies
        getAll() {
          return cookieStore.getAll();
        },
        // Use setAll for batch setting cookies, handling potential errors
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (_error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// Note: The original get/set/remove methods might still be needed
// depending on specific use cases or future library updates.
// Keeping the more robust getAll/setAll for now as per your suggestion.

// --- Service Role Client ---
// For backend operations that need to bypass RLS, like admin tasks or specific internal updates.
// Uses the generic @supabase/supabase-js client.
import {
  createClient as createGenericClient,
  SupabaseClient,
} from "@supabase/supabase-js";

let serviceRoleClientInstance: SupabaseClient | null = null;

export function createSupabaseServiceRoleClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Supabase URL or Service Role Key is not defined in environment variables for service client."
    );
  }

  // Create a singleton instance for the service role client
  if (!serviceRoleClientInstance) {
    serviceRoleClientInstance = createGenericClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return serviceRoleClientInstance;
}
