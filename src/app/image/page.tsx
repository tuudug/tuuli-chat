"use client";

import { redirect } from "next/navigation";
import { useMessageLimit } from "@/contexts/MessageLimitContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import PremiumGate from "@/components/PremiumGate";

export default function ImageIndexPage() {
  const { messageLimit, isLoading } = useMessageLimit();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg-primary">
        <LoadingSpinner />
      </div>
    );
  }

  const isPremium = messageLimit?.tier === "premium";

  if (!isPremium) {
    // Show premium gate for basic users
    return (
      <PremiumGate featureName="Image Editor">
        <div className="flex h-full w-full items-center justify-center bg-bg-primary">
          <p className="text-text-secondary">Image Editor Workspace</p>
        </div>
      </PremiumGate>
    );
  }

  redirect("/image/new");
}
