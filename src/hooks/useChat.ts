"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import {
  Message,
  GeminiModelId,
  DEFAULT_MODEL_ID,
  MODEL_DETAILS,
} from "@/types";
import { useSparks } from "@/contexts/SparksContext";
import * as chatApi from "@/services/chatApi";
import { useLocalStorage } from "./useLocalStorage";

type AttachmentApiData = {
  attachment_url: string;
  attachment_content: string;
  attachment_name: string;
  attachment_type: string;
};

export const useChat = (chatId: string) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sparksBalance, setSparksBalance, user } = useSparks();
  const isNewChatFlowFromParams = searchParams.get("newChat") === "true";
  const processedNewChatIdRef = useRef<string | null>(null);

  // State Management
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] =
    useState<GeminiModelId>(DEFAULT_MODEL_ID);
  const [favoriteModel, setFavoriteModel] =
    useLocalStorage<GeminiModelId | null>("favoriteModel", null);

  // Loading and Error States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialFetchLoading, setInitialFetchLoading] = useState(false);

  // New state for handling new chat creation
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);

  // Track the effective chat ID (once we create a chat, use that instead of "new")
  const [effectiveChatId, setEffectiveChatId] = useState<string>(chatId);

  // Update effective chat ID when chatId prop changes
  useEffect(() => {
    setEffectiveChatId(chatId);
  }, [chatId]);

  // Effect for fetching initial data for existing chats
  useEffect(() => {
    if (chatId && chatId !== "new" && !isNewChatFlowFromParams) {
      setInitialFetchLoading(true);
      chatApi
        .fetchChatData(chatId)
        .then(({ title, messages: fetchedMessages }) => {
          setChatTitle(title);
          setMessages(fetchedMessages);
          const lastAssistantMessage = [...fetchedMessages]
            .reverse()
            .find((msg) => msg.role === "assistant" && msg.model_used);
          if (
            lastAssistantMessage?.model_used &&
            MODEL_DETAILS.some((d) => d.id === lastAssistantMessage.model_used)
          ) {
            setSelectedModel(lastAssistantMessage.model_used as GeminiModelId);
          }
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Failed to fetch chat data."
          );
          setChatTitle("Error Loading Chat");
        })
        .finally(() => {
          setInitialFetchLoading(false);
        });
    } else if (chatId === "new") {
      setMessages([]);
      setChatTitle("New Conversation");
      setInput("");
      setError(null);
      setPendingChatId(null);
      if (favoriteModel) {
        setSelectedModel(favoriteModel);
      }
    }
  }, [chatId, favoriteModel, isNewChatFlowFromParams]);

  // Effect for handling the newChat=true flow
  useEffect(() => {
    if (isNewChatFlowFromParams && chatId && chatId !== "new") {
      if (processedNewChatIdRef.current === chatId) return;

      const storageKey = `chat_init_${chatId}`;
      const storedDataString = sessionStorage.getItem(storageKey);

      if (storedDataString) {
        processedNewChatIdRef.current = chatId;
        try {
          const storedData = JSON.parse(storedDataString) as {
            message: string;
            model: GeminiModelId;
            attachmentInfo?: AttachmentApiData;
          };

          setChatTitle("New Conversation");
          setSelectedModel(storedData.model);

          const userMessage: Message = {
            id: uuidv4(),
            role: "user",
            content: storedData.message,
            created_at: new Date().toISOString(),
            attachment_name: storedData.attachmentInfo?.attachment_name,
            attachment_type: storedData.attachmentInfo?.attachment_type,
            attachment_preview: storedData.attachmentInfo?.attachment_content,
          };

          setMessages([userMessage]);
          setIsLoading(true);

          chatApi
            .sendChatMessage([userMessage], {
              modelId: storedData.model,
              chatId: chatId,
              ...storedData.attachmentInfo,
            })
            .then(({ message: assistantMessage, newBalance }) => {
              setMessages((prev) => [
                ...prev,
                { ...assistantMessage, isNew: true },
              ]);
              if (typeof newBalance === "number") {
                setSparksBalance(newBalance);
              }
              if (userMessage.content) {
                chatApi
                  .generateChatTitle(
                    chatId,
                    userMessage.content,
                    assistantMessage.content
                  )
                  .then((newTitle) => {
                    if (newTitle) setChatTitle(newTitle);
                  });
              }
            })
            .catch((err: Error) => {
              setError(err.message || "An unknown error occurred");
            })
            .finally(() => {
              setIsLoading(false);
              sessionStorage.removeItem(storageKey);
              window.history.replaceState(null, "", `/chat/${chatId}`);
            });
        } catch (_parseError) {
          setError("Failed to initialize new chat: corrupted session data.");
          sessionStorage.removeItem(storageKey);
        }
      }
    }
  }, [chatId, isNewChatFlowFromParams, router, setSparksBalance]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setInput(e.target.value);
  };

  const handleFormSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    attachmentFile?: File | null
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
      setPendingChatId(newClientChatId);

      // Create user message immediately and show it
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: currentInput,
        created_at: new Date().toISOString(),
      };

      try {
        // Create chat shell first
        await chatApi.createChatShell(newClientChatId, "New chat");

        // Handle attachment if present
        let attachmentInfo: AttachmentApiData | undefined = undefined;
        if (attachmentFile) {
          attachmentInfo = await chatApi.uploadAttachment(
            attachmentFile,
            newClientChatId
          );
          userMessage.attachment_name = attachmentInfo.attachment_name;
          userMessage.attachment_type = attachmentInfo.attachment_type;
          userMessage.attachment_preview = attachmentInfo.attachment_content;
        }

        // Show user message immediately
        setMessages([userMessage]);
        setInput("");

        // Send to API and get response
        const { message: assistantMessage, newBalance } =
          await chatApi.sendChatMessage([userMessage], {
            modelId: selectedModel,
            chatId: newClientChatId,
            ...attachmentInfo,
          });

        // Show assistant response
        setMessages((prev) => [...prev, { ...assistantMessage, isNew: true }]);

        if (typeof newBalance === "number") {
          setSparksBalance(newBalance);
        }

        // Generate title in background
        if (userMessage.content) {
          chatApi
            .generateChatTitle(
              newClientChatId,
              userMessage.content,
              assistantMessage.content
            )
            .then((newTitle) => {
              if (newTitle) setChatTitle(newTitle);
            });
        }

        // Update the URL without navigating (no page reload)
        window.history.replaceState(null, "", `/chat/${newClientChatId}`);

        // Update our internal effective chat ID so subsequent messages go to this chat
        setEffectiveChatId(newClientChatId);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to create new chat."
        );
        // Reset state on error
        setMessages([]);
        setPendingChatId(null);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Handle existing chat message sending
    let attachmentDataForApi: Partial<AttachmentApiData> = {};
    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: currentInput,
      created_at: new Date().toISOString(),
    };

    if (attachmentFile) {
      try {
        const attachmentData = await chatApi.uploadAttachment(
          attachmentFile,
          effectiveChatId
        );
        userMessage.attachment_name = attachmentData.attachment_name;
        userMessage.attachment_type = attachmentData.attachment_type;
        userMessage.attachment_preview = attachmentData.attachment_content;
        attachmentDataForApi = attachmentData;
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

    try {
      const { message: assistantMessage, newBalance } =
        await chatApi.sendChatMessage(newMessages, {
          modelId: selectedModel,
          chatId: effectiveChatId,
          ...attachmentDataForApi,
        });

      setMessages((prev) => [...prev, { ...assistantMessage, isNew: true }]);
      if (typeof newBalance === "number") {
        setSparksBalance(newBalance);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleQuestionClick = (question: string) => {
    setInput(question);
  };

  return {
    messages,
    chatTitle,
    input,
    selectedModel,
    favoriteModel,
    isLoading,
    initialFetchLoading,
    isAwaitingFirstToken: isLoading, // Simplified for sync flow
    error,
    setChatTitle,
    handleInputChange,
    activeFormSubmitHandler: handleFormSubmit,
    setSelectedModel,
    setFavoriteModel,
    handleExampleQuestionClick,
    isNewChatFlow: isNewChatFlowFromParams,
    uiReadyForNewChat: true, // Always show UI now
    sparksBalance,
    userAvatar: user?.user_metadata.avatar_url,
    pendingChatId, // Expose this for any UI needs
  };
};
