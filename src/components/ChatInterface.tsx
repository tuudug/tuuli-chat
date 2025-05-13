"use client";

import React, { useState, useEffect, useCallback, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "ai/react";
import { Message as AIMessage, type Attachment } from "ai";
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

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

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

      return { initialMessages: fetchedMessages, fetchedModel };
    } catch (error) {
      setInitialMessagesError(
        `Error loading chat data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setChatTitle("Error Loading Chat");
      return {
        initialMessages: [],
        fetchedModel: DEFAULT_MODEL_ID, // Use new default
      };
    } finally {
      setInitialFetchLoading(false);
      setInitialMessagesFetched(true);
    }
  }, [chatId, supabase]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    error: _chatError, // UseChat error isn't displayed directly anymore
    setMessages,
    // append, // No longer using append directly for attachments
    data,
  } = useChat({
    api: "/api/chat",
    id: chatId !== "new" ? chatId : undefined,
    initialMessages: [],
    // body: { // modelId will be sent in handleSubmit's data option
    //   modelId: selectedModel,
    // },
    onResponse: (response) => {
      if (!response.ok) {
        console.error("Streaming API response error:", response.statusText);
      }
    },
    onFinish: (message) => {
      // Use double type assertion to bridge the incompatible types
      setMessages((currentMessages) => {
        const typedMessages = currentMessages as unknown as (AIMessage & {
          model_used?: string;
          created_at?: string;
        })[];
        return typedMessages.map((msg) => {
          // If this is the message that just finished streaming
          if (msg.id === message.id && msg.role === "assistant") {
            return {
              ...msg,
              model_used: selectedModel,
              created_at:
                msg.createdAt?.toISOString() || new Date().toISOString(),
            };
          }
          return {
            ...msg,
            created_at:
              msg.createdAt?.toISOString() || new Date().toISOString(),
          };
        }) as unknown as AIMessage[];
      });
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
      fetchInitialData().then(({ initialMessages, fetchedModel }) => {
        // Use double casting to avoid type errors
        setMessages(initialMessages as unknown as AIMessage[]);
        setSelectedModel(fetchedModel);
      });
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

  const handleFormSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    attachmentFile?: File | null // Renamed to avoid confusion with the 'attachment' key in dataForBackend
  ) => {
    e.preventDefault();
    setResponseError(null);
    setIsWaitingForResponse(true);

    const currentInputVal = input;
    if (!currentInputVal.trim() && !attachmentFile) {
      setIsWaitingForResponse(false);
      return;
    }

    let attachmentsForSdk: Attachment[] | undefined = undefined;
    let localAttachmentPreviewData:
      | { type?: string; content?: string; name?: string }
      | undefined = undefined;
    let attachmentMetadataForBackend:
      | {
          attachment_url: string;
          attachment_name: string;
          attachment_type: string;
        }
      | undefined = undefined;

    if (attachmentFile) {
      // For local preview, always generate base64
      try {
        const base64String = await fileToBase64(attachmentFile);
        localAttachmentPreviewData = {
          type: attachmentFile.type,
          content: base64String,
          name: attachmentFile.name,
        };

        // Now, upload to our backend to get a public URL for the SDK and DB
        const uploadResponse = await fetch("/api/upload-attachment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileContent: base64String, // Send the base64 string
            fileName: attachmentFile.name,
            fileType: attachmentFile.type,
            chatId: chatId,
          }),
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "File upload failed");
        }

        const uploadedAttachment = await uploadResponse.json();

        if (
          attachmentFile.type.startsWith("image/") ||
          attachmentFile.type.startsWith("text/")
        ) {
          attachmentsForSdk = [
            {
              name: uploadedAttachment.name,
              contentType: uploadedAttachment.type,
              url: uploadedAttachment.publicUrl,
            },
          ];
        }
        attachmentMetadataForBackend = {
          attachment_url: uploadedAttachment.publicUrl,
          attachment_name: uploadedAttachment.name,
          attachment_type: uploadedAttachment.type,
        };
      } catch (error) {
        console.error("Error processing or uploading attachment:", error);
        setResponseError(
          error instanceof Error
            ? error.message
            : "Failed to process attachment."
        );
        setIsWaitingForResponse(false);
        return;
      }
    }

    const dataForBackend = {
      modelId: selectedModel,
      ...(chatId !== "new" && { chatId: chatId }),
    } as {
      modelId: GeminiModelId;
      chatId?: string;
      attachment_url?: string;
      attachment_name?: string;
      attachment_type?: string;
      attachment?: {
        // Renamed from local_attachment_preview to match ChatMessage.tsx
        type?: string;
        content?: string;
        name?: string;
      };
    };

    if (attachmentMetadataForBackend) {
      dataForBackend.attachment_url =
        attachmentMetadataForBackend.attachment_url;
      dataForBackend.attachment_name =
        attachmentMetadataForBackend.attachment_name;
      dataForBackend.attachment_type =
        attachmentMetadataForBackend.attachment_type;
    }

    if (localAttachmentPreviewData) {
      dataForBackend.attachment = localAttachmentPreviewData; // Changed key here
    }

    handleSubmit(e, {
      experimental_attachments: attachmentsForSdk,
      data: dataForBackend,
    });
  };

  const handleExampleQuestionClick = (question: string) => {
    handleInputChange({
      target: { value: question },
    } as ChangeEvent<HTMLTextAreaElement>);
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader title={chatTitle} />

      <MessageDisplayArea
        messages={messages as unknown as Message[]}
        chatId={chatId}
        initialFetchLoading={initialFetchLoading}
        initialMessagesError={initialMessagesError}
        isWaitingForResponse={isWaitingForResponse}
        responseError={responseError}
        onExampleQuestionClick={handleExampleQuestionClick}
        selectedModel={selectedModel}
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
