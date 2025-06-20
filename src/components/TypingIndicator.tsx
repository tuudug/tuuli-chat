import React from "react";
import { BotIcon } from "lucide-react";

const TypingIndicator: React.FC = () => {
  return (
    <div className="group flex items-start gap-3 justify-start">
      {/* Assistant Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-800/50 border border-gray-700/50 flex-shrink-0">
        <BotIcon size={16} className="text-gray-400" />
      </div>

      {/* Message Bubble container */}
      <div className="flex flex-col max-w-[75%] items-start">
        <div
          className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white shadow-sm flex items-center space-x-1.5"
          aria-label="Assistant is typing"
        >
          <span className="sr-only">Assistant is typing</span>
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
            style={{ animationDelay: "200ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
            style={{ animationDelay: "400ms" }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
