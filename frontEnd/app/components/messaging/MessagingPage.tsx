"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import {
  Conversation,
  createConversation,
  getConversations,
} from "@/app/lib/messages-api";
import ConversationList from "./ConversationList";
import ChatWindow from "./ChatWindow";

const MessagingPage: React.FC = () => {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const conversationIdParam = searchParams.get("conversationId");
  const recipientIdParam = searchParams.get("recipientId");

  const [selected, setSelected] = useState<Conversation | null>(null);
  const [bootstrapError, setBootstrapError] = useState("");

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["messages", "conversations"],
    queryFn: getConversations,
  });

  const handleConversationDeleted = useCallback((conversationId: string) => {
    setSelected((current) => (current?._id === conversationId ? null : current));
  }, []);

  const appliedParamsRef = useRef<string | null>(null);

  useEffect(() => {
    const signature = `${conversationIdParam || ""}|${recipientIdParam || ""}`;
    if (!conversationIdParam && !recipientIdParam) {
      appliedParamsRef.current = null;
      return;
    }
    if (appliedParamsRef.current === signature) return;

    let cancelled = false;

    const bootstrap = async () => {
      setBootstrapError("");

      const list: Conversation[] =
        conversations ??
        (await queryClient.fetchQuery({
          queryKey: ["messages", "conversations"],
          queryFn: getConversations,
        }));

      if (cancelled) return;

      if (conversationIdParam) {
        const match = list.find((item) => item._id === conversationIdParam);
        if (match) {
          setSelected(match);
          appliedParamsRef.current = signature;
          return;
        }
      }

      if (recipientIdParam) {
        try {
          const conversation = await createConversation(recipientIdParam);
          if (cancelled) return;
          await queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
          setSelected(conversation);
          appliedParamsRef.current = signature;
          return;
        } catch (err) {
          if (cancelled) return;
          setBootstrapError(
            err instanceof Error ? err.message : "Could not open the conversation."
          );
          return;
        }
      }

      if (conversationIdParam) {
        setSelected({
          _id: conversationIdParam,
          otherUser: null,
          lastMessage: null,
          lastMessageAt: null,
          unreadCount: 0,
        });
        appliedParamsRef.current = signature;
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [
    conversationIdParam,
    recipientIdParam,
    conversations,
    queryClient,
  ]);

  return (
    <div className="flex h-full rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div
        className={`w-full md:w-80 lg:w-96 md:flex-shrink-0 border-r border-gray-200 dark:border-slate-700 ${
          selected ? "hidden md:block" : "block"
        }`}
      >
        <ConversationList
          selectedId={selected?._id}
          onSelect={(conv) => setSelected(conv)}
          onConversationDeleted={handleConversationDeleted}
        />
      </div>

      <div className={`flex-1 min-w-0 ${selected ? "block" : "hidden md:block"}`}>
        {bootstrapError ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-600 dark:text-red-300">
            {bootstrapError}
          </div>
        ) : selected ? (
          <ChatWindow
            key={selected._id}
            conversationId={selected._id}
            otherUser={selected.otherUser}
            onBack={() => setSelected(null)}
            onConversationDeleted={() => handleConversationDeleted(selected._id)}
          />
        ) : isLoading || conversationIdParam || recipientIdParam ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            Opening conversation…
          </div>
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingPage;
