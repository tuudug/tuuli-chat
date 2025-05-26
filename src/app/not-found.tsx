import Link from "next/link";
import { HomeIcon, MessageSquareIcon } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center shadow-2xl">
        {/* 404 Number */}
        <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-4">
          404
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3">Page Not Found</h1>

        {/* Description */}
        <p className="text-gray-300 mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t
          have permission to access it.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/chat/new"
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
          >
            <MessageSquareIcon size={18} />
            Start New Chat
          </Link>

          <Link
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
          >
            <HomeIcon size={18} />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
