import React from "react";
import { BotIcon } from "lucide-react";

const TypingIndicator: React.FC = () => {
  return (
    <div className="group flex items-start gap-3 justify-start">
      {/* Assistant Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-bg-input flex-shrink-0">
        <BotIcon size={16} className="text-text-secondary" />
      </div>

      {/* Message Bubble container */}
      <div className="flex flex-col max-w-[75%] items-start">
        <div
          className="p-3 rounded-lg bg-bg-input text-text-primary shadow-sm flex items-center space-x-1.5"
          aria-label="Assistant is typing"
        >
          <span className="sr-only">Assistant is typing</span>
          <div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse delay-0"></div>
          <div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse delay-200"></div>
          <div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse delay-400"></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
