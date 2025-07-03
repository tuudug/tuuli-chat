"use client";

import React, { useState } from "react";
import { Zap, Crown, Gift, ChevronDown, ChevronRight } from "lucide-react";
import { formatSparks } from "@/lib/sparks";
import { useSparks } from "@/contexts/SparksContext";
import SparksDetailsPopover from "./user/SparksDetailsPopover";

export default function SparksDisplay() {
  const {
    sparksBalance,
    isLoading: contextIsLoading,
    userProfile,
    claimDetails,
    isClaimDetailsLoading,
    claiming,
    countdown,
    showClaimAnimation,
    handleClaimSparks,
  } = useSparks();

  const [expanded, setExpanded] = useState(false);

  if (contextIsLoading || isClaimDetailsLoading || !userProfile) {
    return (
      <div className="w-full h-12 bg-gray-700/30 rounded-lg animate-pulse"></div>
    );
  }

  if (!claimDetails) {
    return null;
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
          {claimDetails?.can_claim_today && (
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
