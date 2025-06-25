"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Zap, AlertTriangleIcon, MessageSquarePlus } from "lucide-react";
import { estimateConversationCost, formatSparks } from "@/lib/sparks";
import type { GeminiModelId } from "@/types";

interface SparksCostIndicatorProps {
  messages: string[]; // Array of message content strings from the conversation
  currentMessage: string; // The current message being typed
  selectedModel: GeminiModelId;
  userSparks?: number; // Current user sparks balance
}

export default function SparksCostIndicator({
  messages,
  currentMessage,
  selectedModel,
  userSparks = 0,
}: SparksCostIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Calculate estimated cost
  const estimatedCost = useMemo(() => {
    if (!currentMessage.trim()) return 0;
    return estimateConversationCost(messages, currentMessage, selectedModel);
  }, [messages, currentMessage, selectedModel]);

  // Show/hide based on whether user is typing
  useEffect(() => {
    if (currentMessage.trim().length > 0) {
      setIsVisible(true);
    } else {
      // Add delay before hiding to prevent flickering
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [currentMessage]);

  // Always render container to prevent UI shifting, but make content invisible
  const shouldShowContent = isVisible && estimatedCost > 0;

  const canAfford = userSparks >= estimatedCost;
  const isExpensive = estimatedCost > 100; // Highlight if cost is high
  const isVeryExpensive = estimatedCost > 5000; // Show floating warning for very high costs

  return (
    <>
      {/* Floating warning for very high costs */}
      {shouldShowContent && isVeryExpensive && (
        <div className="absolute bottom-full left-0 right-0 mb-3 z-10">
          <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-3 text-sm text-amber-300 shadow-lg backdrop-blur-sm">
            <div className="flex items-start space-x-2">
              <MessageSquarePlus
                size={16}
                className="text-amber-400 flex-shrink-0 mt-0.5"
              />
              <div>
                <div className="font-medium text-amber-200">
                  High Spark Cost Alert
                </div>
                <div className="text-xs text-amber-300/90 mt-1">
                  This message will cost{" "}
                  <span className="font-mono font-semibold">
                    {formatSparks(estimatedCost)}
                  </span>{" "}
                  sparks due to the long conversation history.
                </div>
                <div className="text-xs text-amber-300/90 mt-1">
                  💡 <strong>Tip:</strong> Create a new conversation to use
                  fewer sparks per message.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regular cost indicator */}
      <div
        className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all duration-200 flex-shrink-0 border ${
          shouldShowContent
            ? !canAfford
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : isVeryExpensive
              ? "bg-amber-600/20 border-amber-500/40 text-amber-300"
              : isExpensive
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-gray-800/50 border-gray-700/50 text-gray-300"
            : "opacity-0 pointer-events-none w-0 px-0 border-transparent"
        }`}
      >
        {shouldShowContent && (
          <>
            {!canAfford ? (
              <AlertTriangleIcon size={12} className="text-red-400" />
            ) : isVeryExpensive ? (
              <AlertTriangleIcon size={12} className="text-amber-400" />
            ) : (
              <Zap
                size={12}
                className={isExpensive ? "text-amber-400" : "text-gray-400"}
              />
            )}
            <span className="font-mono text-xs font-medium">
              {formatSparks(estimatedCost)}
            </span>
            {!canAfford && (
              <span className="text-red-400 font-medium">(insufficient)</span>
            )}
          </>
        )}
      </div>
    </>
  );
}
