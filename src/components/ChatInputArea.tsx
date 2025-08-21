import React, {
  ChangeEvent,
  KeyboardEvent,
  useState,
  useRef,
  useEffect,
} from "react";
import TextareaAutosize from "react-textarea-autosize";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpIcon, PaperclipIcon, XIcon } from "lucide-react";
import { GeminiModelId, MODEL_DETAILS } from "@/types";
import { ChatSettings } from "@/types/settings";
import { Message } from "@/types/messages";
import ModelSelector from "./ModelSelector";
import AdvancedChatSettings from "./AdvancedChatSettings";
import ToolsSelector from "./ToolsSelector";
import { useMessageLimit } from "@/contexts/MessageLimitContext";

// Custom hook to get the previous value of a prop or state
function usePrevious(value: boolean) {
  const ref = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

interface ChatInputAreaProps {
  input: string;
  handleInputChange: (
    e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>
  ) => void;
  handleFormSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    attachment?: File | null,
    useSearch?: boolean
  ) => void; // Modified to accept optional attachment
  selectedModel: GeminiModelId; // Use GeminiModelId
  setSelectedModel: (model: GeminiModelId) => void; // Use GeminiModelId
  isWaitingForResponse: boolean;
  favoriteModel: GeminiModelId | null;
  onSetFavoriteModel: (modelId: GeminiModelId) => void;
  chatSettings: ChatSettings;
  setChatSettings: (settings: ChatSettings) => void;
  messages: Message[]; // Add messages prop for token warning
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  input,
  handleInputChange,
  handleFormSubmit,
  selectedModel,
  setSelectedModel,
  isWaitingForResponse,
  favoriteModel,
  onSetFavoriteModel,
  chatSettings,
  setChatSettings,
  messages,
}) => {
  const [useSearch, setUseSearch] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false); // For drag-and-drop
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wasWaitingForResponse = usePrevious(isWaitingForResponse);
  const { messageLimit } = useMessageLimit();

  // Check if the last message exceeds token limit
  const lastMessage = messages[messages.length - 1];
  const shouldShowTokenWarning =
    lastMessage?.total_tokens && lastMessage.total_tokens > 100000;

  // Check if user has enough messages left
  // Gemini 2.5 Pro uses 2x message count, so disable at 1 remaining message
  const currentModelDetail = MODEL_DETAILS.find(model => model.id === selectedModel);
  const requiredMessages = currentModelDetail?.cost || 1;
  const hasEnoughMessages = messageLimit ? messageLimit.remainingMessages >= requiredMessages : true;
  const isInputDisabled = isWaitingForResponse || !hasEnoughMessages;

  useEffect(() => {
    if (wasWaitingForResponse && !isWaitingForResponse) {
      textareaRef.current?.focus();
    }
  }, [isWaitingForResponse, wasWaitingForResponse]);

  // Get current model details to check if it supports files
  const currentModel = MODEL_DETAILS.find(
    (model) => model.id === selectedModel
  );
  const supportsFiles = currentModel?.supportsFiles ?? false;
  const supportsSearch = currentModel?.supportsSearch ?? false;

  // Document-level drag and drop handlers to detect dragging anywhere on the page
  useEffect(() => {
    const handleDocumentDragEnter = (e: DragEvent) => {
      e.preventDefault();
      // Only show indicator if files are being dragged
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        // Check if any of the items are files
        const hasFiles = Array.from(e.dataTransfer.items).some(
          (item) => item.kind === "file"
        );
        if (hasFiles) {
          setIsDragging(true);
        }
      }
    };

    const handleDocumentDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDocumentDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDocumentDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    document.addEventListener("dragenter", handleDocumentDragEnter);
    document.addEventListener("dragleave", handleDocumentDragLeave);
    document.addEventListener("dragover", handleDocumentDragOver);
    document.addEventListener("drop", handleDocumentDrop);

    return () => {
      document.removeEventListener("dragenter", handleDocumentDragEnter);
      document.removeEventListener("dragleave", handleDocumentDragLeave);
      document.removeEventListener("dragover", handleDocumentDragOver);
      document.removeEventListener("drop", handleDocumentDrop);
    };
  }, []);

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
    handleFormSubmit(e, selectedFile, useSearch);
    // Clear input and file after submission is handled by the parent
    // setInput(""); // This should be handled by parent if input is controlled there
    if (!isWaitingForResponse) {
      // Only clear if not waiting (parent will manage input clearing)
      clearSelectedFile();
    }
  };

  // --- Form-level Drag and Drop Handlers (for actual file dropping) ---
  const handleFormDragOver = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleFormDrop = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(false);

    if (!supportsFiles) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };
  // --- End Form-level Drag and Drop Handlers ---

  return (
    <div className="sm:px-4 md:px-48 lg:px-64 pb-3 pt-1 sticky bottom-0 z-10 bg-transparent w-full sm:mb-4">
      <div className={`relative transition-opacity duration-300 opacity-100`}>
        <form
          onSubmit={onFormSubmit}
          onDragOver={handleFormDragOver}
          onDrop={handleFormDrop}
          className={`p-3 bg-gray-800/50 border rounded-xl focus-within:border-gray-600 transition-all duration-150 flex flex-col relative ${
            isDragging
              ? supportsFiles
                ? "border-blue-500 bg-blue-500/10"
                : "border-red-500 bg-red-500/10"
              : "border-gray-700/50"
          }`}
        >
          {/* Drag and Drop Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/80 rounded-xl">
              <div className="text-center">
                {supportsFiles ? (
                  <>
                    <PaperclipIcon
                      size={32}
                      className="mx-auto mb-2 text-blue-400"
                    />
                    <p className="text-blue-400 font-medium">
                      Drop here to attach file
                    </p>
                    <p className="text-gray-400 text-sm">
                      Release to attach your file
                    </p>
                  </>
                ) : (
                  <>
                    <XIcon size={32} className="mx-auto mb-2 text-red-400" />
                    <p className="text-red-400 font-medium">
                      This model does not support files
                    </p>
                    <p className="text-gray-400 text-sm">
                      Choose a model that supports attachments
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
          {/* Model Selector and Controls */}
          <motion.div
            className="mb-2 flex items-center justify-between gap-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-4">
              <ModelSelector
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                disabled={isInputDisabled}
                favoriteModel={favoriteModel}
                onSetFavoriteModel={onSetFavoriteModel}
              />
            </div>
            <div className="flex items-center gap-2">
              <ToolsSelector
                useSearch={useSearch}
                setUseSearch={setUseSearch}
                supportsSearch={supportsSearch}
                disabled={isInputDisabled}
              />
              <AdvancedChatSettings
                settings={chatSettings}
                onSettingsChange={setChatSettings}
                disabled={isInputDisabled}
              />
            </div>
          </motion.div>
          {/* Input Row */}
          <div className="flex items-end gap-3">
            {/* File Input Button */}
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={isInputDisabled || !supportsFiles}
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
              disabled={isInputDisabled || !supportsFiles}
            />
            {/* Text Input */}
            <TextareaAutosize
              ref={textareaRef}
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
              disabled={isInputDisabled}
              onKeyDown={handleKeyDown}
            />

            {/* Send Button */}
            <motion.button
              type="submit"
              disabled={
                isInputDisabled || (!input.trim() && !selectedFile)
              } // Enable if input OR file is present
              className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={
                isWaitingForResponse ? { scale: [1, 1.1, 1] } : { scale: 1 }
              }
              transition={
                isWaitingForResponse
                  ? { duration: 1, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.1 }
              }
            >
              <ArrowUpIcon size={16} />
            </motion.button>
          </div>
          {/* Selected File Preview */}
          <AnimatePresence>
            {selectedFile && (
              <motion.div
                className="mt-2 flex items-center justify-between text-xs text-gray-400 bg-gray-800/50 border border-gray-700/50 p-2 rounded"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <span className="truncate">Selected: {selectedFile.name}</span>
                <motion.button
                  type="button"
                  onClick={clearSelectedFile}
                  className="ml-2 text-gray-400 hover:text-gray-200"
                  aria-label="Clear selected file"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <XIcon size={14} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Token Usage Warning - Bottom Right */}
        <AnimatePresence>
          {shouldShowTokenWarning && (
            <motion.div
              className="absolute -top-10 right-1 p-2 bg-yellow-900/10 border border-yellow-600/30 rounded text-yellow-300/80 text-xs max-w-64"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-1">
                <div className="flex-shrink-0 w-3 h-3 rounded-full bg-yellow-600/50 flex items-center justify-center">
                  <span className="text-yellow-200 text-[8px] font-bold">
                    !
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] leading-tight">
                    Start a new chat for better results.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Limit Warning - Bottom Left */}
        <AnimatePresence>
          {!hasEnoughMessages && messageLimit && (
            <motion.div
              className="absolute -top-10 left-1 p-2 bg-red-900/10 border border-red-600/30 rounded text-red-300/80 text-xs max-w-64"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-1">
                <div className="flex-shrink-0 w-3 h-3 rounded-full bg-red-600/50 flex items-center justify-center">
                  <span className="text-red-200 text-[8px] font-bold">
                    !
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] leading-tight">
                    {requiredMessages > 1 
                      ? `Need ${requiredMessages} messages for this model. ${messageLimit.remainingMessages} left.`
                      : "No messages remaining today."
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChatInputArea;
