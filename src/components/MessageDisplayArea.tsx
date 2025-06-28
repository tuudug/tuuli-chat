import React, { useRef, useEffect } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareIcon } from "lucide-react";
import ChatMessage from "./ChatMessage";
import LoadingSpinner from "./LoadingSpinner";
import TypingIndicator from "./TypingIndicator";
import { Message, GeminiModelId } from "@/types";
import NewChatSuggestions from "./chat/NewChatSuggestions";

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
  userAvatar?: string | null;
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
  selectedModel: _selectedModel,
  userAvatar,
}) => {
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);

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
    messages.length === 0 && chatId === "new" && !isOverallLoading;

  return (
    <ScrollArea.Root className="flex-1 overflow-hidden">
      <ScrollArea.Viewport
        ref={scrollAreaViewportRef}
        className="h-full w-full"
      >
        <div className="flex flex-col min-h-full p-4 md:p-6 lg:p-8 pb-28">
          {showInitialLoading && (
            <motion.div
              className="flex-1 flex flex-col items-center justify-center text-center text-text-secondary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LoadingSpinner />
              <p className="text-lg">Loading chat...</p>
            </motion.div>
          )}
          {showInitialError && (
            <motion.div
              className="flex-1 flex flex-col items-center justify-center text-center text-text-secondary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MessageSquareIcon className="mb-4 h-12 w-12 text-red-300" />
              <p className="text-lg font-medium text-red-400">
                Error Loading Chat
              </p>
              <p className="text-sm">{initialMessagesError}</p>
            </motion.div>
          )}
          {showEmptyChat && (
            <motion.div
              className="flex-1 flex flex-col items-center justify-center text-center text-text-secondary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MessageSquareIcon className="mb-4 h-12 w-12" />
              <p className="text-lg font-medium">
                No messages in this chat yet.
              </p>
              <p className="text-sm">
                Send a message to start the conversation.
              </p>
            </motion.div>
          )}
          {showNewChatInitialState && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <NewChatSuggestions
                onExampleQuestionClick={onExampleQuestionClick}
              />
            </motion.div>
          )}

          {!showInitialLoading && !showInitialError && (
            <div className="space-y-4 pb-4 sm:px-4 md:px-16">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{
                      duration: 0.2,
                      delay: index * 0.02,
                    }}
                  >
                    <ChatMessage message={msg} userAvatar={userAvatar} />
                  </motion.div>
                ))}
              </AnimatePresence>
              <AnimatePresence>
                {isAwaitingFirstToken && messages.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <AnimatePresence>
            {responseError && (
              <motion.div
                className="flex justify-center w-full my-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="max-w-[75%]">
                  <div className="p-3 rounded-lg bg-bg-input text-red-400 border border-red-200">
                    <p className="font-medium text-sm">Error</p>
                    <p className="text-sm whitespace-pre-wrap">
                      {responseError}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
