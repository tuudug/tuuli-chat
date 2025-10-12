"use client";

import React, { Suspense } from "react";
import ImageEditorInterface from "@/components/image/ImageEditorInterface";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function NewImageThreadPage() {
  // Pass a placeholder id; actual thread is created on first generate
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <ImageEditorInterface imageId="new" />
    </Suspense>
  );
}
