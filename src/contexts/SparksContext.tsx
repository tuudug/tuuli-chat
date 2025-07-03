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
import { SparkBalance } from "@/types";
import * as sparksApi from "@/services/sparksApi";

type UserProfile = Tables<"user_profiles">;

interface SparksContextType {
  user: User | null;
  userProfile: UserProfile | null;
  sparksBalance: number | null;
  setSparksBalance: (balance: number) => void;
  isLoading: boolean;
  refetchProfile: () => void;
  claimDetails: SparkBalance | null;
  isClaimDetailsLoading: boolean;
  claiming: boolean;
  countdown: string;
  showClaimAnimation: boolean;
  handleClaimSparks: () => Promise<void>;
  fetchClaimStatus: () => Promise<void>;
}

const SparksContext = createContext<SparksContextType | undefined>(undefined);

export const SparksProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sparksBalance, setSparksBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  const [claimDetails, setClaimDetails] = useState<SparkBalance | null>(null);
  const [isClaimDetailsLoading, setIsClaimDetailsLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  const [showClaimAnimation, setShowClaimAnimation] = useState(false);

  const fetchClaimStatus = useCallback(async () => {
    try {
      const data = await sparksApi.fetchSparkBalance();
      setClaimDetails(data);
    } catch (error) {
      console.error("Error fetching spark claim status:", error);
    } finally {
      setIsClaimDetailsLoading(false);
    }
  }, []);

  const handleClaimSparks = useCallback(async () => {
    if (!claimDetails?.can_claim_today || claiming) return;

    setClaiming(true);
    try {
      const result = await sparksApi.claimDailySparks();
      if (result.success) {
        setShowClaimAnimation(true);
        setTimeout(() => setShowClaimAnimation(false), 2000);
        setSparksBalance(result.new_balance);
        await fetchClaimStatus();
      }
    } catch (error) {
      console.error("Error claiming sparks:", error);
    } finally {
      setClaiming(false);
    }
  }, [claimDetails, claiming, fetchClaimStatus]);

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
        await fetchClaimStatus();
      } else if (error) {
        console.error("Error fetching user profile:", error.message);
      }
    }
    setIsLoading(false);
  }, [supabase, fetchClaimStatus]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!claimDetails) return;

    const intervalId = setInterval(() => {
      const now = new Date();
      const nextReset = new Date(now);
      nextReset.setUTCHours(24, 0, 0, 0);

      const diff = nextReset.getTime() - now.getTime();
      const totalSeconds = Math.max(0, Math.floor(diff / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      if (diff <= 0) {
        setCountdown("Available!");
        if (!claimDetails.can_claim_today) {
          fetchClaimStatus();
        }
      } else {
        setCountdown(`${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [claimDetails, fetchClaimStatus]);

  const value = {
    user,
    userProfile,
    sparksBalance,
    setSparksBalance,
    isLoading,
    refetchProfile: fetchProfile,
    claimDetails,
    isClaimDetailsLoading,
    claiming,
    countdown,
    showClaimAnimation,
    handleClaimSparks,
    fetchClaimStatus,
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
