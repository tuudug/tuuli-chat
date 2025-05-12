import { createServerClient, type CookieOptions } from "@supabase/ssr";
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
