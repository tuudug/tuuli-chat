"use client";

import React, { useEffect, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { useNewUserWelcome } from "@/hooks/useNewUserWelcome";
import ChatHeader from "./ChatHeader";
import ChatInputArea from "./ChatInputArea";
import MessageDisplayArea from "./MessageDisplayArea";
import NewUserWelcomeModal from "./dialogs/NewUserWelcomeModal";
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
    isStreaming,
    error,
    initialFetchLoading,
    isAwaitingFirstToken,
    handleExampleQuestionClick,
    userAvatar,
    hasMore,
    loadMore,
    isLoadingMore,
  } = useChat(chatId);

  const { showWelcomeModal, handleAcceptWelcome } = useNewUserWelcome();
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
    <>
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
          isOverallLoading={isLoading || isStreaming}
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
          messages={messages as unknown as Message[]}
        />
      </div>

      {/* New User Welcome Modal */}
      <NewUserWelcomeModal
        isOpen={showWelcomeModal}
        onAccept={handleAcceptWelcome}
      />
    </>
  );
}
