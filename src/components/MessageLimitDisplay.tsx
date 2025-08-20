"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useMessageLimit } from "@/contexts/MessageLimitContext";

export default function MessageLimitDisplay() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { messageLimit, isLoading } = useMessageLimit();

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (isLoading || !messageLimit) {
    return (
      <div className="w-24 h-8 bg-gray-700/30 rounded-lg animate-pulse"></div>
    );
  }

  const tierColor =
    messageLimit.tier === "premium" ? "text-yellow-400" : "text-gray-400";
  const remainingPercentage =
    (messageLimit.remainingMessages / messageLimit.limit) * 100;
  const isLowMessages = remainingPercentage < 20;

  const renderPopover = () => {
    if (!isOpen || !isMounted) return null;

    return createPortal(
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
        {/* Popover */}
        <div
          ref={popoverRef}
          className="fixed z-50 w-72"
          style={{
            left: triggerRef.current
              ? `${triggerRef.current.getBoundingClientRect().left}px`
              : "0px",
            bottom: triggerRef.current
              ? `${
                  window.innerHeight -
                  triggerRef.current.getBoundingClientRect().top +
                  8
                }px`
              : "0px",
            animation: "slideInFromBottom 100ms ease-out",
          }}
        >
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-lg">
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">
                    Daily Message Limits
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                    }}
                    className="text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Current Tier:</span>
                    <span className={`font-medium ${tierColor}`}>
                      {messageLimit.tier.charAt(0).toUpperCase() +
                        messageLimit.tier.slice(1)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Messages Used:</span>
                    <span className="text-white font-medium">
                      {messageLimit.currentCount} / {messageLimit.limit}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Remaining:</span>
                    <span
                      className={`font-medium ${
                        isLowMessages ? "text-red-300" : "text-green-300"
                      }`}
                    >
                      {messageLimit.remainingMessages}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isLowMessages ? "bg-red-500" : "bg-blue-500"
                      }`}
                      style={{
                        width: `${Math.max(
                          5,
                          (messageLimit.currentCount / messageLimit.limit) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-700">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>Limits reset daily at midnight</span>
                  </div>

                  {messageLimit.tier === "basic" && (
                    <div className="mt-2 text-xs text-yellow-300 bg-yellow-400/10 p-2 rounded">
                      <strong>Upgrade to Premium</strong> for 500 daily messages
                      (10x more!)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>,
      document.body
    );
  };

  return (
    <>
      <style jsx>{`
        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div className="relative">
        <div
          ref={triggerRef}
          className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-gray-800/70 transition-colors group min-w-0"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center space-x-1.5 min-w-0">
            <div className="flex-shrink-0"></div>
            <div className="flex items-center space-x-1 min-w-0">
              <MessageCircle
                className={`h-4 w-4 ${
                  isLowMessages ? "text-red-400" : "text-blue-400"
                } flex-shrink-0`}
              />
              <span
                className={`text-xs font-medium truncate ${
                  isLowMessages ? "text-red-300" : "text-white"
                }`}
              >
                {messageLimit.remainingMessages}/{messageLimit.limit}
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-2.5 w-2.5 text-gray-400 group-hover:text-gray-300 transition-colors flex-shrink-0" />
            ) : (
              <ChevronDown className="h-2.5 w-2.5 text-gray-400 group-hover:text-gray-300 transition-colors flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Render popover using portal */}
        {renderPopover()}
      </div>
    </>
  );
}
