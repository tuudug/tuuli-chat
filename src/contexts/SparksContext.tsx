"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";
import type { User } from "@supabase/supabase-js";

type UserProfile = Tables<"user_profiles">;

interface SparksContextType {
  user: User | null;
  userProfile: UserProfile | null;
  sparksBalance: number | null;
  setSparksBalance: (balance: number) => void;
  isLoading: boolean;
  refetchProfile: () => void;
}

const SparksContext = createContext<SparksContextType | undefined>(undefined);

export const SparksProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sparksBalance, setSparksBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setUser(user);
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
        setSparksBalance(profile.current_sparks);
      } else if (error) {
        console.error("Error fetching user profile:", error.message);
      }
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const value = {
    user,
    userProfile,
    sparksBalance,
    setSparksBalance,
    isLoading,
    refetchProfile: fetchProfile,
  };

  return (
    <SparksContext.Provider value={value}>{children}</SparksContext.Provider>
  );
};

export const useSparks = (): SparksContextType => {
  const context = useContext(SparksContext);
  if (context === undefined) {
    throw new Error("useSparks must be used within a SparksProvider");
  }
  return context;
};
