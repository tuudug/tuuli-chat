import { createBrowserClient } from "@supabase/ssr";

// Define a function to create a Supabase client for client-side operations
// Create a single Supabase client instance to be shared across the application
const supabaseClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Define a function that returns the shared Supabase client instance
export function createClient() {
  // This function now returns the singleton instance instead of creating a new one.
  // This ensures that all parts of the app share the same client, which is crucial
  // for managing real-time subscriptions and authentication state consistently.
  return supabaseClient;
}
