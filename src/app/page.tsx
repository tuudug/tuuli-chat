"use client"; // Mark this component as a Client Component

"use client"; // Mark this component as a Client Component

import React from "react";
import { Slot } from "@radix-ui/react-slot"; // Import Slot
import { createClient } from "@/lib/supabase/client"; // Use the client-side Supabase client

export default function LoginPage() {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Optional: Specify a redirect URL after successful login
        // redirectTo: `${location.origin}/auth/callback`,
        // redirectTo: `${location.origin}/chat`, // Redirect to chat page after login
      },
    });

    if (error) {
      console.error("Error logging in with Google:", error.message);
      // Handle error display to the user if needed
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
          Welcome to AI Chat
        </h1>
        {/* Use Slot to compose Radix functionality onto a styled button */}
        <Slot>
          <button
            onClick={handleGoogleLogin}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Sign in with Google
          </button>
        </Slot>
      </div>
    </div>
  );
}
