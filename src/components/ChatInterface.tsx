"use client";

import React, { useState, useEffect, useCallback, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "ai/react";
import { type CoreMessage } from "ai";
import { createClient } from "@/lib/supabase/client";
import {
  Message,
  GeminiModelId,
  DEFAULT_MODEL_ID,
  MODEL_DETAILS,
} from "@/lib/types"; // Use new model types/constants
import ChatHeader from "./ChatHeader";
import MessageDisplayArea from "./MessageDisplayArea";
import ChatInputArea from "./ChatInputArea";

interface ChatInterfaceProps {
  chatId: string;
}

export default function ChatInterface({ chatId }: ChatInterfaceProps) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedModel, setSelectedModel] =
    useState<GeminiModelId>(DEFAULT_MODEL_ID); // Use new default
  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const [initialMessagesFetched, setInitialMessagesFetched] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(false);
  const [initialMessagesError, setInitialMessagesError] = useState<
    string | null
  >(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    if (chatId === "new" || !chatId) {
      setChatTitle("New Conversation");
      setInitialMessagesFetched(true);
      setInitialFetchLoading(false);
      setInitialMessagesError(null);
      return {
        initialMessages: [],
        fetchedTitle: "New Conversation",
        fetchedModel: DEFAULT_MODEL_ID, // Use new default
      };
    }

    setInitialFetchLoading(true);
    setInitialMessagesError(null);
    setChatTitle(null);

    try {
      const { data: chatData, error: titleError } = await supabase
        .from("chats")
        .select("title")
        .eq("id", chatId)
        .single();

      const fetchedTitle = chatData?.title || "Chat";
      setChatTitle(fetchedTitle);
      if (titleError) console.error("Error fetching chat title:", titleError);

      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (messageError) {
        console.error("Error fetching messages:", messageError);
        setInitialMessagesError(
          `Error loading messages: ${messageError.message}`
        );
        return {
          initialMessages: [],
          fetchedTitle,
          fetchedModel: DEFAULT_MODEL_ID, // Use new default
        };
      }

      const fetchedMessages: Message[] = messageData || [];

      let fetchedModel = DEFAULT_MODEL_ID; // Use new default
      const firstAssistantMessage = fetchedMessages.find(
        (msg) => msg.role === "assistant" && msg.model_used
      );
      // Check if the fetched model_used is a valid GeminiModelId
      const isValidModel = MODEL_DETAILS.some(
        (detail) => detail.id === firstAssistantMessage?.model_used
      );
      if (firstAssistantMessage?.model_used && isValidModel) {
        fetchedModel = firstAssistantMessage.model_used as GeminiModelId;
      }

      return { initialMessages: fetchedMessages, fetchedTitle, fetchedModel };
    } catch (error) {
      setInitialMessagesError(
        `Error loading chat data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setChatTitle("Error Loading Chat");
      return {
        initialMessages: [],
        fetchedTitle: "Error",
        fetchedModel: DEFAULT_MODEL_ID, // Use new default
      };
    } finally {
      setInitialFetchLoading(false);
      setInitialMessagesFetched(true);
    }
  }, [chatId]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error: _chatError, // UseChat error isn't displayed directly anymore
    setMessages,
    data,
  } = useChat({
    api: "/api/chat",
    id: chatId !== "new" ? chatId : undefined,
    initialMessages: [],
    body: {
      modelId: selectedModel,
    },
    onResponse: (response) => {
      if (!response.ok) {
        console.error("Streaming API response error:", response.statusText);
      }
    },
    onFinish: (message) => {
      // Ensure the final message list conforms to our Message type
      setMessages((currentMessages) =>
        currentMessages.map((msg) => {
          // If this is the message that just finished streaming
          if (msg.id === message.id && msg.role === "assistant") {
            return {
              ...msg,
              model_used: selectedModel, // Add the model used for this response
              created_at:
                msg.createdAt?.toISOString() || new Date().toISOString(), // Ensure created_at exists
            } as Message; // Cast to our Message type
          }
          // Ensure other messages also conform (especially user messages from useChat)
          return {
            ...msg,
            created_at:
              msg.createdAt?.toISOString() || new Date().toISOString(),
          } as Message;
        })
      );
      setIsWaitingForResponse(false);
    },
    onError: (err) => {
      console.error("useChat hook error:", err);
      setResponseError(err.message || "An error occurred during streaming.");
      setIsWaitingForResponse(false);
    },
  });

  useEffect(() => {
    if (chatId === "new") {
      setMessages([]);
      setChatTitle("New Conversation");
      setSelectedModel(DEFAULT_MODEL_ID); // Use new default
      setInitialMessagesFetched(false);
      setInitialFetchLoading(false);
      setInitialMessagesError(null);
    } else if (chatId && !initialMessagesFetched) {
      fetchInitialData().then(
        ({ initialMessages, fetchedTitle, fetchedModel }) => {
          // Ensure fetched messages also conform (they should already have created_at from DB)
          setMessages(initialMessages as Message[]);
          setSelectedModel(fetchedModel);
        }
      );
    }
  }, [chatId, initialMessagesFetched, fetchInitialData, setMessages]);

  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      // Assuming the last element in the data array contains our StreamData payload
      const latestStreamDataPayload = data[data.length - 1] as {
        chatId?: string;
      };
      if (latestStreamDataPayload?.chatId && chatId === "new") {
        router.push(`/chat/${latestStreamDataPayload.chatId}`);
      }
    }
  }, [data, chatId, router]);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResponseError(null);
    setIsWaitingForResponse(true);

    const currentInput = input;
    if (!currentInput.trim()) {
      setIsWaitingForResponse(false);
      return;
    }

    if (chatId === "new") {
      try {
        const firstUserMessage: CoreMessage = {
          role: "user",
          content: currentInput,
        };

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [firstUserMessage],
            data: { modelId: selectedModel },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! Status: ${response.status}`
          );
        }

        const result = await response.json();
        const newChatId = result.chatId;

        if (!newChatId) {
          throw new Error("API did not return a new chat ID.");
        }

        router.push(`/chat/${newChatId}`);
      } catch (error) {
        console.error("Error submitting first message:", error);
        setResponseError(
          error instanceof Error ? error.message : "Failed to start chat."
        );
      } finally {
        setIsWaitingForResponse(false);
      }
    } else {
      handleSubmit(e, {
        data: {
          modelId: selectedModel,
          chatId: chatId,
        },
      });
    }
  };

  const handleExampleQuestionClick = (question: string) => {
    handleInputChange({
      target: { value: question },
    } as ChangeEvent<HTMLTextAreaElement>);
    // Optionally, focus the input after setting the value
    // const inputElement = document.querySelector('textarea'); // Find a better way to select if needed
    // inputElement?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader title={chatTitle} />

      <MessageDisplayArea
        messages={messages as unknown as Message[]} // Use double cast
        chatId={chatId}
        initialFetchLoading={initialFetchLoading}
        initialMessagesError={initialMessagesError}
        isWaitingForResponse={isWaitingForResponse}
        responseError={responseError}
        onExampleQuestionClick={handleExampleQuestionClick}
        selectedModel={selectedModel} // Pass selectedModel down
      />

      <ChatInputArea
        input={input}
        handleInputChange={handleInputChange}
        handleFormSubmit={handleFormSubmit}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        isWaitingForResponse={isWaitingForResponse}
      />
    </div>
  );
}
