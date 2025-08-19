"use client";

import React from "react";
import { UserButton } from "@clerk/nextjs";
import MessageLimitDisplay from "@/components/MessageLimitDisplay";

export default function UserProfileWidget() {
  return (
    <div className="sticky bottom-0 z-10 bg-bg-sidebar p-4 border-t border-border-primary">
      <div className="flex items-center justify-center gap-3">
        <UserButton afterSignOutUrl="/" showName={false} />
        <div className="relative">
          <MessageLimitDisplay />
        </div>
      </div>
    </div>
  );
}
