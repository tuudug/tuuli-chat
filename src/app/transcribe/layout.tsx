import React from "react";
import ChatAppLayout from "../chat/layout";

interface TranscribeLayoutProps {
  children: React.ReactNode;
}

export default function TranscribeLayout({ children }: TranscribeLayoutProps) {
  return <ChatAppLayout>{children}</ChatAppLayout>;
}
