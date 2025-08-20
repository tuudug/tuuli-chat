"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { api } from "@/lib/trpc/client";
import { TRPCClientErrorLike } from "@trpc/client";
import { AppRouter } from "@/lib/trpc/root";

type MessageLimitContextType = {
  messageLimit:
    | {
        canSendMessage: boolean;
        currentCount: number;
        limit: number;
        remainingMessages: number;
        tier: string;
      }
    | undefined;
  isLoading: boolean;
  error: TRPCClientErrorLike<AppRouter> | null;
  refetch: () => void;
};

const MessageLimitContext = createContext<MessageLimitContextType | undefined>(
  undefined
);

export const MessageLimitProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const {
    data: messageLimit,
    isLoading,
    error,
    refetch,
  } = api.user.checkMessageLimit.useQuery(undefined, {
    refetchOnWindowFocus: true,
    staleTime: 60 * 1000, // 1 minute
  });

  return (
    <MessageLimitContext.Provider
      value={{ messageLimit, isLoading, error, refetch }}
    >
      {children}
    </MessageLimitContext.Provider>
  );
};

export const useMessageLimit = () => {
  const context = useContext(MessageLimitContext);
  if (context === undefined) {
    throw new Error(
      "useMessageLimit must be used within a MessageLimitProvider"
    );
  }
  return context;
};
