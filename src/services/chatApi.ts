import { createClient } from "@/lib/supabase/client";
import { GeminiModelId, Message } from "@/types";

const supabase = createClient();

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
  const { data: chatData, error: titleError } = await supabase
    .from("chats")
    .select("title")
    .eq("id", chatId)
    .single();

  if (titleError) {
    console.error("Error fetching chat title:", titleError);
    // Don't throw, allow partial data return
  }

  const { data: messageData, error: messageError } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (messageError) {
    throw new Error(`Error loading messages: ${messageError.message}`);
  }

  return {
    title: chatData?.title || "Chat",
    messages: (messageData as Message[]) || [],
  };
};

// Creates a new chat "shell" on the backend
export const createChatShell = async (clientChatId: string, title: string) => {
  const response = await fetch("/api/chat/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientChatId, title }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create chat shell.");
  }
  return await response.json();
};

// Uploads an attachment and returns its public URL and metadata
export const uploadAttachment = async (file: File, chatId: string) => {
  const base64String = await fileToBase64(file);
  const response = await fetch("/api/upload-attachment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileContent: base64String,
      fileName: file.name,
      fileType: file.type,
      chatId: chatId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "File upload failed.");
  }
  const uploadedAttachment = await response.json();
  return {
    url: uploadedAttachment.publicUrl as string,
    name: uploadedAttachment.name as string,
    type: uploadedAttachment.type as string,
    base64Content: base64String,
  };
};

// Sends messages to the core chat API and returns a streaming response
export const streamChatResponse = (
  messages: Message[],
  data: {
    modelId: GeminiModelId;
    chatId: string;
    attachment_url?: string;
    attachment_content?: string;
    attachment_name?: string;
    attachment_type?: string;
  }
) => {
  return fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, data }),
  });
};

// Generates a title for a chat and returns the new title
export const generateChatTitle = async (
  chatId: string,
  userPrompt: string,
  assistantResponse: string
) => {
  const response = await fetch("/api/chat/generate-title", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, userPrompt, assistantResponse }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    // Don't throw an error, just log it, as title generation is not critical
    console.error("Failed to generate chat title:", errorData.error);
    return null;
  }
  const data = await response.json();
  return data.newTitle as string;
};
