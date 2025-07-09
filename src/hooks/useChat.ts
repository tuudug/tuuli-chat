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
import { ChatSettings, DEFAULT_CHAT_SETTINGS } from "@/types/settings";
import { useSparks } from "@/contexts/SparksContext";
import { api } from "@/lib/trpc/client";
import { useLocalStorage } from "./useLocalStorage";

type AttachmentApiData = {
  attachment_url: string;
  attachment_content: string;
  attachment_name: string;
  attachment_type: string;
};

export const useChat = (chatId: string) => {
  const createChatMutation = api.chat.create.useMutation();
  const sendMessageMutation = api.chat.sendMessage.useMutation();
  const generateTitleMutation = api.chat.generateTitle.useMutation();
  const uploadAttachmentMutation = api.attachment.upload.useMutation();
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
  const [chatSettings, setChatSettings] = useState<ChatSettings>(
    DEFAULT_CHAT_SETTINGS
  );
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

  const {
    data: chatData,
    isLoading: isChatDataLoading,
    error: chatDataError,
  } = api.chat.history.useQuery(
    { chatId },
    {
      enabled: !!chatId && chatId !== "new" && !isNewChatFlowFromParams,
    }
  );

  useEffect(() => {
    if (chatData) {
      setChatTitle(chatData.title);
      setMessages(chatData.messages as Message[]);
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
      if (favoriteModel) {
        setSelectedModel(favoriteModel);
      }
    }
  }, [chatId, favoriteModel]);

  // Effect for handling the newChat=true flow
  useEffect(() => {
    const initializeNewChat = async () => {
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
              timestamp: new Date(),
              attachment_name: storedData.attachmentInfo?.attachment_name,
              attachment_type: storedData.attachmentInfo?.attachment_type,
              attachment_preview: storedData.attachmentInfo?.attachment_content,
            };

            setMessages([userMessage]);
            setIsLoading(true);

            const data = await sendMessageMutation.mutateAsync({
              messages: [userMessage],
              data: {
                modelId: storedData.model,
                chatId: chatId,
                chatSettings: chatSettings,
                ...storedData.attachmentInfo,
                useSearch: false,
              },
            });

            const assistantMessage = data.message as Message;
            setMessages((prev) => [
              ...prev,
              { ...assistantMessage, isNew: true },
            ]);
            if (typeof data.newBalance === "number") {
              setSparksBalance(data.newBalance);
            }

            if (userMessage.content) {
              await generateTitleMutation.mutateAsync({
                chatId,
                userPrompt: userMessage.content,
                assistantResponse: assistantMessage.content,
              });
            }
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "An unknown error occurred during chat initialization."
            );
          } finally {
            setIsLoading(false);
            sessionStorage.removeItem(storageKey);
            router.replace(`/chat/${chatId}`);
          }
        }
      }
    };

    initializeNewChat();
  }, [
    chatId,
    isNewChatFlowFromParams,
    setSparksBalance,
    chatSettings,
    sendMessageMutation,
    generateTitleMutation,
    router,
  ]);

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

        let attachmentInfo: AttachmentApiData | undefined;
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
          attachmentInfo = {
            attachment_url: uploadResult.publicUrl,
            attachment_content: fileContent,
            attachment_name: uploadResult.name,
            attachment_type: uploadResult.type,
          };
        }

        const storageKey = `chat_init_${newClientChatId}`;
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            message: currentInput,
            model: selectedModel,
            attachmentInfo,
          })
        );

        router.push(`/chat/${newClientChatId}?newChat=true`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create chat.");
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

    sendMessageMutation.mutate(
      {
        messages: newMessages,
        data: {
          modelId: selectedModel,
          chatId: effectiveChatId,
          chatSettings: chatSettings,
          ...attachmentDataForApi,
          useSearch,
        },
      },
      {
        onSuccess: (data) => {
          const assistantMessage = data.message as Message;
          setMessages((prev) => [
            ...prev,
            { ...assistantMessage, isNew: true },
          ]);
          if (typeof data.newBalance === "number") {
            setSparksBalance(data.newBalance);
          }
        },
        onError: (err) => {
          setError(err.message);
        },
        onSettled: () => {
          setIsLoading(false);
        },
      }
    );
  };

  const handleExampleQuestionClick = (question: string) => {
    setInput(question);
  };

  return {
    messages,
    chatTitle,
    input,
    selectedModel,
    chatSettings,
    favoriteModel,
    isLoading,
    initialFetchLoading,
    isAwaitingFirstToken: isLoading, // Simplified for sync flow
    error,
    setChatTitle,
    handleInputChange,
    activeFormSubmitHandler: handleFormSubmit,
    setSelectedModel,
    setChatSettings,
    setFavoriteModel,
    handleExampleQuestionClick,
    isNewChatFlow: isNewChatFlowFromParams,
    uiReadyForNewChat: true, // Always show UI now
    sparksBalance,
    userAvatar: user?.user_metadata.avatar_url,
    pendingChatId, // Expose this for any UI needs
  };
};

// Add this new hook for search status
export const useSearchStatus = () => {
  const { data, isLoading } = api.search.getStatus.useQuery();

  return { searchEnabled: !data?.is_disabled, loading: isLoading };
};
