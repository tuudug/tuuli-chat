"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Tooltip from "@radix-ui/react-tooltip";
import { createClient } from "@/lib/supabase/client";
import {
  PlusIcon,
  MessageSquareIcon,
  CheckCircle,
  XCircle,
  Zap,
  Star,
} from "lucide-react";
import { Tables } from "@/types/supabase";
import { UserProfile, LIMITS } from "@/lib/types";

// Define props interface
interface ChatHistorySidebarProps {
  chats: Tables<"chats">[];
  loading: boolean;
}

// Helper function to format countdown
function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) {
    return "Resets now!";
  }
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

export default function ChatHistorySidebar({
  chats,
  loading: initialLoading, // Renamed to avoid conflict with internal loading
}: ChatHistorySidebarProps) {
  const params = useParams();
  const router = useRouter();
  const currentChatId = params?.chatId as string | undefined;

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [countdown, setCountdown] = useState<string>("");
  const [_tooltipText, setTooltipText] = useState<string>("");

  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (error && error.code !== "PGRST116") {
          // PGRST116: single row not found
          console.error("Error fetching user profile:", error);
        } else if (data) {
          setUserProfile(data as UserProfile);
        } else if (user) {
          // Added 'if (user)' to ensure user object exists for default profile
          // Profile not found for an authenticated user, set a default non-verified profile
          console.warn(
            "User profile not found on client-side for user:",
            user.id,
            "Setting default non-verified profile."
          );
          const defaultFallbackProfile: UserProfile = {
            id: user.id,
            is_verified: false,
            daily_message_count: 0,
            daily_pro_message_count: 0,
            // Use a recent timestamp, or fetch server time if critical,
            // but for display, client's now is okay for a fallback.
            last_message_reset_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setUserProfile(defaultFallbackProfile);
        } else {
          // User is not available, so profile cannot be determined or defaulted
          console.log(
            "No user session found, cannot fetch or default profile."
          );
        }
      }
      setProfileLoading(false);
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!userProfile) {
      setTooltipText("Loading profile...");
      return;
    }

    // Interval to update countdown
    const intervalId = setInterval(() => {
      const now = new Date();
      const nextReset = new Date(now);
      nextReset.setUTCHours(24, 0, 0, 0); // Next 00:00 UTC

      const diff = nextReset.getTime() - now.getTime();
      const currentCountdown = formatCountdown(diff);
      setCountdown(currentCountdown);
    }, 1000);

    // Initial calculation
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setUTCHours(24, 0, 0, 0);
    const diff = nextReset.getTime() - now.getTime();
    const initialCountdown = formatCountdown(diff);
    setCountdown(initialCountdown);

    return () => clearInterval(intervalId);
  }, [userProfile]);

  if (initialLoading || profileLoading) {
    return (
      <div className="h-full flex items-center justify-center px-3">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col bg-bg-sidebar text-text-primary space-y-3 overflow-hidden">
      <div className="flex flex-col items-center pt-6 px-3">
        <Image
          src="/logo.png"
          alt="Logo"
          width={0}
          height={0}
          sizes="100vw"
          className="w-auto h-10 max-w-[150px]"
          priority
        />
        {userProfile && (
          <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div
                  className={`mt-2 flex items-center space-x-1.5 text-xs rounded-full font-medium cursor-default
                    ${
                      userProfile.is_verified
                        ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px]"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 px-2.5 py-1"
                    }`}
                >
                  {userProfile.is_verified ? (
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-bg-sidebar rounded-full">
                      <CheckCircle size={14} className="text-green-500" />
                      <span className="text-white">Verified</span>
                    </div>
                  ) : (
                    <>
                      <XCircle size={14} className="text-gray-600" />
                      <span>Not Verified</span>
                    </>
                  )}
                </div>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-gray-800 rounded-lg px-0 py-0 shadow-lg z-50 max-w-xs overflow-hidden"
                  sideOffset={5}
                >
                  <div className="flex flex-col text-xs">
                    {/* Header */}
                    <div className="bg-gray-700 px-4 py-2 font-medium text-white">
                      Daily Limits
                    </div>

                    {/* Pro Model */}
                    <div className="border-b border-gray-700 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Zap size={14} className="text-yellow-400" />
                        <span className="text-yellow-300 font-medium">
                          2.5 Pro
                        </span>
                      </div>
                      <div className="text-white">
                        {userProfile.daily_pro_message_count}/
                        {userProfile.is_verified ? (
                          <span>
                            {LIMITS.VERIFIED.PRO_MESSAGES_PER_DAY}{" "}
                            <span className="text-gray-400 line-through text-xs ml-1.5">
                              {LIMITS.NON_VERIFIED.PRO_MESSAGES_PER_DAY}
                            </span>
                          </span>
                        ) : (
                          LIMITS.NON_VERIFIED.PRO_MESSAGES_PER_DAY
                        )}
                      </div>
                    </div>

                    {/* Other Models */}
                    <div className="border-b border-gray-700 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Star size={14} className="text-blue-400" />
                        <span className="text-blue-300 font-medium">
                          Others
                        </span>
                      </div>
                      <div className="text-white">
                        {userProfile.daily_message_count}/
                        {userProfile.is_verified ? (
                          <span>
                            ∞{" "}
                            <span className="text-gray-400 line-through text-xs ml-1.5">
                              {LIMITS.NON_VERIFIED.GENERAL_MESSAGES_PER_DAY}
                            </span>
                          </span>
                        ) : (
                          LIMITS.NON_VERIFIED.GENERAL_MESSAGES_PER_DAY
                        )}
                      </div>
                    </div>

                    {/* Reset Time */}
                    <div className="px-4 py-2 text-gray-300 bg-gray-800 flex items-center justify-between">
                      <span>Resets in:</span>
                      <span className="font-mono">{countdown}</span>
                    </div>
                  </div>
                  <Tooltip.Arrow className="fill-gray-700" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        )}
      </div>
      <div className="px-3">
        <Link
          href="/chat/new"
          className={`w-full px-4 py-2 rounded-md bg-btn-primary hover:bg-btn-primary-hover text-text-primary text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
            // Added whitespace-nowrap
            currentChatId === "new" ? "bg-bg-input" : "" // Highlight if 'new'
          }`}
        >
          <PlusIcon size={16} />
          New Chat
        </Link>
      </div>
      {/* TODO: Add Search Input here */}
      {/* <div className="relative px-3">
        <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          placeholder="Search your threads..."
          className="w-full pl-9 pr-3 py-1.5 rounded-md bg-bg-input border border-border-primary text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-btn-primary"
        />
      </div> */}
      {/* Scrollable Chat List - Added padding here */}
      <ScrollArea.Root className="flex-1 overflow-hidden w-full px-3">
        {" "}
        <ScrollArea.Viewport className="h-full w-full rounded">
          {" "}
          {/* Removed inner padding */}
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 text-text-secondary">
              <MessageSquareIcon className="mb-2" size={32} />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            <>
              {/* TODO: Implement grouping by date */}
              <ul className="space-y-1">
                {chats.map((chat) => (
                  <li key={chat.id}>
                    <Link
                      href={`/chat/${chat.id}`}
                      className={`block w-full text-left px-2 py-1.5 rounded text-sm text-text-primary hover:bg-bg-input focus:outline-none focus:bg-bg-input transition-colors truncate ${
                        // Keep item padding
                        currentChatId === chat.id ? "bg-bg-input" : "" // Highlight if current
                      }`}
                    >
                      {chat.title ||
                        `Chat ${new Date(
                          chat.created_at
                        ).toLocaleDateString()}`}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          className="flex select-none touch-none p-0.5 bg-transparent transition-colors duration-150 ease-out data-[orientation=vertical]:w-2"
        >
          <ScrollArea.Thumb className="flex-1 bg-text-secondary/50 hover:bg-text-secondary/70 rounded-full relative" />
        </ScrollArea.Scrollbar>
        <ScrollArea.Corner className="bg-transparent" />
      </ScrollArea.Root>
      {/* User Info/Logout Section */}
      <div className="sticky bottom-0 z-10 bg-bg-sidebar p-2 border-t border-border-primary">
        <button
          onClick={async () => {
            const supabase = createClient();
            const { error } = await supabase.auth.signOut();
            if (error) {
              console.error("Error logging out:", error.message);
            } else {
              router.push("/");
            }
          }}
          className="w-full px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
