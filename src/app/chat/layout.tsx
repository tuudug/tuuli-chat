"use client";
import React, { useState, useEffect } from "react"; // Added useEffect
import ChatHistorySidebar from "@/components/ChatHistorySidebar";
import { motion, AnimatePresence } from "framer-motion";
import { MenuIcon } from "lucide-react"; // Or your preferred hamburger icon
import { Tables } from "../../types/supabase"; // Import generated types
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { SparksProvider } from "@/contexts/SparksContext";

interface ChatAppLayoutProps {
  children: React.ReactNode;
}

export default function ChatAppLayout({ children }: ChatAppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default to open on desktop
  const [chats, setChats] = useState<Tables<"chats">[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Effect to listen for manual chat deletion events
  useEffect(() => {
    const handleChatDeleted = (event: CustomEvent) => {
      const deletedChatId = event.detail?.chatId;
      if (deletedChatId) {
        console.log("Manually removing deleted chat from list:", deletedChatId);
        setChats((currentChats) =>
          currentChats.filter((chat) => chat.id !== deletedChatId)
        );
      }
    };

    window.addEventListener("chatDeleted", handleChatDeleted as EventListener);

    return () => {
      window.removeEventListener(
        "chatDeleted",
        handleChatDeleted as EventListener
      );
    };
  }, []);

  // Lifted useEffect for fetching chats and realtime subscription
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let userId: string | null = null;

    async function fetchDataAndSubscribe() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          setChats([]); // Clear chats if no user
          return;
        }
        userId = user.id;

        const { data, error } = await supabase
          .from("chats")
          .select("id, title, created_at") // Ensure correct columns
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching initial chats in layout:", error);
          setChats([]);
        } else {
          // Ensure data matches the expected type structure
          setChats((data as Tables<"chats">[]) || []);
        }

        if (userId) {
          const handleNewChat = (payload: { new: Tables<"chats"> }) => {
            console.log(
              "New chat received via realtime in layout:",
              payload.new
            );
            // Add the new chat to the beginning of the list
            setChats((currentChats) => [payload.new, ...currentChats]);
          };

          // Note: DELETE events are handled manually via custom events
          // because Supabase DELETE events are not filterable by user_id

          const handleUpdatedChat = (payload: { new: Tables<"chats"> }) => {
            console.log("Chat updated via realtime in layout:", payload.new);
            // Update the chat in the list
            setChats((currentChats) =>
              currentChats.map((chat) =>
                chat.id === payload.new.id ? payload.new : chat
              )
            );
          };

          channel = supabase
            .channel("chat-changes-layout") // Use a unique channel name
            .on(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              "postgres_changes" as any,
              {
                event: "INSERT",
                schema: "public",
                table: "chats",
                filter: `user_id=eq.${userId}`,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any,
              handleNewChat
            )
            // DELETE events are handled manually via custom events
            .on(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              "postgres_changes" as any,
              {
                event: "UPDATE",
                schema: "public",
                table: "chats",
                filter: `user_id=eq.${userId}`,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any,
              handleUpdatedChat
            )
            .subscribe((status, err) => {
              if (err)
                console.error("Layout Realtime subscription error:", err);
              else console.log("Layout Realtime subscription status:", status);
            });
          console.log("Layout subscribed to chat changes for user:", userId);
        }
      } catch (error) {
        console.error("Error fetching data or subscribing in layout:", error);
        setChats([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDataAndSubscribe();

    return () => {
      if (channel) {
        console.log("Layout unsubscribing from chat inserts");
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [supabase]);

  // Mobile variant: Slides in/out
  const mobileSidebarVariants = {
    open: { x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
    closed: {
      x: "-100%",
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
  };

  // Desktop variant: Animates width and opacity
  const desktopSidebarVariants = {
    open: {
      width: "18rem", // w-72
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.2,
      }, // Added duration hint
    },
    closed: {
      width: 0,
      opacity: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.2,
      }, // Added duration hint
    },
  };

  return (
    <SparksProvider>
      <div className="flex h-screen relative overflow-hidden">
        {/* Sidebar for Desktop - Conditionally rendered with AnimatePresence */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.div
              key="desktop-sidebar"
              className="hidden md:block flex-shrink-0 bg-bg-sidebar h-screen overflow-hidden" // Keep overflow hidden
              initial="closed" // Start closed
              animate="open" // Animate to open
              exit="closed" // Animate to closed on exit
              variants={desktopSidebarVariants}
            >
              {/* Content container needs fixed width */}
              <div className="h-full overflow-y-auto w-72">
                <ChatHistorySidebar
                  chats={chats} // Pass chats
                  loading={loading} // Pass loading
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar for Mobile (Overlay) - Always mounted, controlled by animate */}
        {/* Keep this mounted to avoid re-fetch on mobile toggle if preferred, or conditionally render like desktop */}
        <motion.div
          key="mobile-sidebar"
          className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-bg-sidebar h-screen shadow-xl"
          initial={false}
          animate={isSidebarOpen ? "open" : "closed"}
          variants={mobileSidebarVariants}
          style={{ pointerEvents: isSidebarOpen ? "auto" : "none" }}
        >
          <div className="h-full overflow-y-auto">
            <ChatHistorySidebar
              chats={chats} // Pass chats
              loading={loading} // Pass loading
            />
          </div>
        </motion.div>

        {/* Overlay for Mobile - Conditionally rendered */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              key="mobile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>
        {/* Main Content Area */}
        {/* Use div instead of motion.div if no animation is needed for the content area itself */}
        <div className="flex-1 flex flex-col bg-bg-primary h-screen overflow-y-auto relative">
          {/* Hamburger Menu Button - Mobile */}
          {/* Positioned relative to the main content area, but uses fixed positioning */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden fixed top-4 left-4 z-[60] p-2 bg-bg-sidebar rounded-md text-text-primary hover:bg-opacity-80" // High z-index
            aria-label="Toggle sidebar"
          >
            <MenuIcon size={24} />
          </button>
          {/* Toggle Button - Desktop */}
          {/* Positioned absolutely within the relative main content area */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden md:block absolute top-4 left-4 z-10 p-2 bg-bg-input rounded-md text-text-primary hover:bg-opacity-80"
            aria-label="Toggle sidebar"
          >
            {/* Optionally show different icon when open/closed */}
            <MenuIcon size={20} />
          </button>

          {/* Render children (ChatInterface) */}
          {children}
        </div>
      </div>
    </SparksProvider>
  );
}
