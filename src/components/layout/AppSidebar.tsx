"use client";

import ChatHistoryList from "@/components/chat/ChatHistoryList";
import SparksDisplay from "@/components/SparksDisplay";
import UserProfileWidget from "@/components/user/UserProfileWidget";
import { usePin } from "@/contexts/PinContext";
import { createClient } from "@/lib/supabase/client";
import { LockIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

import { useChatLayout } from "@/contexts/ChatLayoutContext";

const AppSidebarContent = () => {
  const { activeChatId } = useChatLayout();
  const { isPinValidated, setUserProfile, isLoading, openPinModal } = usePin();
  const supabase = createClient();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setUserProfile(profile);
      }
    };
    fetchUserProfile();
  }, [setUserProfile, supabase]);

  return (
    <div className="relative h-full flex flex-col bg-bg-sidebar text-text-primary space-y-4 overflow-hidden">
      <div className="pt-6 px-3">
        <div className="flex items-center justify-between">
          <Link href="/exp" className="relative group">
            <Image
              src="/logo.png"
              alt="Logo"
              width={0}
              height={0}
              sizes="100vw"
              className="w-auto h-10 max-w-[120px] cursor-pointer hover:opacity-80 transition-opacity"
              priority
            />
          </Link>
          <SparksDisplay />
        </div>
      </div>
      {isLoading ? null : isPinValidated ? (
        <>
          <div className="px-3">
            <Link
              href="/chat/new"
              className={`w-full px-4 py-2 rounded-md bg-btn-primary hover:bg-btn-primary-hover text-text-primary text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                activeChatId === "new" ? "bg-bg-input" : ""
              }`}
            >
              <PlusIcon size={16} />
              New Chat
            </Link>
          </div>
          <ChatHistoryList />
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-btn-primary/10 rounded-full flex items-center justify-center">
              <LockIcon className="w-8 h-8 text-btn-primary/60" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-text-primary">
                PIN Required
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Enter your PIN to access your chat history and start new
                conversations
              </p>
            </div>
            <button
              onClick={openPinModal}
              className="mt-4 px-4 py-2 rounded-md bg-btn-primary hover:bg-btn-primary-hover text-text-primary text-sm font-medium transition-colors"
            >
              Enter PIN
            </button>
          </div>
        </div>
      )}
      <UserProfileWidget />
    </div>
  );
};

export default function AppSidebar() {
  return <AppSidebarContent />;
}
