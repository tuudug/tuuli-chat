"use client";

import React, { useState, useEffect } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  CheckCircle,
  Zap,
  // Plus, // Plus is not used, removed to avoid lint errors
  Crown,
  Gift,
  Clock,
  TrendingUp,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { formatSparks } from "@/lib/sparks";
import { SparkBalance } from "@/lib/types"; // UserProfile removed as it comes from context
import { useSparks } from "@/contexts/SparksContext";

interface SparksDisplayProps {
  // userProfile: UserProfile | null; // Removed, will use contextUserProfile
  // onSparksUpdate?: (newBalance: number) => void; // This might also be removed if context handles all updates
}

export default function SparksDisplay({
}: SparksDisplayProps) { // onSparksUpdate removed from props
  const {
    sparksBalance: contextSparksBalance,
    isLoading: contextIsLoading,
    setSparksBalance: setContextSparksBalance,
    userProfile: contextUserProfile,
    // refetchProfile, // Not explicitly used yet, but available
  } = useSparks();

  const [claimDetails, setClaimDetails] = useState<SparkBalance | null>(null);
  const [isClaimDetailsLoading, setIsClaimDetailsLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  const [showClaimAnimation, setShowClaimAnimation] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchClaimStatus = async () => {
    try {
      const response = await fetch("/api/sparks/balance");
      if (response.ok) {
        const data = await response.json();
        setClaimDetails(data);
      }
    } catch (error) {
      console.error("Error fetching spark claim status:", error);
    } finally {
      setIsClaimDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (contextUserProfile) {
      fetchClaimStatus();
    }
  }, [contextUserProfile]);

  useEffect(() => {
    // Update countdown timer
    const intervalId = setInterval(() => {
      const now = new Date();
      const nextReset = new Date(now);
      nextReset.setUTCHours(24, 0, 0, 0); // Next 00:00 UTC

      const diff = nextReset.getTime() - now.getTime();
      // Ensure countdown doesn't show negative values if diff is negative
      const totalSeconds = Math.max(0, Math.floor(diff / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      if (diff <= 0) {
        setCountdown("Available!");
        // Refresh claim status when time resets
        if (claimDetails && !claimDetails.can_claim_today) {
          fetchClaimStatus();
        }
      } else {
        setCountdown(`${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [claimDetails]);

  const handleClaimSparks = async () => {
    if (!claimDetails?.can_claim_today || claiming) return;

    setClaiming(true);
    try {
      const response = await fetch("/api/sparks/claim", {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setShowClaimAnimation(true);
          setTimeout(() => setShowClaimAnimation(false), 2000);

          setContextSparksBalance(result.new_balance);
          // Refresh claim details to get new can_claim_today status
          fetchClaimStatus();
          // onSparksUpdate prop is likely redundant now if context handles updates globally
        }
      }
    } catch (error) {
      console.error("Error claiming sparks:", error);
    } finally {
      setClaiming(false);
    }
  };

  if (contextIsLoading || isClaimDetailsLoading || !contextUserProfile || !claimDetails) {
    return (
      <div className="w-full h-12 bg-gray-700/30 rounded-lg animate-pulse"></div>
    );
  }

  // Use contextUserProfile for verification status
  const dailyReward = contextUserProfile?.is_verified ? 10000 : 5000;

  return (
    <>
      <style jsx>{`
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {/* Compact Default View */}
      <div
        className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-gray-800/70 transition-colors group min-w-0"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-1.5 min-w-0">
          {/* Verification Status */}
          <div className="flex-shrink-0">
            {contextUserProfile.is_verified ? (
              <Crown className="h-3 w-3 text-yellow-400" />
            ) : (
              <div className="h-3 w-3 rounded-full bg-gray-600"></div>
            )}
          </div>

          {/* Sparks Balance */}
          <div className="flex items-center space-x-1 min-w-0">
            <Zap className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
            <span className="text-white text-xs font-medium truncate">
              {formatSparks(contextSparksBalance ?? 0)}
            </span>
          </div>

          {/* Claim button (if available) */}
          {claimDetails.can_claim_today && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClaimSparks();
              }}
              disabled={claiming}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs px-1.5 py-0.5 rounded flex items-center transition-colors flex-shrink-0"
            >
              {claiming ? (
                <div className="animate-spin h-2 w-2 border border-white border-t-transparent rounded-full"></div>
              ) : (
                <Gift className="h-2 w-2" />
              )}
            </button>
          )}

          {/* Expand icon */}
          {expanded ? (
            <ChevronDown className="h-2.5 w-2.5 text-gray-400 group-hover:text-gray-300 transition-colors flex-shrink-0" />
          ) : (
            <ChevronRight className="h-2.5 w-2.5 text-gray-400 group-hover:text-gray-300 transition-colors flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Expandable Details Section - Positioned outside the header */}
      {expanded && (
        <>
          {/* Invisible backdrop to close when clicking outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setExpanded(false)}
          />
          <div className="fixed top-20 left-3 right-3 z-50 max-w-xs">
            <div
              className="w-full space-y-3 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 shadow-lg transition-all duration-150 ease-out"
              style={{
                animation: "slideInFromTop 150ms ease-out",
              }}
            >
              {/* Close button */}
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-white">
                  Account Details {/* TODO: Consider if this title should be dynamic based on user profile */}
                </h3>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Account Status */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {contextUserProfile.is_verified ? (
                      <div className="relative">
                        <Crown className="h-4 w-4 text-yellow-400" />
                        <div className="absolute -top-1 -right-1 h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-gray-600"></div>
                    )}

                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-white text-xs font-medium">
                          {contextUserProfile.is_verified ? "Verified" : "Standard"}
                        </span>
                        {contextUserProfile.is_verified && (
                          <CheckCircle className="h-3 w-3 text-green-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {contextUserProfile.is_verified
                          ? "Premium member"
                          : "Basic account"}
                      </p>
                    </div>
                  </div>

                  {contextUserProfile.is_verified && (
                    <div className="text-right">
                      <div className="text-xs text-yellow-400 font-medium">
                        PREMIUM
                      </div>
                      <div className="text-xs text-gray-400">2x rewards</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Sparks Info */}
              <div className="relative bg-gradient-to-br from-amber-900/20 via-orange-900/10 to-yellow-900/20 border border-amber-500/20 rounded-lg p-3">
                {/* Claim Animation Overlay */}
                {showClaimAnimation && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 animate-pulse rounded-lg"></div>
                )}

                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1.5">
                      <Zap className="h-4 w-4 text-amber-400" />
                      <span className="text-amber-300 text-xs font-medium">
                        Sparks Balance
                      </span>
                    </div>

                    <Tooltip.Provider delayDuration={200}>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button className="text-amber-400 hover:text-amber-300 transition-colors">
                            <TrendingUp className="h-3 w-3" />
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white shadow-lg z-50"
                            sideOffset={5}
                          >
                            <div className="space-y-0.5">
                              <div>
                                Earned:{" "}
                                {contextUserProfile.total_sparks_earned?.toLocaleString() ||
                                  "0"}
                              </div>
                              <div>
                                Spent:{" "}
                                {contextUserProfile.total_sparks_spent?.toLocaleString() ||
                                  "0"}
                              </div>
                            </div>
                            <Tooltip.Arrow className="fill-gray-600" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-lg font-bold text-white">
                        {(contextSparksBalance ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">Available</div>
                    </div>

                    {claimDetails.can_claim_today ? (
                      <button
                        onClick={handleClaimSparks}
                        disabled={claiming}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 text-white text-xs px-2.5 py-1.5 rounded flex items-center space-x-1 transition-all"
                      >
                        {claiming ? (
                          <div className="animate-spin h-2.5 w-2.5 border border-white border-t-transparent rounded-full"></div>
                        ) : (
                          <Gift className="h-2.5 w-2.5" />
                        )}
                        <span>+{formatSparks(dailyReward)}</span>
                      </button>
                    ) : (
                      <div className="text-right">
                        <div className="flex items-center space-x-1 text-gray-400 text-xs mb-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span>Next claim</span>
                        </div>
                        <div className="text-xs font-mono text-white bg-gray-700/50 px-1.5 py-0.5 rounded">
                          {countdown}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="pt-2 border-t border-amber-500/20">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>Daily reward</span>
                      <span>
                        {claimDetails.can_claim_today ? "Ready!" : "Claimed"}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700/50 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full transition-all duration-500 ${
                          claimDetails.can_claim_today
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 w-full animate-pulse"
                            : "bg-gray-600 w-0"
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
