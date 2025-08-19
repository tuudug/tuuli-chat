"use client";

import { useState, useEffect } from "react";

import { v4 as uuidv4 } from "uuid";
import {
  Message,
  GeminiModelId,
  DEFAULT_MODEL_ID,
  MODEL_DETAILS,
} from "@/types";
import { ChatSettings, DEFAULT_CHAT_SETTINGS } from "@/types/settings";
import { api } from "@/lib/trpc/client";
import { useUser } from "@clerk/nextjs";
import { useLocalStorage } from "./useLocalStorage";

type AttachmentApiData = {
  attachment_url: string;
  attachment_content: string;
  attachment_name: string;
  attachment_type: string;
};

export const useChat = (chatId: string) => {
  const createChatMutation = api.chat.create.useMutation();
  const generateTitleMutation = api.chat.generateTitle.useMutation();
  const uploadAttachmentMutation = api.attachment.upload.useMutation();
  const { user } = useUser();
  const utils = api.useUtils();

  // State Management
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] =
    useState<GeminiModelId>(DEFAULT_MODEL_ID);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(
    DEFAULT_CHAT_SETTINGS
  );
  const [favoriteModel, setFavoriteModel] =
    useLocalStorage<GeminiModelId | null>("favoriteModel", null);

  // Loading and Error States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialFetchLoading, setInitialFetchLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Streaming States
  const [isStreaming, setIsStreaming] = useState(false);

  // New state for handling new chat creation
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);

  // Track the effective chat ID (once we create a chat, use that instead of "new")
  const [effectiveChatId, setEffectiveChatId] = useState<string>(chatId);

  // Update effective chat ID when chatId prop changes
  useEffect(() => {
    setEffectiveChatId(chatId);
  }, [chatId]);

  const {
    data: chatData,
    isLoading: isChatDataLoading,
    error: chatDataError,
  } = api.chat.history.useQuery(
    { chatId, limit: 10 },
    {
      enabled: !!chatId && chatId !== "new",
    }
  );

  useEffect(() => {
    if (chatData) {
      setChatTitle(chatData.title);
      setMessages(chatData.messages as Message[]);
      setHasMore(chatData.messages.length === 10);
      const lastAssistantMessage = [...(chatData.messages as Message[])]
        .reverse()
        .find((msg) => msg.role === "assistant" && msg.model_used);
      if (
        lastAssistantMessage?.model_used &&
        MODEL_DETAILS.some((d) => d.id === lastAssistantMessage.model_used)
      ) {
        setSelectedModel(lastAssistantMessage.model_used as GeminiModelId);
      }
    }
    if (chatDataError) {
      setError(chatDataError.message);
      setChatTitle("Error Loading Chat");
    }
    setInitialFetchLoading(isChatDataLoading);
  }, [chatData, chatDataError, isChatDataLoading]);

  useEffect(() => {
    if (chatId === "new") {
      setMessages([]);
      setChatTitle("New Conversation");
      setInput("");
      setError(null);
      setPendingChatId(null);
      setHasMore(false);
      if (favoriteModel) {
        setSelectedModel(favoriteModel);
      }
    }
  }, [chatId, favoriteModel]);

  // Listen for reset-to-new-chat event from sidebar
  useEffect(() => {
    const handleResetToNewChat = () => {
      console.log("🔄 Received reset-to-new-chat event, resetting state...");

      // Reset all relevant state
      setMessages([]);
      setChatTitle("New Conversation");
      setInput("");
      setError(null);
      setIsLoading(false);
      setIsStreaming(false);
      setPendingChatId(null);
      setEffectiveChatId("new");

      console.log("✅ Chat state reset to clean new chat state");
    };

    window.addEventListener("reset-to-new-chat", handleResetToNewChat);

    return () => {
      window.removeEventListener("reset-to-new-chat", handleResetToNewChat);
    };
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setInput(e.target.value);
  };

  const handleFormSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    attachmentFile?: File | null,
    useSearch?: boolean
  ) => {
    e.preventDefault();
    if (isLoading) return;

    const currentInput = input;
    if (!currentInput.trim() && !attachmentFile) return;

    setIsLoading(true);
    setError(null);

    // Handle new chat creation - improved flow
    if (effectiveChatId === "new") {
      const newClientChatId = uuidv4();
      try {
        await createChatMutation.mutateAsync({
          clientChatId: newClientChatId,
          title: "New Conversation",
        });

        // Update effective chat ID immediately to avoid re-triggering this flow
        setEffectiveChatId(newClientChatId);

        // Update browser history without navigation/re-render
        const newUrl = `/chat/${newClientChatId}`;
        window.history.replaceState(null, "", newUrl);

        // Dispatch event to immediately update sidebar (fallback for realtime)
        window.dispatchEvent(
          new CustomEvent("chat-history-insert", {
            detail: {
              id: newClientChatId,
              title: "New Conversation",
              created_at: new Date().toISOString(),
            },
          })
        );

        let attachmentDataForApi: Partial<AttachmentApiData> = {};
        if (attachmentFile) {
          const fileContent = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(attachmentFile);
          });
          const uploadResult = await uploadAttachmentMutation.mutateAsync({
            fileContent,
            fileName: attachmentFile.name,
            fileType: attachmentFile.type,
            chatId: newClientChatId,
          });
          attachmentDataForApi = {
            attachment_url: uploadResult.publicUrl,
            attachment_content: fileContent,
            attachment_name: uploadResult.name,
            attachment_type: uploadResult.type,
          };
        }

        const userMessage: Message = {
          id: uuidv4(),
          role: "user",
          content: currentInput,
          created_at: new Date().toISOString(),
          timestamp: new Date(),
          ...(attachmentFile && {
            attachment_name: attachmentFile.name,
            attachment_type: attachmentFile.type,
            attachment_preview: attachmentDataForApi.attachment_url,
          }),
        };

        const newMessages: Message[] = [userMessage];
        setMessages(newMessages);
        setInput("");

        // Continue with sending the message to the new chat using streaming
        await streamMessage(newMessages, {
          modelId: selectedModel,
          chatId: newClientChatId,
          chatSettings: chatSettings,
          ...attachmentDataForApi,
          useSearch,
        });
        setIsLoading(false);
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create chat.");
        setIsLoading(false);
        return;
      }
    }

    // Handle existing chat message sending
    let attachmentDataForApi: Partial<AttachmentApiData> = {};
    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: currentInput,
      created_at: new Date().toISOString(),
      timestamp: new Date(),
    };

    if (attachmentFile) {
      try {
        const fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(attachmentFile);
        });

        const uploadResult = await uploadAttachmentMutation.mutateAsync({
          fileContent,
          fileName: attachmentFile.name,
          fileType: attachmentFile.type,
          chatId: effectiveChatId,
        });
        userMessage.attachment_name = uploadResult.name;
        userMessage.attachment_type = uploadResult.type;
        userMessage.attachment_preview = uploadResult.publicUrl;
        attachmentDataForApi = {
          attachment_url: uploadResult.publicUrl,
          attachment_content: fileContent,
          attachment_name: uploadResult.name,
          attachment_type: uploadResult.type,
        };
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to process attachment."
        );
        setIsLoading(false);
        return;
      }
    }

    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");

    // Use streaming for better user experience
    await streamMessage(newMessages, {
      modelId: selectedModel,
      chatId: effectiveChatId,
      chatSettings: chatSettings,
      ...attachmentDataForApi,
      useSearch,
    });

    setIsLoading(false);
  };

  const handleExampleQuestionClick = (question: string) => {
    setInput(question);
  };

  const loadMore = async () => {
    if (!hasMore || isLoadingMore || !messages.length) return;

    setIsLoadingMore(true);
    try {
      const oldestTimestamp = messages[0].created_at;
      const data = await utils.chat.history.fetch({
        chatId: effectiveChatId,
        limit: 10,
        before: oldestTimestamp,
      });
      const newOlderMessages = data.messages as Message[];
      setMessages((prev) => [...newOlderMessages, ...prev]);
      setHasMore(newOlderMessages.length === 10);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load more messages"
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Streaming function to handle real-time message updates
  const streamMessage = async (
    messagesForStreaming: Message[],
    requestData: {
      modelId: GeminiModelId;
      chatId: string;
      chatSettings: ChatSettings;
      attachment_url?: string;
      attachment_content?: string;
      attachment_name?: string;
      attachment_type?: string;
      useSearch?: boolean;
    }
  ) => {
    setIsStreaming(true);
    setError(null);

    // Capture the chat ID for title generation
    const chatIdForTitleGeneration = requestData.chatId;

    try {
      // First, send the request data to initialize streaming
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messagesForStreaming,
          data: requestData,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      let currentStreamingMessage: Message | null = null;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep the incomplete message in buffer

        for (const message of lines) {
          if (!message.trim()) continue;

          const lines = message.split("\n");
          let eventType = "";
          let data = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.substring(7);
            } else if (line.startsWith("data: ")) {
              data = line.substring(6);
            }
          }

          if (eventType && data) {
            try {
              const parsedData = JSON.parse(data);

              switch (eventType) {
                case "messageStart":
                  currentStreamingMessage = {
                    id: parsedData.id,
                    role: "assistant",
                    content: "",
                    created_at: parsedData.created_at,
                    timestamp: new Date(parsedData.created_at),
                    model_used: parsedData.model_used,
                  };
                  // Add streaming message directly to messages array to avoid double animation
                  setMessages((prev) => [...prev, currentStreamingMessage!]);
                  break;

                case "chunk":
                  if (currentStreamingMessage) {
                    // Capture the streaming message to prevent race conditions
                    const streamingMessageRef = currentStreamingMessage;
                    const updatedMessage: Message = {
                      ...streamingMessageRef,
                      content: streamingMessageRef.content + parsedData.text,
                    };
                    currentStreamingMessage = updatedMessage;

                    // Update the message in place in the messages array
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === streamingMessageRef.id ? updatedMessage : msg
                      )
                    );
                  }
                  break;

                case "messageComplete":
                  // Just update the final content and mark as complete
                  if (currentStreamingMessage) {
                    // Capture the streaming message to prevent race conditions
                    const streamingMessageRef = currentStreamingMessage;
                    // Use the captured chat ID for title generation
                    const finalMessage: Message = {
                      ...streamingMessageRef,
                      content: parsedData.content,
                      isNew: true,
                    };

                    // Update the message in place - no add/remove, no animation
                    setMessages((prev) => {
                      const updatedMessages = prev.map((msg) =>
                        msg.id === streamingMessageRef.id ? finalMessage : msg
                      );

                      // Generate title for new chats after first assistant response
                      const assistantMessages = updatedMessages.filter(
                        (m) => m.role === "assistant"
                      );
                      const userMessages = updatedMessages.filter(
                        (m) => m.role === "user"
                      );

                      // Only generate title if this is the first assistant message and we have user content
                      if (
                        assistantMessages.length === 1 &&
                        userMessages.length >= 1
                      ) {
                        const userPrompt =
                          userMessages[userMessages.length - 1]?.content;
                        const assistantResponse = parsedData.content;

                        if (
                          userPrompt &&
                          assistantResponse &&
                          chatIdForTitleGeneration !== "new"
                        ) {
                          // Generate title asynchronously (don't await to avoid blocking UI)
                          generateTitleMutation
                            .mutateAsync({
                              chatId: chatIdForTitleGeneration,
                              userPrompt,
                              assistantResponse,
                            })
                            .then((result) => {
                              console.log("Title generated:", result.newTitle);
                              setChatTitle(result.newTitle);

                              // Also trigger sidebar update
                              window.dispatchEvent(
                                new CustomEvent("chat-history-update", {
                                  detail: {
                                    id: chatIdForTitleGeneration,
                                    title: result.newTitle,
                                  },
                                })
                              );
                            })
                            .catch((err) => {
                              console.error("Failed to generate title:", err);
                            });
                        }
                      }

                      return updatedMessages;
                    });
                    currentStreamingMessage = null;
                  }
                  break;

                case "error":
                  throw new Error(
                    parsedData.message || "Streaming error occurred"
                  );

                case "done":
                  // Streaming completed successfully
                  break;
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      }
    } catch (err) {
      console.error("Streaming error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to stream response"
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return {
    messages,
    chatTitle,
    input,
    selectedModel,
    chatSettings,
    favoriteModel,
    isLoading,
    isStreaming,
    initialFetchLoading,
    isAwaitingFirstToken: isStreaming, // Updated for streaming flow
    error,
    setChatTitle,
    handleInputChange,
    activeFormSubmitHandler: handleFormSubmit,
    setSelectedModel,
    setChatSettings,
    setFavoriteModel,
    handleExampleQuestionClick,
    isNewChatFlow: false, // No longer used since we have smooth navigation
    uiReadyForNewChat: true, // Always show UI now
    userAvatar: user?.imageUrl,
    pendingChatId, // Expose this for any UI needs
    hasMore,
    loadMore,
    isLoadingMore,
  };
};

// Add this new hook for search status
export const useSearchStatus = () => {
  const { data, isLoading } = api.search.getStatus.useQuery();

  return { searchEnabled: !data?.is_disabled, loading: isLoading };
};
