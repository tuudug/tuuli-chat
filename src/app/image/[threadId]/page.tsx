"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, notFound } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageEditorInterface from "@/components/image/ImageEditorInterface";
import { api } from "@/lib/trpc/client";
import PremiumGate from "@/components/PremiumGate";

type ValidationStatus = "valid" | "not_found" | "unauthorized" | "loading";

export default function ImageThreadPage() {
  const params = useParams();
  const threadId = params.threadId as string;
  const searchParams = useSearchParams();
  const isNewThread = searchParams.get("newThread") === "true";
  const [validationStatus, setValidationStatus] =
    useState<ValidationStatus>("loading");

  const {
    data: isOwner,
    isLoading,
    error,
  } = api.image.isOwner.useQuery(
    { threadId },
    { enabled: threadId !== "new" && !isNewThread, retry: false }
  );

  useEffect(() => {
    if (threadId === "new" || isNewThread) {
      setValidationStatus("valid");
      return;
    }
    if (isLoading) setValidationStatus("loading");
    else if (error) setValidationStatus("not_found");
    else if (isOwner === false) setValidationStatus("not_found");
    else if (isOwner === true) setValidationStatus("valid");
  }, [threadId, isNewThread, isOwner, isLoading, error]);

  if (validationStatus === "loading") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (validationStatus === "not_found") {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-text-secondary">
        Image thread not found.
      </div>
    );
  }

  if (validationStatus === "unauthorized") {
    notFound();
  }

  return (
    <PremiumGate featureName="Image Editor">
      <ImageEditorInterface imageId={threadId} />
    </PremiumGate>
  );
}
