import React, { ChangeEvent, KeyboardEvent, useState, useRef } from "react";
import TextareaAutosize from "react-textarea-autosize";
import {
  ArrowUpIcon,
  PaperclipIcon, // Import PaperclipIcon
  XIcon, // Import XIcon for clearing selected file
} from "lucide-react";
import {
  GeminiModelId,
  MODEL_DETAILS,
  ResponseLengthSetting,
  DEFAULT_RESPONSE_LENGTH_SETTING,
} from "@/lib/types"; // Use new model types/constants
import ModelSelector from "./ModelSelector"; // Import the new ModelSelector

interface ChatInputAreaProps {
  input: string;
  handleInputChange: (
    e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>
  ) => void;
  handleFormSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    attachment?: File | null,
    responseLength?: ResponseLengthSetting
  ) => void; // Modified to accept optional attachment and responseLength
  selectedModel: GeminiModelId; // Use GeminiModelId
  setSelectedModel: (model: GeminiModelId) => void; // Use GeminiModelId
  isWaitingForResponse: boolean;
  selectedResponseLength: ResponseLengthSetting;
  setSelectedResponseLength: (length: ResponseLengthSetting) => void;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  input,
  handleInputChange,
  handleFormSubmit,
  selectedModel,
  setSelectedModel,
  isWaitingForResponse,
  selectedResponseLength,
  setSelectedResponseLength,
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
    handleFormSubmit(e, selectedFile, selectedResponseLength); // Pass selectedResponseLength
    // Clear input and file after submission is handled by the parent
    // setInput(""); // This should be handled by parent if input is controlled there
    if (!isWaitingForResponse) {
      // Only clear if not waiting (parent will manage input clearing)
      clearSelectedFile();
    }
  };

  return (
    <div className="sm:px-4 md:px-48 lg:px-64 pb-3 pt-1 sticky bottom-0 z-10 bg-transparent w-full sm:mb-4">
      {" "}
      {/* Padding starts from sm breakpoint, sm:mb-4 for larger screens, mobile margin removed */}
      <form
        onSubmit={onFormSubmit} // Use the new submit handler
        className="p-3 bg-bg-input rounded-xl border border-transparent focus-within:border-btn-primary transition-colors flex flex-col" // Changed flex direction
      >
        {/* Response Length Selector */}
        <div className="mt-0 mb-2 flex items-center justify-start gap-2">
          <span className="text-xs text-text-secondary">Response Length:</span>
          <button
            type="button"
            onClick={() => setSelectedResponseLength("brief")}
            disabled={isWaitingForResponse}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              selectedResponseLength === "brief"
                ? "bg-btn-primary text-white"
                : "bg-bg-sidebar hover:bg-bg-sidebar-hover text-text-secondary"
            }`}
          >
            Brief
          </button>
          <button
            type="button"
            onClick={() => setSelectedResponseLength("detailed")}
            disabled={isWaitingForResponse}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              selectedResponseLength === "detailed"
                ? "bg-btn-primary text-white"
                : "bg-bg-sidebar hover:bg-bg-sidebar-hover text-text-secondary"
            }`}
          >
            Detailed
          </button>
          <span className="text-xs text-text-tertiary ml-1">
            (Detailed costs 2x)
          </span>
        </div>
        {/* Model Selector - Moved Above */}
        <div className="mb-2 flex justify-start">
          {" "}
          {/* Added container and margin */}
          <ModelSelector
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            disabled={isWaitingForResponse}
          />
        </div>
        {/* Input Row */}
        <div className="flex items-end gap-3">
          {/* File Input Button */}
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={isWaitingForResponse || !supportsFiles}
            className={`flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded focus:outline-none focus:ring-1 focus:ring-btn-primary disabled:cursor-not-allowed transition-colors ${
              supportsFiles
                ? "text-text-secondary hover:text-text-primary disabled:opacity-50"
                : "text-text-secondary/30 cursor-not-allowed"
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
            disabled={isWaitingForResponse || (!input.trim() && !selectedFile)} // Enable if input OR file is present
            className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded bg-btn-primary text-white hover:bg-btn-primary-hover focus:outline-none focus:ring-1 focus:ring-btn-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <ArrowUpIcon size={16} />
          </button>
        </div>
        {/* Selected File Preview */}
        {selectedFile && (
          <div className="mt-2 flex items-center justify-between text-xs text-text-secondary bg-bg-sidebar p-2 rounded">
            <span className="truncate">Selected: {selectedFile.name}</span>
            <button
              type="button"
              onClick={clearSelectedFile}
              className="ml-2 text-text-secondary hover:text-text-primary"
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
