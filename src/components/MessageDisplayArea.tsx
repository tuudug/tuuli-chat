import React, { useRef, useEffect, useState } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import {
  MessageSquareIcon,
  CalculatorIcon, // Math
  AtomIcon, // Physics
  FlaskConicalIcon, // Chemistry
  CodeIcon, // Code
} from "lucide-react";
import ChatMessage from "./ChatMessage";
import LoadingSpinner from "./LoadingSpinner";
import { Message, MODEL_DETAILS, GeminiModelId } from "@/lib/types"; // Use our Message type, add GeminiModelId
import { type CoreMessage } from "ai";

// Define categories and example questions
const categories = {
  Math: {
    icon: CalculatorIcon,
    questions: [
      "Explain the Pythagorean theorem.",
      "What is the derivative of x^2?",
      "Solve for x: 2x + 5 = 15",
      "What are prime numbers?",
    ],
  },
  Physics: {
    icon: AtomIcon,
    questions: [
      "What is Newton's second law of motion?",
      "Explain the theory of relativity.",
      "What is quantum entanglement?",
      "How does gravity work?",
    ],
  },
  Chemistry: {
    icon: FlaskConicalIcon,
    questions: [
      "What is the chemical formula for water?",
      "Explain the difference between ionic and covalent bonds.",
      "What is pH?",
      "Balance the chemical equation: H2 + O2 -> H2O",
    ],
  },
  Code: {
    icon: CodeIcon,
    questions: [
      "Write a Python function to reverse a string.",
      "Explain what an API is.",
      "What is the difference between let and const in JavaScript?",
      "How does CSS Flexbox work?",
    ],
  },
};

type CategoryName = keyof typeof categories;

interface MessageDisplayAreaProps {
  messages: Message[]; // Use our Message type
  chatId: string;
  initialFetchLoading: boolean;
  initialMessagesError: string | null;
  isWaitingForResponse: boolean;
  responseError: string | null;
  onExampleQuestionClick: (question: string) => void;
  selectedModel: GeminiModelId; // Add selectedModel prop
}

const MessageDisplayArea: React.FC<MessageDisplayAreaProps> = ({
  messages,
  chatId,
  initialFetchLoading,
  initialMessagesError,
  isWaitingForResponse,
  responseError,
  onExampleQuestionClick,
  selectedModel, // Destructure selectedModel
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
    messages.length === 0 && chatId === "new" && !isWaitingForResponse;

  return (
    <ScrollArea.Root className="flex-1 overflow-hidden">
      <ScrollArea.Viewport
        ref={scrollAreaViewportRef}
        className="h-full w-full"
      >
        <div className="flex flex-col min-h-full p-4 md:p-6 lg:p-8">
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
              <MessageSquareIcon className="mb-4 h-12 w-12 text-red-500" />
              <p className="text-lg font-medium text-red-500">
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
          {/* Initial State (New Chat) - Centered */}
          {showNewChatInitialState && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-text-primary">
              {/* Category Buttons */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {" "}
                {/* Added flex-wrap */}
                {(Object.keys(categories) as CategoryName[]).map((catName) => {
                  const Icon = categories[catName].icon;
                  const isActive = selectedCategory === catName;
                  return (
                    <button
                      key={catName}
                      onClick={() => setSelectedCategory(catName)}
                      className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
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
                {" "}
                {/* Adjusted max-width */}
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
            </div>
          )}

          {/* Loading Indicator for first message submission */}
          {isWaitingForResponse &&
            chatId === "new" &&
            (() => {
              const isPro = selectedModel === "gemini-2.5-pro-preview-05-06";
              const proStyle = isPro
                ? "p-0.5 bg-gradient-to-r from-purple-400 to-pink-600 rounded-lg"
                : "";
              const text = isPro
                ? "Starting chat with Gemini 2.5 Pro (this may take a moment)..."
                : "Starting chat...";

              return (
                <div className="flex justify-start">
                  <div className={`${proStyle} animate-pulse`}>
                    <div
                      className={`p-3 rounded-lg bg-bg-input text-text-primary shadow-sm ${
                        isPro ? "rounded-[7px]" : ""
                      }`}
                    >
                      <p className="text-xs text-text-secondary">{text}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          {/* Display unified response errors */}
          {responseError && (
            <div className="mt-4 p-3 rounded-lg bg-red-100 text-red-700 border border-red-300">
              <p className="font-medium">Error:</p>
              <p className="text-sm">{responseError}</p>
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
