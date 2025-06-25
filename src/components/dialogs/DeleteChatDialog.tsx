"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { TrashIcon, X } from "lucide-react";

interface DeleteChatDialogProps {
  chatId: string;
  onChatDeleted: () => void;
}

export default function DeleteChatDialog({
  chatId,
  onChatDeleted,
}: DeleteChatDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete chat");
      }

      onChatDeleted();
      router.push("/chat/new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete chat");
    } finally {
      setIsLoading(false);
      if (!error) {
        setIsOpen(false);
      }
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
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
            Are you sure you want to delete this chat? This action cannot be
            undone.
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
  );
}
