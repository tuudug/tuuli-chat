"use client";

import React from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import Image from "next/image";
import ChatImageToggle from "@/components/ChatImageToggle";
import ImageThreadList from "@/components/image/ImageThreadList";

export default function ImageHistorySidebar() {
  return (
    <div className="relative h-full flex flex-col bg-bg-sidebar text-text-primary space-y-4">
      <div className="pt-6 px-3">
        <div className="flex items-center justify-center gap-3">
          <Image
            src="/logo.png"
            alt="Logo"
            width={0}
            height={0}
            sizes="100vw"
            className="w-auto h-10 max-w-[120px] cursor-pointer hover:opacity-80 transition-opacity"
            priority
          />
          <ChatImageToggle />
        </div>
      </div>

      <div className="px-3">
        <Link
          href="/image/new"
          className="w-full px-4 py-2 rounded bg-btn-primary hover:bg-btn-primary-hover text-text-primary text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <PlusIcon size={16} />
          New Project
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <ImageThreadList />
      </div>

      <div className="px-3 pb-4 text-xs text-text-secondary">
        Pro tip: Upload an image to get started.
      </div>
    </div>
  );
}
