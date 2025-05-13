"use client"; // Mark this component as a Client Component

import React, { useEffect } from "react"; // Add useEffect
import Image from "next/image"; // Import Image
import { useRouter } from "next/navigation"; // Add useRouter
import { Slot } from "@radix-ui/react-slot"; // Import Slot
import { createClient } from "@/lib/supabase/client"; // Use the client-side Supabase client

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter(); // Add router

  // Add useEffect to check auth status and redirect if logged in
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.replace("/chat/new");
      }
    };

    checkUser();
  }, [supabase.auth, router]);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Optional: Specify a redirect URL after successful login
        redirectTo: `${location.origin}/auth/callback`, // Redirect to the dedicated callback route
      },
    });

    if (error) {
      console.error("Error logging in with Google:", error.message);
      // Handle error display to the user if needed
    }
  };

  // Removed useEffect hook for onAuthStateChange

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center">
        <Image
          src="/logo.png"
          alt="AI Chat Logo"
          width={200}
          height={50}
          className="mb-8 mx-auto" // Added mx-auto to center the image
        />
        {/* Use Slot to compose Radix functionality onto a styled button */}
        <Slot>
          <button
            onClick={handleGoogleLogin}
            className="inline-flex items-center justify-center rounded-md bg-blue-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <svg
              viewBox="0 0 24 24"
              className="mr-2 h-5 w-5"
              fill="currentColor"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Sign in with Google
          </button>
        </Slot>
      </div>
    </div>
  );
}
