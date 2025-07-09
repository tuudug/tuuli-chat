import { vanillaTrpcClient } from "@/lib/trpc/client";
import { GeminiModelId, Message } from "@/types";
import { ChatSettings } from "@/types/settings";

// Helper function to convert a file to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Fetches the initial data for an existing chat
export const fetchChatData = async (chatId: string) => {
  return await vanillaTrpcClient.chat.history.query({ chatId });
};

// Creates a new chat "shell" on the backend
export const createChatShell = async (clientChatId: string, title: string) => {
  return await vanillaTrpcClient.chat.create.mutate({ clientChatId, title });
};

// Uploads an attachment and returns its public URL and metadata
export const uploadAttachment = async (file: File, chatId: string) => {
  const base64String = await fileToBase64(file);
  const uploadedAttachment = await vanillaTrpcClient.attachment.upload.mutate({
    fileContent: base64String,
    fileName: file.name,
    fileType: file.type,
    chatId: chatId,
  });

  return {
    attachment_url: uploadedAttachment.publicUrl,
    attachment_name: uploadedAttachment.name,
    attachment_type: uploadedAttachment.type,
    attachment_content: base64String,
  };
};

// Sends messages to the core chat API and returns a single message object
export const sendChatMessage = async (
  messages: Message[],
  data: {
    modelId: GeminiModelId;
    chatId: string;
    chatSettings: ChatSettings;
    attachment_url?: string;
    attachment_content?: string;
    attachment_name?: string;
    attachment_type?: string;
  },
  useSearch?: boolean
) => {
  return await vanillaTrpcClient.chat.sendMessage.mutate({
    messages,
    data: { ...data, useSearch },
  });
};

// Generates a title for a chat and returns the new title
export const generateChatTitle = async (
  chatId: string,
  userPrompt: string,
  assistantResponse: string
) => {
  try {
    const result = await vanillaTrpcClient.chat.generateTitle.mutate({
      chatId,
      userPrompt,
      assistantResponse,
    });
    return result.newTitle;
  } catch (error) {
    console.error("Failed to generate chat title:", error);
    return null;
  }
};
