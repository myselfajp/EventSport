"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { useMe } from "@/app/hooks/useAuth";
import { useSocket } from "@/app/hooks/useSocket";
import {
  fullName,
  getMessages,
  Message,
  MessageUser,
  senderId,
} from "@/app/lib/messages-api";
import Avatar from "./Avatar";

interface ChatWindowProps {
  conversationId: string;
  otherUser: MessageUser | null;
  onBack?: () => void;
}

const PAGE_LIMIT = 30;

function sortAsc(list: Message[]): Message[] {
  return [...list].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function upsertMessage(list: Message[], msg: Message): Message[] {
  if (list.some((m) => m._id === msg._id)) return list;
  const idx = list.findIndex(
    (m) =>
      m.pending && senderId(m) === senderId(msg) && m.content === msg.content
  );
  if (idx !== -1) {
    const copy = [...list];
    copy[idx] = msg;
    return sortAsc(copy);
  }
  return sortAsc([...list, msg]);
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  otherUser,
  onBack,
}) => {
  const { data: me } = useMe();
  const meId: string | undefined = me?._id;
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  // Initial load (newest page) when conversation changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMessages([]);
    setPage(1);

    getMessages(conversationId, 1, PAGE_LIMIT)
      .then((res) => {
        if (cancelled) return;
        setMessages(sortAsc(res.messages));
        setHasMore(res.pagination?.hasMore ?? false);
        scrollToBottom("auto");
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Mesajlar yüklenemedi.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, scrollToBottom]);

  // Mark the conversation as read whenever it is opened.
  useEffect(() => {
    if (socket && conversationId) {
      socket.emit("mark_read", { conversationId });
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    }
  }, [socket, conversationId, queryClient]);

  // Live incoming messages.
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg: Message) => {
      if (String(msg.conversation) !== String(conversationId)) {
        // Different conversation: just refresh the list (unread badge / preview).
        queryClient.invalidateQueries({
          queryKey: ["messages", "conversations"],
        });
        return;
      }
      setMessages((prev) => upsertMessage(prev, msg));
      scrollToBottom("smooth");

      // Mark incoming (not mine) as read immediately since the chat is open.
      if (meId && senderId(msg) !== meId) {
        socket.emit("mark_read", { conversationId });
      }
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    };

    socket.on("new_message", onNewMessage);
    return () => {
      socket.off("new_message", onNewMessage);
    };
  }, [socket, conversationId, meId, queryClient, scrollToBottom]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const container = scrollRef.current;
    const prevHeight = container?.scrollHeight ?? 0;
    try {
      const nextPage = page + 1;
      const res = await getMessages(conversationId, nextPage, PAGE_LIMIT);
      setMessages((prev) => sortAsc([...res.messages, ...prev]));
      setPage(nextPage);
      setHasMore(res.pagination?.hasMore ?? false);
      // Preserve scroll position after prepending older messages.
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevHeight;
        }
      });
    } catch (e: any) {
      setError(e?.message || "Daha fazla mesaj yüklenemedi.");
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, hasMore, loadingMore, page]);

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || !socket || !meId) return;

    // 1) Önce socket ile gönder.
    socket.emit("send_message", { conversationId, content });

    // 2) Sonra optimistic update.
    const optimistic: Message = {
      _id: `temp-${Date.now()}`,
      conversation: conversationId,
      sender: { _id: meId, firstName: me?.firstName, lastName: me?.lastName },
      content,
      readBy: [meId],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => sortAsc([...prev, optimistic]));
    setInput("");
    scrollToBottom("smooth");
  }, [input, socket, meId, me, conversationId, scrollToBottom]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300"
            aria-label="Geri"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <Avatar user={otherUser} size={40} />
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {fullName(otherUser)}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {loadingMore ? "Yükleniyor..." : "Daha eski mesajları yükle"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-cyan-500" />
          </div>
        ) : error ? (
          <div className="text-center text-sm text-red-500">{error}</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">
            Henüz mesaj yok. İlk mesajı gönderin!
          </div>
        ) : (
          messages.map((msg) => {
            const mine = meId && senderId(msg) === meId;
            return (
              <div
                key={msg._id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm break-words shadow-sm ${
                    mine
                      ? "bg-cyan-500 text-white rounded-br-sm"
                      : "bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-slate-700"
                  } ${msg.pending ? "opacity-70" : ""}`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div
                    className={`text-[10px] mt-1 text-right ${
                      mine ? "text-cyan-50/80" : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Bir mesaj yazın..."
            className="flex-1 resize-none max-h-32 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-cyan-500 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex-shrink-0 w-11 h-11 rounded-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            aria-label="Gönder"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
