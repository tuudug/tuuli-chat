import { createBrowserClient } from "@supabase/ssr";

// Define a function to create a Supabase client for client-side operations
export function createClient() {
  // Create a Supabase client with the Supabase URL and Anon Key from environment variables
  // These variables are exposed to the browser (client-side) because they are prefixed with NEXT_PUBLIC_
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
