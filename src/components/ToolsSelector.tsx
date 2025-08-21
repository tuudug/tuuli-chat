"use client";

import React, { useState } from "react";
import {
  WrenchIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SearchIcon,
  AlertTriangleIcon,
  Crown,
} from "lucide-react";
import { useSearchStatus } from "@/hooks/useChat";
import { useMessageLimit } from "@/contexts/MessageLimitContext";
import UpgradeModal from "./dialogs/UpgradeModal";

interface ToolsSelectorProps {
  useSearch: boolean;
  setUseSearch: (enabled: boolean) => void;
  supportsSearch: boolean;
  disabled?: boolean;
}

const ToolsSelector: React.FC<ToolsSelectorProps> = ({
  useSearch,
  setUseSearch,
  supportsSearch,
  disabled = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const { searchEnabled, loading } = useSearchStatus();
  const { messageLimit } = useMessageLimit();

  const isPremium = messageLimit?.tier === "premium";
  const canUseSearch = supportsSearch && searchEnabled && isPremium;
  const canClickSearch = supportsSearch && searchEnabled; // Allow clicking even for non-premium
  const activeToolsCount = canUseSearch && useSearch ? 1 : 0;

  const handleSearchToggle = () => {
    if (canUseSearch) {
      setUseSearch(!useSearch);
    } else if (canClickSearch && !isPremium) {
      // Trigger upgrade modal for non-premium users
      setIsUpgradeModalOpen(true);
    }
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
        {/* Tools Toggle Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-lg text-xs h-[32px] px-3 gap-1.5 bg-gray-800/50 border border-gray-700/50 text-white hover:bg-gray-800/70 focus:outline-none focus:ring-1 focus:ring-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-75"
          aria-label="Tools"
        >
          <WrenchIcon size={14} className="flex-shrink-0" />
          <span className="font-medium whitespace-nowrap hidden sm:inline">
            Tools
          </span>
          {activeToolsCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-medium bg-blue-600 text-white rounded-full">
              {activeToolsCount}
            </span>
          )}
          {isExpanded ? (
            <ChevronUpIcon
              size={14}
              className="transition-transform duration-75"
            />
          ) : (
            <ChevronDownIcon
              size={14}
              className="transition-transform duration-75"
            />
          )}
        </button>

        {/* Backdrop and Tools Panel */}
        {isExpanded && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsExpanded(false)}
            />
            <div
              className="absolute bottom-full right-0 mb-2 w-72 max-w-[calc(100vw-2rem)] z-50"
              style={{ animation: "slideInFromBottom 100ms ease-out" }}
            >
              <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-lg">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-white mb-3 text-center">
                    Available Tools
                  </h3>

                  <div className="space-y-3">
                    {/* Search Tool */}
                    <button
                      onClick={handleSearchToggle}
                      disabled={!canClickSearch}
                      className={`w-full text-left border rounded-lg p-3 transition-all duration-200 ${
                        canUseSearch && useSearch
                          ? "bg-blue-600/20 border-blue-500/50 text-white"
                          : canClickSearch
                          ? "bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600/50"
                          : "bg-gray-800/30 border-gray-700/30 text-gray-500 cursor-not-allowed opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <SearchIcon
                          size={16}
                          className={
                            canUseSearch && useSearch
                              ? "text-blue-400"
                              : "text-gray-400"
                          }
                        />
                        <h4 className="text-sm font-medium">Search</h4>
                      </div>

                      <p className="text-xs text-gray-400 mb-2">
                        Enhances responses with real-time web search results
                      </p>

                      {loading && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                          <span>Checking availability...</span>
                        </div>
                      )}

                      {!loading && !supportsSearch && (
                        <div className="flex items-center gap-2 text-xs text-amber-400">
                          <AlertTriangleIcon size={12} />
                          <span>Current model doesn&apos;t support search</span>
                        </div>
                      )}

                      {!loading && supportsSearch && !searchEnabled && (
                        <div className="flex items-center gap-2 text-xs text-amber-400">
                          <AlertTriangleIcon size={12} />
                          <span>
                            Search is temporarily disabled due to high usage
                          </span>
                        </div>
                      )}

                      {!loading &&
                        supportsSearch &&
                        searchEnabled &&
                        !isPremium && (
                          <div className="flex items-center gap-2 text-xs text-amber-400">
                            <Crown size={12} />
                            <span>Premium feature</span>
                          </div>
                        )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </>
  );
};

export default ToolsSelector;
