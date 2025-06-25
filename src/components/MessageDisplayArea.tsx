import React, { useRef, useEffect, useState } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { MessageSquareIcon } from "lucide-react";
import ChatMessage from "./ChatMessage";
import LoadingSpinner from "./LoadingSpinner";
import TypingIndicator from "./TypingIndicator";
import { Message, GeminiModelId } from "@/lib/types";
import { categories, CategoryName } from "@/lib/chat-categories";

interface MessageDisplayAreaProps {
  messages: Message[];
  chatId: string;
  initialFetchLoading: boolean;
  initialMessagesError: string | null;
  isAwaitingFirstToken: boolean;
  isOverallLoading: boolean;
  responseError: string | null;
  onExampleQuestionClick: (question: string) => void;
  selectedModel: GeminiModelId;
}

const MessageDisplayArea: React.FC<MessageDisplayAreaProps> = ({
  messages,
  chatId,
  initialFetchLoading,
  initialMessagesError,
  isAwaitingFirstToken,
  isOverallLoading,
  responseError,
  onExampleQuestionClick,
  selectedModel,
}) => {
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryName>("Math");

  useEffect(() => {
    if (scrollAreaViewportRef.current) {
      scrollAreaViewportRef.current.scrollTop =
        scrollAreaViewportRef.current.scrollHeight;
    }
  }, [messages]);

  const showInitialLoading = initialFetchLoading && chatId !== "new";
  const showInitialError = initialMessagesError && chatId !== "new";
  const showEmptyChat =
    !initialFetchLoading &&
    !initialMessagesError &&
    messages.length === 0 &&
    chatId !== "new";
  const showNewChatInitialState =
    messages.length === 0 && chatId === "new" && !isOverallLoading; // Use isOverallLoading here

  return (
    <ScrollArea.Root className="flex-1 overflow-hidden">
      <ScrollArea.Viewport
        ref={scrollAreaViewportRef}
        className="h-full w-full"
      >
        <div className="flex flex-col min-h-full p-4 md:p-6 lg:p-8 pb-28">
          {/* Initial Loading State */}
          {showInitialLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-text-secondary">
              <LoadingSpinner /> {/* Use the new spinner component */}
              <p className="text-lg">Loading chat...</p>
            </div>
          )}
          {/* Initial Error State */}
          {showInitialError && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-text-secondary">
              <MessageSquareIcon className="mb-4 h-12 w-12 text-red-300" />
              <p className="text-lg font-medium text-red-400">
                Error Loading Chat
              </p>
              <p className="text-sm">{initialMessagesError}</p>
            </div>
          )}
          {/* Empty Chat State (Existing Chat) */}
          {showEmptyChat && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-text-secondary">
              <MessageSquareIcon className="mb-4 h-12 w-12" />
              <p className="text-lg font-medium">
                No messages in this chat yet.
              </p>
              <p className="text-sm">
                Send a message to start the conversation.
              </p>
            </div>
          )}
          {showNewChatInitialState && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-text-primary">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 w-full max-w-lg">
                {(Object.keys(categories) as CategoryName[]).map((catName) => {
                  const Icon = categories[catName].icon;
                  const isActive = selectedCategory === catName;
                  return (
                    <button
                      key={catName}
                      onClick={() => setSelectedCategory(catName)}
                      className={`px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${
                        isActive
                          ? "bg-btn-primary text-white"
                          : "bg-bg-input hover:bg-opacity-80"
                      }`}
                    >
                      <Icon size={16} /> {catName}
                    </button>
                  );
                })}
              </div>
              {/* Example Questions for Selected Category */}
              <div className="space-y-3 w-full max-w-sm md:max-w-md">
                {categories[selectedCategory].questions.map((q) => (
                  <button
                    key={q}
                    onClick={() => onExampleQuestionClick(q)}
                    className="w-full text-left p-3 rounded-lg bg-bg-input hover:bg-opacity-80 text-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actual Messages */}
          {!showInitialLoading && !showInitialError && (
            <div className="space-y-4 pb-4 sm:px-4 md:px-16">
              {" "}
              {/* Padding starts from sm breakpoint */}
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {/* Typing Indicator */}
              {isAwaitingFirstToken && messages.length > 0 && (
                <TypingIndicator />
              )}
              {isOverallLoading &&
                chatId === "new" &&
                messages.length === 0 && (
                  <div className="flex justify-start">
                    <div
                      className={`${
                        selectedModel === "gemini-2.5-pro"
                          ? "p-0.5 bg-gradient-to-r from-purple-400 to-pink-600 rounded-lg"
                          : ""
                      } animate-pulse`}
                    >
                      <div
                        className={`p-3 rounded-lg bg-bg-input text-text-primary shadow-sm ${
                          selectedModel === "gemini-2.5-pro"
                            ? "rounded-[7px]"
                            : ""
                        }`}
                      >
                        <p className="text-xs text-text-secondary">
                          {selectedModel === "gemini-2.5-pro"
                            ? "Starting chat with Gemini 2.5 Pro (this may take a moment)..."
                            : "Starting chat..."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Display unified response errors */}
          {responseError && (
            <div className="flex justify-center w-full my-4">
              <div className="max-w-[75%]">
                <div className="p-3 rounded-lg bg-bg-input text-red-400 border border-red-200">
                  <p className="font-medium text-sm">Error</p>
                  <p className="text-sm whitespace-pre-wrap">{responseError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
        className="flex select-none touch-none p-0.5 bg-transparent transition-colors duration-150 ease-out data-[orientation=vertical]:w-2"
      >
        <ScrollArea.Thumb className="flex-1 bg-text-secondary/50 hover:bg-text-secondary/70 rounded-full relative" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner className="bg-transparent" />
    </ScrollArea.Root>
  );
};

export default MessageDisplayArea;
