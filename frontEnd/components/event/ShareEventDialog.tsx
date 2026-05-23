"use client";

import React, { useMemo, useState } from "react";
import {
  X,
  Copy,
  Check,
  MessageCircle,
  Send,
  Mail,
  Share2,
  Link2,
} from "lucide-react";
import {
  buildEventShareMessage,
  copyTextToClipboard,
  emailShareUrl,
  facebookShareUrl,
  getEventInviteUrl,
  nativeShare,
  canUseNativeShare,
  telegramShareUrlFromText,
  twitterShareUrl,
  whatsAppShareUrl,
  type EventSharePayload,
} from "@/app/lib/event-share";

interface ShareEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payload: EventSharePayload | null;
}

const ShareEventDialog: React.FC<ShareEventDialogProps> = ({
  isOpen,
  onClose,
  payload,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const shareText = useMemo(
    () => (payload ? buildEventShareMessage(payload) : ""),
    [payload]
  );
  const inviteUrl = useMemo(
    () => (payload ? getEventInviteUrl(payload.eventId) : ""),
    [payload]
  );

  if (!isOpen || !payload) return null;

  const openWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    const ok = await copyTextToClipboard(inviteUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyMessage = async () => {
    const ok = await copyTextToClipboard(shareText);
    if (ok) {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    await nativeShare(payload);
  };

  const channels = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      className: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100",
      onClick: () => openWindow(whatsAppShareUrl(shareText)),
    },
    {
      id: "telegram",
      label: "Telegram",
      icon: Send,
      className: "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 hover:bg-sky-100",
      onClick: () => openWindow(telegramShareUrlFromText(shareText)),
    },
    {
      id: "twitter",
      label: "X (Twitter)",
      icon: Share2,
      className: "bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100",
      onClick: () => openWindow(twitterShareUrl(shareText)),
    },
    {
      id: "facebook",
      label: "Facebook",
      icon: Share2,
      className: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100",
      onClick: () => openWindow(facebookShareUrl(inviteUrl)),
    },
    {
      id: "email",
      label: "Email",
      icon: Mail,
      className: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100",
      onClick: () =>
        openWindow(
          emailShareUrl(
            `Invitation: ${payload.eventName}`,
            shareText
          )
        ),
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-labelledby="share-event-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h3
            id="share-event-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Share event
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Message preview
            </p>
            <pre className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg p-3 font-sans">
              {shareText}
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void handleCopyMessage()}
              className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
            >
              {copiedMessage ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Copy message
            </button>
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
            >
              {copiedLink ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              Copy link
            </button>
          </div>

          {canUseNativeShare() && (
            <button
              type="button"
              onClick={() => void handleNativeShare()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg"
            >
              <Share2 className="w-4 h-4" />
              Share via device
            </button>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Or share on:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {channels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={ch.onClick}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${ch.className}`}
              >
                <ch.icon className="w-4 h-4 shrink-0" />
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareEventDialog;
