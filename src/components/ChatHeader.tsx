import React from "react";
import EditChatTitleDialog from "./dialogs/EditChatTitleDialog";
import DeleteChatDialog from "./dialogs/DeleteChatDialog";

interface ChatHeaderProps {
  title: string | null;
  chatId: string;
  onTitleUpdate: (newTitle: string) => void;
  onChatDeleted: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  chatId,
  onTitleUpdate,
  onChatDeleted,
}) => {
  // Don't show buttons for new chats
  const showActions = chatId && chatId !== "new";

  return (
    <div className="px-4 md:px-6 lg:px-8 py-5 border-b border-border-primary">
      <div className="flex items-center justify-center relative">
        <h2 className="text-lg font-medium text-text-primary truncate text-center flex-1">
          {title || "..."}
        </h2>

        {showActions && (
          <div className="absolute right-0 flex items-center gap-2">
            <EditChatTitleDialog
              chatId={chatId}
              currentTitle={title || ""}
              onTitleUpdate={onTitleUpdate}
            />
            <DeleteChatDialog chatId={chatId} onChatDeleted={onChatDeleted} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
