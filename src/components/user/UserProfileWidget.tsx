"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SparksDisplay from "@/components/SparksDisplay";

export default function UserProfileWidget() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="sticky bottom-0 z-10 bg-bg-sidebar p-2 border-t border-border-primary">
      <div className="flex items-center justify-between mb-2">
        <SparksDisplay />
      </div>
      <button
        onClick={handleLogout}
        className="w-full px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
