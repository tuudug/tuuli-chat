import React from "react";
import ChatInterface from "@/components/ChatInterface";

interface ChatPageProps {
  params: Promise<{ chatId: string }>; // Updated to match Next.js 15 requirement
}

// Added a comment to trigger file save and type regeneration
export default async function ChatPage({ params }: ChatPageProps) {
  // Params need to be awaited in Next.js 15
  const { chatId } = await params;

  return <ChatInterface chatId={chatId} />;
}
