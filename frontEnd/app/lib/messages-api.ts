"use client";

import { fetchJSON } from "./api";
import { EP } from "./endpoints";

export interface MessageUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  photo?: { path?: string } | null;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: MessageUser | string;
  content: string;
  readBy?: string[];
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
  /** Optimistic-only marker used by the UI before the server confirms. */
  pending?: boolean;
}

export interface Conversation {
  _id: string;
  otherUser: MessageUser | null;
  lastMessage: Message | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessagesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface MessagesPageResult {
  messages: Message[];
  pagination: MessagesPagination;
}

export async function getConversations(): Promise<Conversation[]> {
  const res = await fetchJSON(EP.MESSAGES.CONVERSATIONS, { method: "GET" });
  if (res?.success === false) {
    throw new Error(res?.error || res?.message || "Konuşmalar yüklenemedi.");
  }
  return (res?.data ?? []) as Conversation[];
}

export async function getMessages(
  conversationId: string,
  page = 1,
  limit = 30
): Promise<MessagesPageResult> {
  const url = `${EP.MESSAGES.CONVERSATION_MESSAGES(
    conversationId
  )}?page=${page}&limit=${limit}`;
  const res = await fetchJSON(url, { method: "GET" });
  if (res?.success === false) {
    throw new Error(res?.error || res?.message || "Mesajlar yüklenemedi.");
  }
  return {
    messages: (res?.data ?? []) as Message[],
    pagination: res?.pagination as MessagesPagination,
  };
}

export async function createConversation(
  recipientId: string
): Promise<Conversation> {
  const res = await fetchJSON(EP.MESSAGES.CONVERSATIONS, {
    method: "POST",
    body: { recipientId },
  });
  if (res?.success === false) {
    throw new Error(res?.error || res?.message || "Konuşma oluşturulamadı.");
  }
  return res?.data as Conversation;
}

export function senderId(message: Message): string {
  return typeof message.sender === "string"
    ? message.sender
    : message.sender?._id;
}

export function fullName(user?: MessageUser | null): string {
  if (!user) return "Kullanıcı";
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Kullanıcı";
}
