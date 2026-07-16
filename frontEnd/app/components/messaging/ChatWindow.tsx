"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical, Send, Trash2 } from "lucide-react";
import { useMe } from "@/app/hooks/useAuth";
import { useSocket } from "@/app/hooks/useSocket";
import {
  deleteConversation,
  deleteMessage,
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
  onConversationDeleted?: () => void;
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

function deletedLabel(mine: boolean): string {
  return mine ? "You deleted this message" : "This message was deleted";
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
  onConversationDeleted: onConversationDeletedCallback,
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [deleteMenuMessageId, setDeleteMenuMessageId] = useState<string | null>(
    null
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMessages([]);
    setPage(1);
    setDeleteMenuMessageId(null);

    getMessages(conversationId, 1, PAGE_LIMIT)
      .then((res) => {
        if (cancelled) return;
        setMessages(sortAsc(res.messages));
        setHasMore(res.pagination?.hasMore ?? false);
        scrollToBottom("auto");
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Failed to load messages.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    if (socket && conversationId) {
      socket.emit("mark_read", { conversationId });
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    }
  }, [socket, conversationId, queryClient]);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg: Message) => {
      if (String(msg.conversation) !== String(conversationId)) {
        queryClient.invalidateQueries({
          queryKey: ["messages", "conversations"],
        });
        return;
      }
      setMessages((prev) => upsertMessage(prev, msg));
      scrollToBottom("smooth");

      if (meId && senderId(msg) !== meId) {
        socket.emit("mark_read", { conversationId });
      }
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    };

    const onMessageDeleted = (payload: {
      conversationId: string;
      messageId: string;
      mode?: "me" | "everyone";
      message?: Message | null;
    }) => {
      if (String(payload.conversationId) !== String(conversationId)) {
        queryClient.invalidateQueries({
          queryKey: ["messages", "conversations"],
        });
        return;
      }

      if (payload.mode === "everyone" && payload.message) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === payload.messageId ? { ...payload.message! } : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== payload.messageId));
      }

      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    };

    const onConversationDeletedEvent = (payload: { conversationId: string }) => {
      if (String(payload.conversationId) !== String(conversationId)) return;
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      onConversationDeletedCallback?.();
    };

    socket.on("new_message", onNewMessage);
    socket.on("message_deleted", onMessageDeleted);
    socket.on("conversation_deleted", onConversationDeletedEvent);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("message_deleted", onMessageDeleted);
      socket.off("conversation_deleted", onConversationDeletedEvent);
    };
  }, [
    socket,
    conversationId,
    meId,
    queryClient,
    scrollToBottom,
    onConversationDeletedCallback,
  ]);

  useEffect(() => {
    if (!deleteMenuMessageId) return;
    const close = () => setDeleteMenuMessageId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [deleteMenuMessageId]);

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
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevHeight;
        }
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load more messages.");
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, hasMore, loadingMore, page]);

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || !socket || !meId) return;

    socket.emit("send_message", { conversationId, content });

    const optimistic: Message = {
      _id: `temp-${Date.now()}`,
      conversation: conversationId,
      sender: { _id: meId, firstName: me?.firstName, lastName: me?.lastName },
      content,
      readBy: [meId],
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

  const handleDeleteMessage = useCallback(
    async (
      messageId: string,
      scope: "me" | "everyone",
      pending = false
    ) => {
      if (!messageId || deletingId) return;

      setDeleteMenuMessageId(null);

      if (pending || messageId.startsWith("temp-")) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
        return;
      }

      setDeletingId(messageId);
      setError(null);

      const applyMe = () => {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
        queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      };

      const applyEveryone = (updated?: Message) => {
        if (updated) {
          setMessages((prev) =>
            prev.map((m) => (m._id === messageId ? updated : m))
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === messageId ? { ...m, isDeleted: true, content: "" } : m
            )
          );
        }
        queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      };

      try {
        if (socket) {
          await new Promise<void>((resolve, reject) => {
            socket.emit(
              "delete_message",
              { conversationId, messageId, scope },
              (res: {
                success?: boolean;
                error?: string;
                data?: {
                  mode?: "me" | "everyone";
                  message?: Message;
                };
              }) => {
                if (res?.success) {
                  if (res.data?.mode === "everyone") {
                    applyEveryone(res.data.message);
                  } else {
                    applyMe();
                  }
                  resolve();
                } else {
                  reject(new Error(res?.error || "Failed to delete message."));
                }
              }
            );
          });
        } else {
          await deleteMessage(conversationId, messageId, scope);
          if (scope === "everyone") applyEveryone();
          else applyMe();
        }
      } catch (e: any) {
        setError(e?.message || "Failed to delete message.");
      } finally {
        setDeletingId(null);
      }
    },
    [socket, conversationId, deletingId, queryClient]
  );

  const handleDeleteConversation = useCallback(async () => {
    if (deletingConversation) return;

    const confirmed = window.confirm(
      "This chat will only be deleted for you. The other person will still see it. Continue?"
    );
    if (!confirmed) return;

    setDeletingConversation(true);
    setError(null);

    try {
      if (socket) {
        await new Promise<void>((resolve, reject) => {
          socket.emit(
            "delete_conversation",
            { conversationId },
            (res: { success?: boolean; error?: string }) => {
              if (res?.success) resolve();
              else reject(new Error(res?.error || "Failed to delete conversation."));
            }
          );
        });
      } else {
        await deleteConversation(conversationId);
      }

      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      onConversationDeletedCallback?.();
    } catch (e: any) {
      setError(e?.message || "Failed to delete conversation.");
    } finally {
      setDeletingConversation(false);
    }
  }, [
    socket,
    conversationId,
    deletingConversation,
    queryClient,
    onConversationDeletedCallback,
  ]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <Avatar user={otherUser} size={40} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {fullName(otherUser)}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDeleteConversation}
          disabled={deletingConversation}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          aria-label="Delete chat"
          title="Delete chat for me"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load older messages"}
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
            No messages yet. Send the first one!
          </div>
        ) : (
          messages.map((msg) => {
            const mine = meId && senderId(msg) === meId;
            const isDeleted = Boolean(msg.isDeleted);
            const canManage = !isDeleted && !msg.pending;
            const showMenu = deleteMenuMessageId === msg._id;

            return (
              <div
                key={msg._id}
                className={`group flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-[75%] ${
                    mine ? "flex flex-row-reverse items-end gap-1.5" : ""
                  }`}
                >
                  {canManage && (
                    <div className="relative mb-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (mine) {
                            setDeleteMenuMessageId((current) =>
                              current === msg._id ? null : msg._id
                            );
                          } else {
                            void handleDeleteMessage(msg._id, "me");
                          }
                        }}
                        disabled={deletingId === msg._id}
                        className="rounded-full p-1.5 text-gray-400 opacity-100 transition-opacity hover:bg-gray-100 hover:text-gray-600 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-50 dark:hover:bg-slate-700 dark:hover:text-gray-200"
                        aria-label="Message options"
                      >
                        {mine ? (
                          <MoreVertical className="h-4 w-4" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>

                      {mine && showMenu && (
                        <div
                          className="absolute bottom-full right-0 z-20 mb-1 min-w-[160px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg._id, "me")}
                            disabled={deletingId === msg._id}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-slate-700"
                          >
                            Delete for me
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteMessage(msg._id, "everyone")
                            }
                            disabled={deletingId === msg._id}
                            className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            Delete for everyone
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm break-words shadow-sm ${
                      isDeleted
                        ? mine
                          ? "rounded-br-sm border border-cyan-400/30 bg-cyan-500/20 text-cyan-100"
                          : "rounded-bl-sm border border-gray-200 bg-gray-100 text-gray-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-gray-400"
                        : mine
                          ? "bg-cyan-500 text-white rounded-br-sm"
                          : "bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-slate-700"
                    } ${msg.pending ? "opacity-70" : ""}`}
                  >
                    <div
                      className={`whitespace-pre-wrap ${
                        isDeleted ? "italic text-[13px]" : ""
                      }`}
                    >
                      {isDeleted ? deletedLabel(Boolean(mine)) : msg.content}
                    </div>
                    <div
                      className={`text-[10px] mt-1 text-right ${
                        isDeleted
                          ? mine
                            ? "text-cyan-100/70"
                            : "text-gray-400 dark:text-gray-500"
                          : mine
                            ? "text-cyan-50/80"
                            : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Type a message..."
            className="flex-1 resize-none max-h-32 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-cyan-500 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex-shrink-0 w-11 h-11 rounded-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            aria-label="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
