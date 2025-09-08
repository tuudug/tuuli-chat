import React, {
  ChangeEvent,
  KeyboardEvent,
  useState,
  useRef,
  useEffect,
} from "react";
import TextareaAutosize from "react-textarea-autosize";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpIcon,
  PlusIcon,
  XIcon,
  CheckIcon,
  PaperclipIcon,
  BrainIcon,
} from "lucide-react";
import { GeminiModelId } from "@/types";
import { Message } from "@/types/messages";
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
    attachment?: File | null
  ) => void; // Modified to accept optional attachment
  selectedModel: GeminiModelId; // Deprecated: kept for backward compatibility
  setSelectedModel: (model: GeminiModelId) => void; // Deprecated
  isWaitingForResponse: boolean;
  favoriteModel: GeminiModelId | null;
  onSetFavoriteModel: (modelId: GeminiModelId) => void;
  thinkLonger: boolean;
  onToggleThinkLonger: (next: boolean) => void;
  messages: Message[]; // Add messages prop for token warning
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  input,
  handleInputChange,
  handleFormSubmit,
  selectedModel: _selectedModel,
  setSelectedModel: _setSelectedModel,
  isWaitingForResponse,
  favoriteModel: _favoriteModel,
  onSetFavoriteModel: _onSetFavoriteModel,
  thinkLonger,
  onToggleThinkLonger,
  messages,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false); // For drag-and-drop
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusTriggerRef = useRef<HTMLButtonElement>(null);
  const plusPopoverRef = useRef<HTMLDivElement>(null);

  const wasWaitingForResponse = usePrevious(isWaitingForResponse);
  const { messageLimit } = useMessageLimit();

  // Check if the last message exceeds token limit
  const lastMessage = messages[messages.length - 1];
  const shouldShowTokenWarning =
    lastMessage?.total_tokens && lastMessage.total_tokens > 100000;

  // Check if user has enough messages left
  // Each message costs 1 now
  const requiredMessages = 1;
  const hasEnoughMessages = messageLimit
    ? messageLimit.remainingMessages >= requiredMessages
    : true;
  const isInputDisabled = isWaitingForResponse || !hasEnoughMessages;

  useEffect(() => {
    if (wasWaitingForResponse && !isWaitingForResponse) {
      textareaRef.current?.focus();
    }
  }, [isWaitingForResponse, wasWaitingForResponse]);

  // Close plus menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        plusPopoverRef.current &&
        !plusPopoverRef.current.contains(event.target as Node) &&
        plusTriggerRef.current &&
        !plusTriggerRef.current.contains(event.target as Node)
      ) {
        setShowPlusMenu(false);
      }
    };

    if (showPlusMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPlusMenu]);

  // All models support files now
  const supportsFiles = true;

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
    fileInputRef.current?.click();
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
        <style jsx>{`
          @keyframes slideInFromBottom {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
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
          } ${thinkLonger ? "border-purple-500/60" : ""}`}
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
          {/* Model selector removed - routing handled by backend */}
          {/* Input Row */}
          <div className="flex items-center gap-3">
            {/* Plus Menu */}
            <div className="relative">
              <button
                type="button"
                ref={plusTriggerRef}
                onClick={() => setShowPlusMenu((v) => !v)}
                disabled={isInputDisabled}
                className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded focus:outline-none focus:ring-1 focus:ring-gray-600 disabled:cursor-not-allowed transition-colors text-gray-400 hover:text-gray-200 disabled:opacity-50`}
                aria-label="More"
                title="More"
              >
                <PlusIcon size={14} />
              </button>
              {showPlusMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowPlusMenu(false)}
                  />
                  {/* Popover above, matching ModelSelector aesthetics */}
                  <div
                    ref={plusPopoverRef}
                    className="absolute bottom-full left-0 mb-2 w-72 z-50"
                    style={{ animation: "slideInFromBottom 100ms ease-out" }}
                  >
                    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-lg">
                      <div className="p-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPlusMenu(false);
                            triggerFileInput();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-gray-200 hover:bg-gray-800/70 transition-colors flex items-center gap-2"
                        >
                          <div className="rounded-full p-1 bg-green-500/20">
                            <PaperclipIcon
                              size={14}
                              className="text-green-400"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">
                              Attach a file
                            </div>
                            <div className="text-[11px] text-gray-400">
                              Images, PDFs, more
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (messageLimit?.tier === "premium") {
                              onToggleThinkLonger(!thinkLonger);
                              setShowPlusMenu(false);
                            }
                          }}
                          disabled={
                            !messageLimit || messageLimit.tier !== "premium"
                          }
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 mt-1 ${
                            messageLimit?.tier === "premium"
                              ? "text-gray-200 hover:bg-gray-800/70"
                              : "text-gray-500 cursor-not-allowed"
                          }`}
                          title={
                            messageLimit?.tier === "premium"
                              ? "Use deeper reasoning for hard tasks"
                              : "Premium only"
                          }
                        >
                          <div className="rounded-full p-1 bg-blue-500/20">
                            <BrainIcon size={14} className="text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium flex items-center gap-2">
                              <span>Think longer</span>
                              <span className="text-[10px] bg-yellow-500/20 text-yellow-400 font-semibold px-1.5 py-0.5 rounded-md border border-yellow-500/30">
                                Premium
                              </span>
                              <span className="text-[10px] bg-purple-500/20 text-purple-300 font-semibold px-1.5 py-0.5 rounded-md border border-purple-500/30">
                                4x
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-400">
                              Think longer for a better answer
                            </div>
                          </div>
                          {thinkLonger && (
                            <CheckIcon size={14} className="text-blue-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              // Consider adding 'accept' attribute e.g., accept="image/*,.pdf,.doc,.docx"
              disabled={isInputDisabled}
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
              className="flex-1 bg-transparent resize-none focus:outline-none text-white placeholder:text-gray-400 text-sm leading-6 py-2"
              minRows={1} // Start with 1 row
              maxRows={6} // Grow up to 6 rows
              rows={1} // Keep initial rows=1
              disabled={isInputDisabled}
              onKeyDown={handleKeyDown}
            />

            {/* Send Button */}
            <motion.button
              type="submit"
              disabled={isInputDisabled || (!input.trim() && !selectedFile)} // Enable if input OR file is present
              className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              <ArrowUpIcon size={14} />
            </motion.button>
          </div>
          {/* Inline chips row: file + think */}
          {(selectedFile || thinkLonger) && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <AnimatePresence initial={false}>
                {selectedFile && (
                  <motion.div
                    key={`file-${selectedFile.name}-${selectedFile.size}`}
                    className="inline-flex items-center gap-2 text-xs text-gray-400 bg-gray-800/50 border border-gray-700/50 px-2 py-1 rounded"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <span className="truncate max-w-[14rem]">
                      {selectedFile.name}
                    </span>
                    <motion.button
                      type="button"
                      onClick={clearSelectedFile}
                      className="text-gray-400 hover:text-gray-200"
                      aria-label="Clear selected file"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <XIcon size={12} />
                    </motion.button>
                  </motion.div>
                )}

                {thinkLonger && (
                  <motion.div
                    key="think-chip"
                    className="inline-flex items-center gap-2 text-xs text-gray-300 bg-gray-800/50 border border-gray-700/50 px-2 py-1 rounded"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="rounded-full p-0.5 bg-blue-500/20">
                      <BrainIcon size={12} className="text-blue-400" />
                    </div>
                    <span className="font-medium">Think</span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 font-semibold px-1 py-0.5 rounded border border-purple-500/30">
                      4x
                    </span>
                    <motion.button
                      type="button"
                      onClick={() => onToggleThinkLonger(false)}
                      className="text-gray-400 hover:text-gray-200"
                      aria-label="Disable think longer"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <XIcon size={12} />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
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
                  <span className="text-red-200 text-[8px] font-bold">!</span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] leading-tight">
                    {requiredMessages > 1
                      ? `Need ${requiredMessages} messages for this model. ${messageLimit.remainingMessages} left.`
                      : "No messages remaining today."}
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
