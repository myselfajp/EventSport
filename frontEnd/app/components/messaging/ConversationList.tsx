"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Conversation,
  fullName,
  getConversations,
} from "@/app/lib/messages-api";
import Avatar from "./Avatar";

interface ConversationListProps {
  selectedId?: string | null;
  onSelect: (conversation: Conversation) => void;
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
  if (date.toDateString() === yesterday.toDateString()) return "Dün";
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

const ConversationList: React.FC<ConversationListProps> = ({
  selectedId,
  onSelect,
}) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["messages", "conversations"],
    queryFn: getConversations,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Mesajlar
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-cyan-500" />
          </div>
        ) : isError ? (
          <div className="p-4 text-center text-sm text-red-500">
            Konuşmalar yüklenemedi.{" "}
            <button
              onClick={() => refetch()}
              className="underline hover:text-red-600"
            >
              Tekrar dene
            </button>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Henüz bir konuşmanız yok.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-700">
            {data.map((conv) => {
              const isActive = conv._id === selectedId;
              const preview = conv.lastMessage?.content || "Yeni konuşma";
              return (
                <li key={conv._id}>
                  <button
                    onClick={() => onSelect(conv)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
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
                            conv.unreadCount > 0
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
