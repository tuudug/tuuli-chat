import React, { ChangeEvent, KeyboardEvent, useState, useRef } from "react";
import TextareaAutosize from "react-textarea-autosize";
import {
  ArrowUpIcon,
  PaperclipIcon, // Import PaperclipIcon
  XIcon, // Import XIcon for clearing selected file
} from "lucide-react";
import { GeminiModelId, MODEL_DETAILS } from "@/lib/types"; // Use new model types/constants
import ModelSelector from "./ModelSelector"; // Import the new ModelSelector
import SparksCostIndicator from "./SparksCostIndicator";

interface ChatInputAreaProps {
  input: string;
  handleInputChange: (
    e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>
  ) => void;
  handleFormSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    attachment?: File | null
  ) => void; // Modified to accept optional attachment
  selectedModel: GeminiModelId; // Use GeminiModelId
  setSelectedModel: (model: GeminiModelId) => void; // Use GeminiModelId
  isWaitingForResponse: boolean;
  messages?: Array<{ content: string }>; // Add messages for sparks calculation
  userSparks?: number; // Add user sparks balance
  favoriteModel: GeminiModelId | null;
  onSetFavoriteModel: (modelId: GeminiModelId) => void;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  input,
  handleInputChange,
  handleFormSubmit,
  selectedModel,
  setSelectedModel,
  isWaitingForResponse,
  messages = [],
  userSparks = 0,
  favoriteModel,
  onSetFavoriteModel,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current model details to check if it supports files
  const currentModel = MODEL_DETAILS.find(
    (model) => model.id === selectedModel
  );
  const supportsFiles = currentModel?.supportsFiles ?? false;

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // Submit on Enter, even if a file is selected.
      // The form's onSubmit will handle the attachment.
      e.preventDefault();
      const form = e.currentTarget.closest("form");
      if (form) {
        // Pass selectedFile to the submit handler
        const submitEvent = new Event("submit", {
          bubbles: true,
          cancelable: true,
        });
        form.dispatchEvent(submitEvent);
      }
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    if (supportsFiles) {
      fileInputRef.current?.click();
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleFormSubmit(e, selectedFile);
    // Clear input and file after submission is handled by the parent
    // setInput(""); // This should be handled by parent if input is controlled there
    if (!isWaitingForResponse) {
      // Only clear if not waiting (parent will manage input clearing)
      clearSelectedFile();
    }
  };

  // Extract message content for sparks calculation
  const messageContents = messages.map((msg) => msg.content);

  return (
    <div className="sm:px-4 md:px-48 lg:px-64 pb-3 pt-1 sticky bottom-0 z-10 bg-transparent w-full sm:mb-4">
      {" "}
      {/* Padding starts from sm breakpoint, sm:mb-4 for larger screens, mobile margin removed */}
      <form
        onSubmit={onFormSubmit} // Use the new submit handler
        className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus-within:border-gray-600 transition-all duration-150 flex flex-col" // Changed flex direction
      >
        {/* Model Selector - Moved Above */}
        <div className="mb-2 flex justify-start">
          {" "}
          {/* Added container and margin */}
          <ModelSelector
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            disabled={isWaitingForResponse}
            favoriteModel={favoriteModel}
            onSetFavoriteModel={onSetFavoriteModel}
          />
        </div>
        {/* Input Row */}
        <div className="flex items-end gap-3">
          {/* File Input Button */}
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={isWaitingForResponse || !supportsFiles}
            className={`flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded focus:outline-none focus:ring-1 focus:ring-gray-600 disabled:cursor-not-allowed transition-colors ${
              supportsFiles
                ? "text-gray-400 hover:text-gray-200 disabled:opacity-50"
                : "text-gray-600 cursor-not-allowed"
            }`}
            aria-label="Attach file"
            title={
              supportsFiles
                ? "Attach file"
                : "File attachments not supported by this model"
            }
          >
            <PaperclipIcon size={16} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            // Consider adding 'accept' attribute e.g., accept="image/*,.pdf,.doc,.docx"
            disabled={isWaitingForResponse || !supportsFiles}
          />
          {/* Text Input */}
          <TextareaAutosize
            value={input}
            onChange={handleInputChange}
            placeholder={
              selectedFile
                ? "Describe the attachment or ask a question..."
                : "Type your message here..."
            }
            className="flex-1 bg-transparent resize-none focus:outline-none text-white placeholder:text-gray-400 text-sm py-2" // Added py-2 for vertical padding
            minRows={1} // Start with 1 row
            maxRows={6} // Grow up to 6 rows
            rows={1} // Keep initial rows=1
            disabled={isWaitingForResponse}
            onKeyDown={handleKeyDown}
          />
          {/* Sparks Cost Indicator - Inline before send button */}
          <div className="relative">
            <SparksCostIndicator
              messages={messageContents}
              currentMessage={input}
              selectedModel={selectedModel}
              userSparks={userSparks}
            />
          </div>
          {/* Send Button */}
          <button
            type="submit"
            disabled={isWaitingForResponse || (!input.trim() && !selectedFile)} // Enable if input OR file is present
            className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <ArrowUpIcon size={16} />
          </button>
        </div>
        {/* Selected File Preview */}
        {selectedFile && (
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400 bg-gray-800/50 border border-gray-700/50 p-2 rounded">
            <span className="truncate">Selected: {selectedFile.name}</span>
            <button
              type="button"
              onClick={clearSelectedFile}
              className="ml-2 text-gray-400 hover:text-gray-200"
              aria-label="Clear selected file"
            >
              <XIcon size={14} />
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatInputArea;
