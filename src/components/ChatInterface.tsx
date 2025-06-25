"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import ChatHeader from "./ChatHeader";
import ChatInputArea from "./ChatInputArea";
import MessageDisplayArea from "./MessageDisplayArea";
import { Message } from "@/lib/types";

interface ChatInterfaceProps {
  chatId: string;
}

export default function ChatInterface({ chatId }: ChatInterfaceProps) {
  const router = useRouter();
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
    isLoading,
    error,
    initialFetchLoading,
    isAwaitingFirstToken,
    isNewChatFlow,
    uiReadyForNewChat,
    sparksBalance,
    handleExampleQuestionClick,
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

  const showFullUI = !isNewChatFlow || uiReadyForNewChat;

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

      {showFullUI ? (
        <>
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
          />

          <ChatInputArea
            input={input}
            handleInputChange={handleInputChange}
            handleFormSubmit={activeFormSubmitHandler}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            favoriteModel={favoriteModel}
            onSetFavoriteModel={setFavoriteModel}
            isWaitingForResponse={isLoading}
            messages={messages.map((msg) => ({ content: msg.content }))}
            userSparks={sparksBalance || 0}
          />
        </>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
          {error ? (
            <div className="text-red-500 bg-red-100 p-4 rounded-md">
              <h3 className="font-semibold text-lg mb-2">
                Initialization Error
              </h3>
              <p>{error}</p>
              <button
                onClick={() => router.push("/chat/new")}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div>Setting up new chat...</div>
          )}
        </div>
      )}
    </div>
  );
}
