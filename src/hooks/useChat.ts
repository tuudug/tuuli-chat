"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const { sparksBalance, setSparksBalance } = useSparks();
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
  const [isAwaitingFirstToken, setIsAwaitingFirstToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialFetchLoading, setInitialFetchLoading] = useState(false);
  const [uiReadyForNewChatSetup, setUiReadyForNewChatSetup] = useState(false);

  const handleStreamingResponse = useCallback(
    async (response: Response, currentModel: GeminiModelId) => {
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = "";
      const assistantMessageId = uuidv4();
      let isFirstChunk = true;

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
          model_used: currentModel,
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (isFirstChunk) {
          setIsAwaitingFirstToken(false);
          isFirstChunk = false;
        }

        const rawChunk = decoder.decode(value);
        const metadataSentinel = "\n\n[METADATA]";
        if (rawChunk.includes(metadataSentinel)) {
          const [contentPart, metadataPart] = rawChunk.split(metadataSentinel);
          assistantResponse += contentPart;
          try {
            const metadata = JSON.parse(metadataPart);
            if (metadata.type === "metadata") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        id: metadata.data.messageId,
                        sparks_cost: metadata.data.sparksCost,
                        content: assistantResponse,
                      }
                    : msg
                )
              );
              if (typeof metadata.data.newBalance === "number") {
                setSparksBalance(metadata.data.newBalance);
              }
            }
          } catch (e) {
            console.error("Failed to parse metadata JSON:", e);
          }
        } else {
          assistantResponse += rawChunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: assistantResponse }
                : msg
            )
          );
        }
      }
    },
    [setSparksBalance]
  );

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

          const isValidModel = MODEL_DETAILS.some(
            (detail) => detail.id === lastAssistantMessage?.model_used
          );

          if (lastAssistantMessage?.model_used && isValidModel) {
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
      if (favoriteModel) {
        setSelectedModel(favoriteModel);
      } else {
        setSelectedModel("gemini-2.5-flash-lite-preview-06-17");
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
            attachmentInfo?: {
              url: string;
              name: string;
              type: string;
              base64Content?: string;
            };
          };

          setChatTitle("New Conversation");
          setSelectedModel(storedData.model);

          const userMessage: Message = {
            id: uuidv4(),
            role: "user",
            content: storedData.message,
            created_at: new Date().toISOString(),
            attachment_name: storedData.attachmentInfo?.name,
            attachment_type: storedData.attachmentInfo?.type,
            attachment_preview: storedData.attachmentInfo?.base64Content,
          };

          setMessages([userMessage]);
          setUiReadyForNewChatSetup(true);
          setIsAwaitingFirstToken(true);
          setIsLoading(true);

          chatApi
            .streamChatResponse([userMessage], {
              modelId: storedData.model,
              chatId: chatId,
              attachment_url: storedData.attachmentInfo?.url,
              attachment_content: storedData.attachmentInfo?.base64Content,
              attachment_name: storedData.attachmentInfo?.name,
              attachment_type: storedData.attachmentInfo?.type,
            })
            .then((response) =>
              handleStreamingResponse(response, storedData.model)
            )
            .catch((err) => {
              setError(
                err instanceof Error ? err.message : "An unknown error occurred"
              );
            })
            .finally(() => {
              setIsLoading(false);
              setIsAwaitingFirstToken(false);
              sessionStorage.removeItem(storageKey);
              window.history.replaceState(null, "", `/chat/${chatId}`);
            });
        } catch (parseError) {
          setError("Failed to initialize new chat: corrupted session data.");
          sessionStorage.removeItem(storageKey);
          setUiReadyForNewChatSetup(true);
        }
      } else {
        setError(
          "Critical error: Could not retrieve initial chat data from session."
        );
        setUiReadyForNewChatSetup(true);
      }
    }
  }, [chatId, isNewChatFlowFromParams, router, handleStreamingResponse]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setInput(e.target.value);
  };

  const handleExistingChatSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    attachmentFile?: File | null
  ) => {
    e.preventDefault();
    if (isLoading || isAwaitingFirstToken) return;

    const currentInput = input;
    if (!currentInput.trim() && !attachmentFile) return;

    setError(null);
    setIsAwaitingFirstToken(true);
    setIsLoading(true);

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
          chatId
        );
        userMessage.attachment_name = attachmentData.name;
        userMessage.attachment_type = attachmentData.type;
        userMessage.attachment_preview = attachmentData.base64Content;
        attachmentDataForApi = {
          attachment_url: attachmentData.url,
          attachment_content: attachmentData.base64Content,
          attachment_name: attachmentData.name,
          attachment_type: attachmentData.type,
        };
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to process attachment."
        );
        setIsAwaitingFirstToken(false);
        setIsLoading(false);
        return;
      }
    }

    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");

    try {
      const response = await chatApi.streamChatResponse(newMessages, {
        modelId: selectedModel,
        chatId: chatId,
        ...attachmentDataForApi,
      });
      await handleStreamingResponse(response, selectedModel);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
      setIsAwaitingFirstToken(false);
    }
  };

  const handleNewChatSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    attachmentFile?: File | null
  ) => {
    e.preventDefault();
    if (isAwaitingFirstToken || isLoading) return;

    const currentInputVal = input;
    if (!currentInputVal.trim() && !attachmentFile) return;

    setIsAwaitingFirstToken(true);
    const newClientChatId = uuidv4();
    const preliminaryTitle =
      currentInputVal.substring(0, 50) || "New Conversation";

    try {
      await chatApi.createChatShell(newClientChatId, preliminaryTitle);

      let attachmentInfo:
        | Awaited<ReturnType<typeof chatApi.uploadAttachment>>
        | undefined = undefined;

      if (attachmentFile) {
        attachmentInfo = await chatApi.uploadAttachment(
          attachmentFile,
          newClientChatId
        );
      }

      const dataToStore = {
        message: currentInputVal,
        model: selectedModel,
        attachmentInfo: attachmentInfo,
      };

      sessionStorage.setItem(
        `chat_init_${newClientChatId}`,
        JSON.stringify(dataToStore)
      );

      setInput("");
      router.push(`/chat/${newClientChatId}?newChat=true`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to initiate new chat."
      );
      setIsAwaitingFirstToken(false);
    }
  };

  const activeFormSubmitHandler =
    chatId === "new" ? handleNewChatSubmit : handleExistingChatSubmit;

  const handleExampleQuestionClick = (question: string) => {
    setInput(question);
  };

  return {
    // State
    messages,
    chatTitle,
    input,
    selectedModel,
    favoriteModel,
    // Loading & Error
    isLoading: isLoading || isAwaitingFirstToken,
    initialFetchLoading,
    isAwaitingFirstToken,
    error,
    // Handlers
    setChatTitle,
    handleInputChange,
    activeFormSubmitHandler,
    setSelectedModel,
    setFavoriteModel,
    handleExampleQuestionClick,
    // New Chat Flow
    isNewChatFlow: isNewChatFlowFromParams,
    uiReadyForNewChat: uiReadyForNewChatSetup,
    // Sparks
    sparksBalance,
  };
};
