"use client";

import Link from "next/link";
import {
  AlertTriangleIcon,
  HomeIcon,
  MessageSquareIcon,
  ArrowLeftIcon,
} from "lucide-react";

export default function ChatNotFound() {

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="max-w-md w-full space-y-6">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-yellow-500/10 text-yellow-400">
          <AlertTriangleIcon size={32} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-text-primary">Chat Not Found</h1>

        {/* Description */}
        <p className="text-text-secondary leading-relaxed">
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          The chat you're looking for doesn't exist. It may have been deleted or the link is incorrect.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/chat/new"
            className="w-full inline-flex items-center justify-center gap-2 bg-btn-primary hover:bg-btn-primary-hover text-text-primary font-medium py-3 px-4 rounded-lg transition-colors duration-200"
          >
            <MessageSquareIcon size={18} />
            Start New Chat
          </Link>

          <div className="flex gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-bg-input hover:bg-bg-input-hover text-text-primary font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              <ArrowLeftIcon size={18} />
              Go Back
            </button>

            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-bg-input hover:bg-bg-input-hover text-text-primary font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              <HomeIcon size={18} />
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
