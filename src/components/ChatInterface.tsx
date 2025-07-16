"use client";

import React, { useEffect, useState } from "react";
import { useChat } from "@/hooks/useChat";
import ChatHeader from "./ChatHeader";
import ChatInputArea from "./ChatInputArea";
import MessageDisplayArea from "./MessageDisplayArea";
import { Message } from "@/types";

interface ChatInterfaceProps {
  chatId: string;
}

export default function ChatInterface({ chatId }: ChatInterfaceProps) {
  const {
    messages,
    chatTitle,
    setChatTitle,
    input,
    handleInputChange,
    activeFormSubmitHandler,
    selectedModel,
    setSelectedModel,
    favoriteModel,
    setFavoriteModel,
    chatSettings,
    setChatSettings,
    isLoading,
    error,
    initialFetchLoading,
    isAwaitingFirstToken,
    sparksBalance,
    handleExampleQuestionClick,
    userAvatar,
    hasMore,
    loadMore,
    isLoadingMore,
  } = useChat(chatId);

  const [dynamicContainerStyle, setDynamicContainerStyle] = useState({});

  // Effect for handling visual viewport changes on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        setDynamicContainerStyle({
          height: `${window.visualViewport.height}px`,
        });
      }
    };

    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      handleResize(); // Initial call
      return () => {
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", handleResize);
        }
      };
    }
    return () => {};
  }, []);

  return (
    <div className="flex flex-col h-full" style={dynamicContainerStyle}>
      <ChatHeader
        title={chatTitle}
        chatId={chatId}
        onTitleUpdate={setChatTitle}
        onChatDeleted={() => {
          window.dispatchEvent(
            new CustomEvent("chatDeleted", { detail: { chatId } })
          );
        }}
      />

      <MessageDisplayArea
        messages={messages as unknown as Message[]}
        chatId={chatId}
        initialFetchLoading={initialFetchLoading}
        initialMessagesError={error}
        isAwaitingFirstToken={isAwaitingFirstToken}
        isOverallLoading={isLoading}
        responseError={error}
        onExampleQuestionClick={handleExampleQuestionClick}
        selectedModel={selectedModel}
        userAvatar={userAvatar}
        hasMore={hasMore}
        onLoadMore={loadMore}
        isLoadingMore={isLoadingMore}
      />

      <ChatInputArea
        input={input}
        handleInputChange={handleInputChange}
        handleFormSubmit={activeFormSubmitHandler}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        favoriteModel={favoriteModel}
        onSetFavoriteModel={setFavoriteModel}
        chatSettings={chatSettings}
        setChatSettings={setChatSettings}
        isWaitingForResponse={isLoading}
        messages={messages.map((msg) => ({ content: msg.content }))}
        userSparks={sparksBalance || 0}
      />
    </div>
  );
}
