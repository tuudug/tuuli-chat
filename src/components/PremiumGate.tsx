"use client";

import React, { useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import { useMessageLimit } from "@/contexts/MessageLimitContext";
import LoadingSpinner from "./LoadingSpinner";
import UpgradeModal from "./dialogs/UpgradeModal";

interface PremiumGateProps {
  children: React.ReactNode;
  featureName: string;
}

export default function PremiumGate({
  children,
  featureName,
}: PremiumGateProps) {
  const { messageLimit, isLoading } = useMessageLimit();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg-primary">
        <LoadingSpinner />
      </div>
    );
  }

  const isPremium = messageLimit?.tier === "premium";

  if (!isPremium) {
    return (
      <div className="relative flex h-full w-full overflow-hidden">
        {/* Blurred background with actual content */}
        <div className="absolute inset-0 blur-sm opacity-50 pointer-events-none">
          {children}
        </div>

        {/* Premium required overlay */}
        <div className="relative z-10 flex h-full w-full items-center justify-center bg-bg-primary/80 backdrop-blur-sm">
          <div className="mx-auto max-w-md rounded-2xl border border-border-primary bg-bg-secondary p-8 text-center shadow-2xl">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 p-4">
                <Crown className="h-12 w-12 text-white" />
              </div>
            </div>

            <h2 className="mb-3 text-2xl font-bold text-text-primary">
              Premium Feature
            </h2>

            <p className="mb-6 text-text-secondary">
              {featureName} is available exclusively for Premium users.
            </p>

            <div className="mb-6 space-y-3 rounded-lg bg-bg-tertiary p-4">
              <div className="flex items-start gap-3 text-left">
                <Sparkles className="mt-1 h-5 w-5 flex-shrink-0 text-yellow-500" />
                <div>
                  <h3 className="font-semibold text-text-primary">
                    Unlock {featureName}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Get access to advanced AI-powered tools
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-left">
                <Sparkles className="mt-1 h-5 w-5 flex-shrink-0 text-yellow-500" />
                <div>
                  <h3 className="font-semibold text-text-primary">
                    500 Messages Daily
                  </h3>
                  <p className="text-sm text-text-secondary">
                    10x more messages than the basic tier
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-left">
                <Sparkles className="mt-1 h-5 w-5 flex-shrink-0 text-yellow-500" />
                <div>
                  <h3 className="font-semibold text-text-primary">
                    Priority Support
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Get help faster with premium support
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="w-full rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-3 font-semibold text-white transition-all hover:from-yellow-600 hover:to-yellow-700 hover:shadow-lg"
            >
              Upgrade to Premium
            </button>
          </div>
        </div>

        {/* Upgrade Modal */}
        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
        />
      </div>
    );
  }

  return <>{children}</>;
}
