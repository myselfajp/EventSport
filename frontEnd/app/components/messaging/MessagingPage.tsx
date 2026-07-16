"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { Conversation, getConversations } from "@/app/lib/messages-api";
import ConversationList from "./ConversationList";
import ChatWindow from "./ChatWindow";

const MessagingPage: React.FC = () => {
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams.get("conversationId");

  const [selected, setSelected] = useState<Conversation | null>(null);

  const { data: conversations } = useQuery({
    queryKey: ["messages", "conversations"],
    queryFn: getConversations,
  });

  const handleConversationDeleted = useCallback((conversationId: string) => {
    setSelected((current) =>
      current?._id === conversationId ? null : current
    );
  }, []);

  const appliedParamRef = useRef<string | null>(null);
  useEffect(() => {
    if (!conversationIdParam) {
      appliedParamRef.current = null;
      return;
    }
    if (appliedParamRef.current === conversationIdParam) return;
    if (!conversations) return;

    const match = conversations.find((c) => c._id === conversationIdParam);
    if (match) {
      setSelected(match);
      appliedParamRef.current = conversationIdParam;
    }
  }, [conversationIdParam, conversations]);

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

      <div
        className={`flex-1 min-w-0 ${selected ? "block" : "hidden md:block"}`}
      >
        {selected ? (
          <ChatWindow
            key={selected._id}
            conversationId={selected._id}
            otherUser={selected.otherUser}
            onBack={() => setSelected(null)}
            onConversationDeleted={() =>
              handleConversationDeleted(selected._id)
            }
          />
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
