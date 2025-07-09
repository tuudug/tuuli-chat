"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useParams } from "next/navigation";

interface ChatLayoutContextType {
  activeChatId?: string;
}

const ChatLayoutContext = createContext<ChatLayoutContextType | undefined>(
  undefined
);

export const ChatLayoutProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const params = useParams();
  const activeChatId = params?.chatId as string | undefined;

  const value = useMemo(() => ({ activeChatId }), [activeChatId]);

  return (
    <ChatLayoutContext.Provider value={value}>
      {children}
    </ChatLayoutContext.Provider>
  );
};

export const useChatLayout = (): ChatLayoutContextType => {
  const context = useContext(ChatLayoutContext);
  if (context === undefined) {
    throw new Error("useChatLayout must be used within a ChatLayoutProvider");
  }
  return context;
};
