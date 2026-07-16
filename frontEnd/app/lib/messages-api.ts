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
    throw new Error(res?.error || res?.message || "Failed to load conversations.");
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
    throw new Error(res?.error || res?.message || "Failed to load messages.");
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
    throw new Error(res?.error || res?.message || "Failed to create conversation.");
  }
  return res?.data as Conversation;
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
  scope: "me" | "everyone" = "me"
): Promise<void> {
  const res = await fetchJSON(
    EP.MESSAGES.DELETE_MESSAGE(conversationId, messageId),
    { method: "DELETE", body: { scope } }
  );
  if (res?.success === false) {
    throw new Error(res?.error || res?.message || "Failed to delete message.");
  }
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const res = await fetchJSON(
    EP.MESSAGES.CONVERSATION_MESSAGES(conversationId),
    { method: "DELETE" }
  );
  if (res?.success === false) {
    throw new Error(res?.error || res?.message || "Failed to delete conversation.");
  }
}

export function messagePreview(message?: Message | null, isMine?: boolean): string {
  if (!message) return "New conversation";
  if (message.isDeleted) {
    return isMine ? "You deleted this message" : "This message was deleted";
  }
  return message.content || "New conversation";
}

export function senderId(message: Message): string {
  return typeof message.sender === "string"
    ? message.sender
    : message.sender?._id;
}

export function fullName(user?: MessageUser | null): string {
  if (!user) return "User";
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User";
}
