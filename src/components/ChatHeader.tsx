import React from "react";

interface ChatHeaderProps {
  title: string | null;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ title }) => {
  return (
    <div className="px-4 md:px-6 lg:px-8 py-5 border-b border-border-primary">
      <h2 className="text-lg font-medium text-text-primary truncate text-center">
        {title || "..."}
      </h2>
    </div>
  );
};

export default ChatHeader;
