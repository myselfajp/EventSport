"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useMe } from "@/app/hooks/useAuth";
import { useSocket } from "@/app/hooks/useSocket";
import {
  Conversation,
  deleteConversation,
  fullName,
  getConversations,
  messagePreview,
  senderId,
} from "@/app/lib/messages-api";
import Avatar from "./Avatar";

interface ConversationListProps {
  selectedId?: string | null;
  onSelect: (conversation: Conversation) => void;
  onConversationDeleted?: (conversationId: string) => void;
}

function formatTimestamp(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

const ConversationList: React.FC<ConversationListProps> = ({
  selectedId,
  onSelect,
  onConversationDeleted: onConversationDeletedCallback,
}) => {
  const { socket } = useSocket();
  const { data: me } = useMe();
  const meId = me?._id;
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["messages", "conversations"],
    queryFn: getConversations,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!socket) return;

    const onConversationDeletedEvent = (payload: { conversationId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      onConversationDeletedCallback?.(payload.conversationId);
    };

    socket.on("conversation_deleted", onConversationDeletedEvent);
    return () => {
      socket.off("conversation_deleted", onConversationDeletedEvent);
    };
  }, [socket, queryClient, onConversationDeletedCallback]);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, conv: Conversation) => {
      e.stopPropagation();
      if (deletingId) return;

      const confirmed = window.confirm(
        `This chat will only be deleted for you. ${fullName(conv.otherUser)} will still see it. Continue?`
      );
      if (!confirmed) return;

      setDeletingId(conv._id);
      try {
        if (socket) {
          await new Promise<void>((resolve, reject) => {
            socket.emit(
              "delete_conversation",
              { conversationId: conv._id },
              (res: { success?: boolean; error?: string }) => {
                if (res?.success) resolve();
                else reject(new Error(res?.error || "Failed to delete conversation."));
              }
            );
          });
        } else {
          await deleteConversation(conv._id);
        }

        queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
        onConversationDeletedCallback?.(conv._id);
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : "Failed to delete conversation."
        );
      } finally {
        setDeletingId(null);
      }
    },
    [socket, deletingId, queryClient, onConversationDeletedCallback]
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Messages
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-cyan-500" />
          </div>
        ) : isError ? (
          <div className="p-4 text-center text-sm text-red-500">
            Failed to load conversations.{" "}
            <button
              onClick={() => refetch()}
              className="underline hover:text-red-600"
            >
              Try again
            </button>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            You don&apos;t have any conversations yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-700">
            {data.map((conv) => {
              const isActive = conv._id === selectedId;
              const lastMine =
                !!meId &&
                !!conv.lastMessage &&
                senderId(conv.lastMessage) === meId;
              const preview = messagePreview(conv.lastMessage, lastMine);
              const deletedPreview = conv.lastMessage?.isDeleted;
              const isDeleting = deletingId === conv._id;

              return (
                <li key={conv._id} className="group relative">
                  <button
                    onClick={() => onSelect(conv)}
                    disabled={isDeleting}
                    className={`w-full flex items-center gap-3 px-4 py-3 pr-12 text-left transition-colors disabled:opacity-50 ${
                      isActive
                        ? "bg-cyan-50 dark:bg-cyan-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <Avatar user={conv.otherUser} size={48} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {fullName(conv.otherUser)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                          {formatTimestamp(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span
                          className={`text-sm truncate ${
                            deletedPreview
                              ? "italic text-gray-400 dark:text-gray-500"
                              : conv.unreadCount > 0
                                ? "text-gray-900 dark:text-gray-100 font-medium"
                                : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {preview}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center">
                            {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, conv)}
                    disabled={isDeleting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-gray-400 opacity-100 transition-all hover:bg-red-50 hover:text-red-500 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    aria-label="Delete chat"
                    title="Delete chat for me"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
