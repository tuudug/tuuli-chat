"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useChatHistory } from "./useChatHistory";

const NEW_USER_WELCOME_KEY = "tuuli-chat-new-user-welcome-shown";

export const useNewUserWelcome = () => {
  const { user } = useUser();
  const { chats, loading: chatsLoading } = useChatHistory();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Only proceed if user is authenticated and chats have finished loading
    if (!user || chatsLoading || hasChecked) return;

    // Check if user has already seen the welcome modal
    const hasSeenWelcome = localStorage.getItem(
      `${NEW_USER_WELCOME_KEY}-${user.id}`
    );

    // Show modal if:
    // 1. User hasn't seen the welcome modal before
    // 2. User has no chats (is a new user)
    if (!hasSeenWelcome && chats.length === 0) {
      setShowModal(true);
    }

    setHasChecked(true);
  }, [user, chats, chatsLoading, hasChecked]);

  const handleAcceptWelcome = () => {
    if (user) {
      // Mark as seen in localStorage
      localStorage.setItem(`${NEW_USER_WELCOME_KEY}-${user.id}`, "true");
    }
    setShowModal(false);
  };

  return {
    showWelcomeModal: showModal,
    handleAcceptWelcome,
    isNewUser: chats.length === 0 && !chatsLoading,
  };
};