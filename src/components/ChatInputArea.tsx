import React, { ChangeEvent, KeyboardEvent } from "react";
import TextareaAutosize from "react-textarea-autosize";
import * as Select from "@radix-ui/react-select";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  ArrowUpIcon,
  StarIcon, // Import StarIcon
} from "lucide-react";
import { GeminiModelId, MODEL_DETAILS } from "@/lib/types"; // Use new model types/constants

interface ChatInputAreaProps {
  input: string;
  handleInputChange: (
    e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>
  ) => void;
  handleFormSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedModel: GeminiModelId; // Use GeminiModelId
  setSelectedModel: (model: GeminiModelId) => void; // Use GeminiModelId
  isWaitingForResponse: boolean;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  input,
  handleInputChange,
  handleFormSubmit,
  selectedModel,
  setSelectedModel,
  isWaitingForResponse,
}) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.closest("form");
      if (form) {
        form.requestSubmit();
      }
    }
  };

  return (
    <div className="sm:px-4 md:px-16 pb-3 pt-1">
      {" "}
      {/* Padding starts from sm breakpoint */}
      <form
        onSubmit={handleFormSubmit}
        className="p-3 bg-bg-input rounded-xl border border-transparent focus-within:border-btn-primary transition-colors flex flex-col" // Changed flex direction
      >
        {/* Model Selector - Moved Above */}
        <div className="mb-2 flex justify-start">
          {" "}
          {/* Added container and margin */}
          <Select.Root
            value={selectedModel}
            onValueChange={(value: GeminiModelId) => setSelectedModel(value)} // Use GeminiModelId
            disabled={isWaitingForResponse}
          >
            <Select.Trigger
              className="inline-flex items-center justify-center rounded text-xs h-[30px] px-2 gap-1 bg-transparent text-text-secondary hover:text-text-primary focus:outline-none focus:ring-1 focus:ring-btn-primary disabled:opacity-50 disabled:cursor-not-allowed" // Removed flex-shrink-0
              aria-label="Select AI Model"
            >
              <Select.Value />
              <Select.Icon>
                <ChevronDownIcon size={14} />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="overflow-hidden bg-bg-sidebar rounded-md shadow-lg border border-border-primary animate-in fade-in-80 slide-in-from-top-5 z-50">
                <Select.ScrollUpButton className="flex items-center justify-center h-[25px] bg-bg-sidebar text-text-secondary cursor-default">
                  <ChevronUpIcon size={16} />
                </Select.ScrollUpButton>
                <Select.Viewport className="p-1">
                  <Select.Group>
                    {MODEL_DETAILS.map((model) => {
                      const isPro = model.id === "gemini-2.5-pro-preview-05-06";
                      return (
                        <Select.Item
                          key={model.id}
                          value={model.id} // Use model ID as value
                          className="text-sm leading-none text-text-primary rounded flex items-center justify-between h-[28px] pr-4 pl-8 relative select-none data-[disabled]:text-text-secondary/50 data-[disabled]:pointer-events-none data-[highlighted]:outline-none data-[highlighted]:bg-btn-primary data-[highlighted]:text-white cursor-pointer"
                        >
                          <Select.ItemText>
                            <span
                              className={
                                isPro
                                  ? "font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600" // Gradient for Pro
                                  : ""
                              }
                            >
                              {model.name} {/* Display friendly name */}
                            </span>
                          </Select.ItemText>
                          <div className="ml-4 flex items-center gap-0.5 text-yellow-400">
                            {/* Display stars */}
                            {Array.from({ length: model.stars }).map((_, i) => (
                              <StarIcon key={i} size={12} fill="currentColor" />
                            ))}
                            {Array.from({ length: 4 - model.stars }).map(
                              (_, i) => (
                                <StarIcon
                                  key={`empty-${i}`}
                                  size={12}
                                  className="text-gray-500"
                                /> // Optional: empty stars
                              )
                            )}
                          </div>
                          <Select.ItemIndicator className="absolute left-0 w-8 inline-flex items-center justify-center">
                            <CheckIcon size={16} />
                          </Select.ItemIndicator>
                        </Select.Item>
                      );
                    })}
                  </Select.Group>
                </Select.Viewport>
                <Select.ScrollDownButton className="flex items-center justify-center h-[25px] bg-bg-sidebar text-text-secondary cursor-default">
                  <ChevronDownIcon size={16} />
                </Select.ScrollDownButton>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        {/* Input Row */}
        <div className="flex items-end gap-3">
          {" "}
          {/* New container for input and button */}
          {/* Text Input */}
          <TextareaAutosize
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message here..."
            className="flex-1 bg-transparent resize-none focus:outline-none text-text-primary placeholder:text-text-secondary text-sm py-2" // Added py-2 for vertical padding
            minRows={1} // Start with 1 row
            maxRows={6} // Grow up to 6 rows
            rows={1} // Keep initial rows=1
            disabled={isWaitingForResponse}
            onKeyDown={handleKeyDown}
          />
          {/* Send Button */}
          <button
            type="submit"
            disabled={isWaitingForResponse || !input.trim()}
            className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded bg-btn-primary text-white hover:bg-btn-primary-hover focus:outline-none focus:ring-1 focus:ring-btn-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <ArrowUpIcon size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInputArea;
