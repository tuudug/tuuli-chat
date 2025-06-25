"use client";

import React, { useState, useEffect } from "react";
import { Zap, Crown, Gift, ChevronDown, ChevronRight } from "lucide-react";
import { formatSparks } from "@/lib/sparks";
import { SparkBalance } from "@/lib/types";
import { useSparks } from "@/contexts/SparksContext";
import SparksDetailsPopover from "./user/SparksDetailsPopover";
import * as sparksApi from "@/services/sparksApi";

export default function SparksDisplay() {
  const {
    sparksBalance,
    isLoading: contextIsLoading,
    setSparksBalance,
    userProfile,
  } = useSparks();

  const [claimDetails, setClaimDetails] = useState<SparkBalance | null>(null);
  const [isClaimDetailsLoading, setIsClaimDetailsLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  const [showClaimAnimation, setShowClaimAnimation] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchClaimStatus = async () => {
    try {
      const data = await sparksApi.fetchSparkBalance();
      setClaimDetails(data);
    } catch (error) {
      console.error("Error fetching spark claim status:", error);
    } finally {
      setIsClaimDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchClaimStatus();
    }
  }, [userProfile]);

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
  }, [claimDetails]);

  const handleClaimSparks = async () => {
    if (!claimDetails?.can_claim_today || claiming) return;

    setClaiming(true);
    try {
      const result = await sparksApi.claimDailySparks();
      if (result.success) {
        setShowClaimAnimation(true);
        setTimeout(() => setShowClaimAnimation(false), 2000);
        setSparksBalance(result.new_balance);
        fetchClaimStatus();
      }
    } catch (error) {
      console.error("Error claiming sparks:", error);
    } finally {
      setClaiming(false);
    }
  };

  if (
    contextIsLoading ||
    isClaimDetailsLoading ||
    !userProfile ||
    !claimDetails
  ) {
    return (
      <div className="w-full h-12 bg-gray-700/30 rounded-lg animate-pulse"></div>
    );
  }

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
      <div
        className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-gray-800/70 transition-colors group min-w-0"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-1.5 min-w-0">
          <div className="flex-shrink-0">
            {userProfile.is_verified ? (
              <Crown className="h-3 w-3 text-yellow-400" />
            ) : (
              <div className="h-3 w-3 rounded-full bg-gray-600"></div>
            )}
          </div>
          <div className="flex items-center space-x-1 min-w-0">
            <Zap className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
            <span className="text-white text-xs font-medium truncate">
              {formatSparks(sparksBalance ?? 0)}
            </span>
          </div>
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
          {expanded ? (
            <ChevronDown className="h-2.5 w-2.5 text-gray-400 group-hover:text-gray-300 transition-colors flex-shrink-0" />
          ) : (
            <ChevronRight className="h-2.5 w-2.5 text-gray-400 group-hover:text-gray-300 transition-colors flex-shrink-0" />
          )}
        </div>
      </div>

      {expanded && (
        <SparksDetailsPopover
          userProfile={userProfile}
          sparksBalance={sparksBalance ?? 0}
          claimDetails={claimDetails}
          countdown={countdown}
          showClaimAnimation={showClaimAnimation}
          onClaimSparks={handleClaimSparks}
          claiming={claiming}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}
