import React from "react";
import ChatInterface from "@/components/ChatInterface";

interface ChatPageProps {
  params: { chatId: string }; // Expect resolved params
}

// Revert to async as required by Next.js for accessing params
export default async function ChatPage({ params }: ChatPageProps) {
  // Params are automatically awaited in async Server Components
  const { chatId } = params;

  return <ChatInterface chatId={chatId} />;
}
