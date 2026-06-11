"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  X,
  CheckCircle,
  Clock,
  CreditCard,
} from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

export type EventParticipantRow = {
  _id: string;
  isCheckedIn?: boolean;
  isPaid?: boolean;
  isWaitListed?: boolean;
  user?: { firstName?: string; lastName?: string };
  participant?: { name?: string };
};

interface EventParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  eventName?: string;
}

const EventParticipantsModal: React.FC<EventParticipantsModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventName,
}) => {
  const [participants, setParticipants] = useState<EventParticipantRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !eventId) {
      setParticipants([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await fetchJSON(EP.COACH.getEventParticipants(eventId), {
          method: "POST",
          body: { perPage: 100, pageNumber: 1 },
        });
        if (!cancelled && response?.success && Array.isArray(response.data)) {
          setParticipants(response.data);
        } else if (!cancelled) {
          setParticipants([]);
        }
      } catch {
        if (!cancelled) setParticipants([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/75 flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Event Gamers
            </h3>
            {eventName ? (
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                {eventName}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : participants.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No gamers yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {participants.map((p) => (
                <div
                  key={p._id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                      {p.user?.firstName?.[0] || "?"}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {p.user?.firstName} {p.user?.lastName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        {p.participant?.name || "Gamer"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isCheckedIn ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Checked In
                      </span>
                    ) : p.isPaid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                        <CreditCard className="w-3 h-3" />
                        Paid
                      </span>
                    ) : p.isWaitListed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        Waitlisted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-400">
            <span>Total: {participants.length} gamers</span>
            <span>
              Checked In:{" "}
              {participants.filter((p) => p.isCheckedIn).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventParticipantsModal;
