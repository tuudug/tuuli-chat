"use client";

import React, { useState, useRef, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { EditIcon, X } from "lucide-react";

interface EditChatTitleDialogProps {
  chatId: string;
  currentTitle: string;
  onTitleUpdate: (newTitle: string) => void;
}

export default function EditChatTitleDialog({
  chatId,
  currentTitle,
  onTitleUpdate,
}: EditChatTitleDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(currentTitle);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditTitle(currentTitle);
  }, [currentTitle]);

  const handleModalChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setEditTitle(currentTitle);
      setError(null);
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 0);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/edit-title", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, title: editTitle.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update title");
      }

      const data = await response.json();
      onTitleUpdate(data.chat.title);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update title");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleModalChange}>
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
  );
}
