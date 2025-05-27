import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { EditIcon, TrashIcon, X } from "lucide-react";

interface ChatHeaderProps {
  title: string | null;
  chatId?: string;
  onTitleUpdate?: (newTitle: string) => void;
  onChatDeleted?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  chatId,
  onTitleUpdate,
  onChatDeleted,
}) => {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(title || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Don't show buttons for new chats
  const showActions = chatId && chatId !== "new";

  // Update editTitle when title prop changes
  useEffect(() => {
    setEditTitle(title || "");
  }, [title]);

  // Handle modal open/close to prefill and focus
  const handleEditModalChange = (open: boolean) => {
    setIsEditOpen(open);
    if (open) {
      // Reset title to current value when opening
      setEditTitle(title || "");
      setError(null);
      // Focus the input after the modal opens
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select(); // Select all text for easy replacement
      }, 0);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId || !editTitle.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/edit-title", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          title: editTitle.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update title");
      }

      const data = await response.json();
      onTitleUpdate?.(data.chat.title);
      setIsEditOpen(false);
    } catch (error) {
      console.error("Error updating title:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update title"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!chatId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete chat");
      }

      // Notify parent that chat was deleted (for refreshing chat list)
      onChatDeleted?.();

      // Redirect to new chat
      router.push("/chat/new");
    } catch (error) {
      console.error("Error deleting chat:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete chat"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-4 md:px-6 lg:px-8 py-5 border-b border-border-primary">
      <div className="flex items-center justify-center relative">
        <h2 className="text-lg font-medium text-text-primary truncate text-center flex-1">
          {title || "..."}
        </h2>

        {showActions && (
          <div className="absolute right-0 flex items-center gap-2">
            {/* Edit Dialog */}
            <Dialog.Root open={isEditOpen} onOpenChange={handleEditModalChange}>
              <Dialog.Trigger asChild>
                <button
                  className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-input transition-colors"
                  aria-label="Edit chat title"
                >
                  <EditIcon size={16} />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-bg-sidebar rounded-lg p-6 w-full max-w-md z-50 border border-border-primary">
                  <Dialog.Title className="text-lg font-medium text-text-primary mb-4">
                    Edit Chat Title
                  </Dialog.Title>

                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="title"
                        className="block text-sm font-medium text-text-primary mb-2"
                      >
                        Title
                      </label>
                      <input
                        ref={editInputRef}
                        id="title"
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-bg-input border border-border-primary rounded-md text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-btn-primary"
                        placeholder="Enter chat title"
                        maxLength={100}
                        disabled={isLoading}
                      />
                    </div>

                    {error && (
                      <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded">
                        {error}
                      </div>
                    )}

                    <div className="flex justify-end gap-3">
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      </Dialog.Close>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-btn-primary text-white rounded-md hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading || !editTitle.trim()}
                      >
                        {isLoading ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </form>

                  <Dialog.Close asChild>
                    <button
                      className="absolute top-4 right-4 p-1 rounded text-text-secondary hover:text-text-primary"
                      aria-label="Close"
                    >
                      <X size={16} />
                    </button>
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            {/* Delete Dialog */}
            <Dialog.Root open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <Dialog.Trigger asChild>
                <button
                  className="p-2 rounded-md text-text-secondary hover:text-red-400 hover:bg-red-900/20 transition-colors"
                  aria-label="Delete chat"
                >
                  <TrashIcon size={16} />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-bg-sidebar rounded-lg p-6 w-full max-w-md z-50 border border-border-primary">
                  <Dialog.Title className="text-lg font-medium text-text-primary mb-4">
                    Delete Chat
                  </Dialog.Title>

                  <p className="text-text-secondary mb-6">
                    Are you sure you want to delete this chat? This action
                    cannot be undone.
                  </p>

                  {error && (
                    <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded mb-4">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                    </Dialog.Close>
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading}
                    >
                      {isLoading ? "Deleting..." : "Delete"}
                    </button>
                  </div>

                  <Dialog.Close asChild>
                    <button
                      className="absolute top-4 right-4 p-1 rounded text-text-secondary hover:text-text-primary"
                      aria-label="Close"
                    >
                      <X size={16} />
                    </button>
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
