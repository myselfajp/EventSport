"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MessageSquare, X } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import ServiceRequestWizard from "@/components/service-requests/ServiceRequestWizard";
import { ATHLETE_LABELS } from "@/app/lib/athlete-labels";
import {
  formatServiceRequestDate,
  formatServiceRequestLocation,
  serviceRequestDetailPreview,
} from "@/app/lib/service-request-display";

type ServiceRequestResponse = {
  _id: string;
  providerUser?: {
    _id: string;
    firstName?: string;
    lastName?: string;
  } | string;
  providerType: "coach" | "performance";
  message?: string;
  status: string;
  coach?: { name?: string };
  performanceMember?: { name?: string; branch?: string; title?: string };
};

type ServiceRequest = {
  _id: string;
  title?: string;
  targetType: "coach" | "performance";
  performanceBranch?: string;
  status: string;
  answers?: Array<{ key: string; question: string; answer: string }>;
  responses?: ServiceRequestResponse[];
  myResponse?: ServiceRequestResponse | null;
  requester?: { firstName?: string; lastName?: string };
  createdAt?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  hasGamerProfile: boolean;
  isProvider: boolean;
  preferredTab?: "mine" | "incoming" | null;
  autoStartWizard?: boolean;
  focusRequestId?: string | null;
};

function providerLabel(response: ServiceRequestResponse) {
  const provider = response.providerUser;
  const userName =
    typeof provider === "object" && provider
      ? `${provider.firstName || ""} ${provider.lastName || ""}`.trim()
      : "";
  return (
    response.coach?.name ||
    response.performanceMember?.name ||
    userName ||
    "Provider"
  );
}

function providerUserId(response: ServiceRequestResponse): string {
  const value = response.providerUser;
  if (!value) return "";
  return typeof value === "string" ? value : value._id || "";
}

function requestTargetLabel(request: ServiceRequest) {
  if (request.targetType === "coach") return "Coach";
  const branches: Record<string, string> = {
    manager: "Manager",
    psychologist: "Psychologist",
    dietitian: "Dietitian",
    psychotherapist: "Psychotherapist",
  };
  return branches[request.performanceBranch || ""] || "Performance Team";
}

function requesterName(request: ServiceRequest) {
  return (
    `${request.requester?.firstName || ""} ${request.requester?.lastName || ""}`.trim() ||
    ATHLETE_LABELS.serviceRequestFrom
  );
}

export default function ServiceRequestsPanel({
  isOpen,
  onClose,
  hasGamerProfile,
  isProvider,
  preferredTab = null,
  autoStartWizard = false,
  focusRequestId = null,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"mine" | "incoming">("mine");
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  const [incoming, setIncoming] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [interestMessage, setInterestMessage] = useState<Record<string, string>>({});
  const [focusedRequestId, setFocusedRequestId] = useState<string | null>(null);
  const [focusedIncomingRequestId, setFocusedIncomingRequestId] = useState<string | null>(null);
  const [selectingResponseId, setSelectingResponseId] = useState<string | null>(null);

  const canCreate = hasGamerProfile;
  const visibleTabs = useMemo(
    () => [
      ...(hasGamerProfile ? [{ id: "mine" as const, label: "My Requests" }] : []),
      ...(isProvider ? [{ id: "incoming" as const, label: "Incoming Requests" }] : []),
    ],
    [hasGamerProfile, isProvider]
  );

  const defaultTab = useMemo((): "mine" | "incoming" => {
    if (preferredTab && visibleTabs.some((item) => item.id === preferredTab)) {
      return preferredTab;
    }
    if (isProvider && !hasGamerProfile) return "incoming";
    return visibleTabs[0]?.id || "mine";
  }, [preferredTab, visibleTabs, isProvider, hasGamerProfile]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const tasks: Promise<void>[] = [];

      if (hasGamerProfile) {
        tasks.push(
          fetchJSON(EP.SERVICE_REQUESTS.mine, { method: "GET" }).then((res) => {
            if (res?.success) setMyRequests(res.data || []);
          })
        );
      }

      if (isProvider) {
        tasks.push(
          fetchJSON(EP.SERVICE_REQUESTS.incoming, { method: "GET" }).then((res) => {
            if (res?.success) {
              setIncoming(res.data || []);
              return;
            }
            setIncoming([]);
            throw new Error(
              res?.message || res?.error || "Incoming service requests could not be loaded."
            );
          })
        );
      }

      await Promise.all(tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Service requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [hasGamerProfile, isProvider]);

  const handleTabChange = (nextTab: "mine" | "incoming") => {
    setTab(nextTab);
    setWizardOpen(false);
    setFocusedRequestId(null);
    setFocusedIncomingRequestId(null);
  };

  useEffect(() => {
    if (!isOpen) {
      setWizardOpen(false);
      setFocusedRequestId(null);
      setFocusedIncomingRequestId(null);
      return;
    }

    setTab(defaultTab);

    if (focusRequestId) {
      if (preferredTab === "incoming" || (!hasGamerProfile && isProvider)) {
        setTab("incoming");
        setFocusedIncomingRequestId(focusRequestId);
        setFocusedRequestId(null);
        setWizardOpen(false);
        return;
      }
      setTab("mine");
      setFocusedRequestId(focusRequestId);
      setFocusedIncomingRequestId(null);
      setWizardOpen(false);
      return;
    }

    setFocusedRequestId(null);
    setFocusedIncomingRequestId(null);

    if (autoStartWizard && hasGamerProfile) {
      setWizardOpen(true);
      return;
    }

    setWizardOpen(false);
  }, [
    isOpen,
    defaultTab,
    preferredTab,
    autoStartWizard,
    hasGamerProfile,
    isProvider,
    focusRequestId,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    void loadData();
  }, [isOpen, loadData]);

  const openMessaging = (conversationId?: string, recipientId?: string) => {
    onClose();
    const params = new URLSearchParams();
    if (conversationId) params.set("conversationId", conversationId);
    if (recipientId) params.set("recipientId", recipientId);
    const qs = params.toString();
    router.push(qs ? `/messaging?${qs}` : "/messaging");
  };

  const handleWizardSubmitted = async () => {
    setTab("mine");
    setWizardOpen(false);
    await loadData();
  };

  const respond = async (requestId: string) => {
    try {
      setError("");
      const res = await fetchJSON(EP.SERVICE_REQUESTS.respond(requestId), {
        method: "POST",
        body: { message: interestMessage[requestId] || "" },
      });
      if (!res?.success) {
        throw new Error(res?.message || res?.error || "Interest could not be sent.");
      }
      await loadData();
      setInterestMessage((prev) => ({ ...prev, [requestId]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Interest could not be sent.");
    }
  };

  const selectProvider = async (requestId: string, responseId: string) => {
    try {
      setSelectingResponseId(responseId);
      setError("");
      const res = await fetchJSON(
        EP.SERVICE_REQUESTS.selectResponse(requestId, responseId),
        { method: "POST" }
      );
      if (!res?.success) {
        throw new Error(res?.message || res?.error || "Provider could not be selected.");
      }

      const conversation = res?.data?.conversation;
      const conversationId = conversation?._id || conversation?.id;
      const response = res?.data?.response as ServiceRequestResponse | undefined;
      const recipientId = response ? providerUserId(response) : "";

      await loadData();
      openMessaging(conversationId, recipientId || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provider could not be selected.");
    } finally {
      setSelectingResponseId(null);
    }
  };

  const openProviderChat = (response: ServiceRequestResponse) => {
    const recipientId = providerUserId(response);
    if (!recipientId) {
      setError("Could not open messaging for this provider.");
      return;
    }
    openMessaging(undefined, recipientId);
  };

  if (!isOpen) return null;

  const focusedRequest = focusedRequestId
    ? myRequests.find((r) => r._id === focusedRequestId) || null
    : null;

  const focusedIncomingRequest = focusedIncomingRequestId
    ? incoming.find((r) => r._id === focusedIncomingRequestId) || null
    : null;

  const renderProviderResponses = (request: ServiceRequest) => (
    <div className="space-y-2">
      {(request.responses || []).length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 dark:border-gray-700">
          No offers yet.
        </p>
      )}
      {(request.responses || []).map((response) => {
        const canChoose =
          request.status === "open" && response.status === "interested";
        const isSelected =
          request.status === "in_conversation" && response.status === "selected";
        const canOpenChat = canChoose || isSelected;
        const busy = selectingResponseId === response._id;

        return (
          <div
            key={response._id}
            className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {providerLabel(response)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {response.message || "Interested in this request."}
              </div>
            </div>
            <button
              type="button"
              disabled={!canOpenChat || busy}
              onClick={() =>
                canChoose
                  ? void selectProvider(request._id, response._id)
                  : openProviderChat(response)
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              <MessageSquare className="h-4 w-4" />
              {busy ? "Opening…" : isSelected ? "Open chat" : "Choose & Message"}
            </button>
          </div>
        );
      })}
    </div>
  );

  const renderMyRequestCard = (request: ServiceRequest, compact = false) => (
    <div
      key={request._id}
      className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {request.title || requestTargetLabel(request)}
          </h3>
          <p className="text-xs text-gray-500">
            {formatServiceRequestDate(request.createdAt)} · {requestTargetLabel(request)} ·{" "}
            {request.status}
          </p>
        </div>
        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-100">
          {request.responses?.length || 0} interested
        </span>
      </div>
      {!compact && (
        <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
          {(request.answers || []).slice(0, 4).map((answer) => (
            <div key={answer.key} className="rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
              <div className="text-xs text-gray-500">{answer.question}</div>
              <div className="text-gray-800 dark:text-gray-100">{answer.answer || "—"}</div>
            </div>
          ))}
        </div>
      )}
      {renderProviderResponses(request)}
    </div>
  );

  const renderIncomingDetail = (request: ServiceRequest) => (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {request.title || requestTargetLabel(request)}
          </h3>
          <p className="text-xs text-gray-500">
            From {requesterName(request)} · {formatServiceRequestDate(request.createdAt)}
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-100">
          {requestTargetLabel(request)}
        </span>
      </div>
      <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
        {(request.answers || []).map((answer) => (
          <div key={answer.key} className="rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
            <div className="text-xs text-gray-500">{answer.question}</div>
            <div className="text-gray-800 dark:text-gray-100">{answer.answer || "—"}</div>
          </div>
        ))}
      </div>
      {request.myResponse ? (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-200">
          You already showed interest. Status: {request.myResponse.status}
          {request.myResponse.message ? (
            <p className="mt-1 text-green-800/90 dark:text-green-100/90">
              “{request.myResponse.message}”
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={interestMessage[request._id] || ""}
            onChange={(e) =>
              setInterestMessage((prev) => ({
                ...prev,
                [request._id]: e.target.value,
              }))
            }
            placeholder={ATHLETE_LABELS.messagePlaceholder}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
          />
          <button
            type="button"
            onClick={() => void respond(request._id)}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            I am interested
          </button>
        </div>
      )}
    </div>
  );

  const renderIncomingSummaryList = () => (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="hidden sm:grid sm:grid-cols-[120px_1fr_1.4fr] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
        <span>Date</span>
        <span>Location</span>
        <span>Details</span>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {incoming.map((request) => (
          <li key={request._id}>
            <button
              type="button"
              onClick={() => setFocusedIncomingRequestId(request._id)}
              className="w-full px-4 py-3 text-left transition-colors hover:bg-cyan-50/70 dark:hover:bg-cyan-950/20"
            >
              <div className="grid gap-2 sm:grid-cols-[120px_1fr_1.4fr] sm:items-start sm:gap-3">
                <div>
                  <div className="text-xs font-medium uppercase text-gray-400 sm:hidden">Date</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatServiceRequestDate(request.createdAt)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase text-gray-400 sm:hidden">
                    Location
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-200">
                    {formatServiceRequestLocation(request.answers)}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-100">
                      {requestTargetLabel(request)}
                    </span>
                    {request.myResponse && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-900/40 dark:text-green-100">
                        Responded
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-medium uppercase text-gray-400 sm:hidden">
                    Details
                  </div>
                  <div className="truncate text-sm text-gray-600 dark:text-gray-300">
                    {serviceRequestDetailPreview(
                      request.answers,
                      request.title || requestTargetLabel(request)
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">From {requesterName(request)}</div>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm es-animate-overlay">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 es-animate-dialog dark:bg-gray-800 dark:ring-white/10">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-white px-6 py-4 dark:border-gray-700 dark:from-emerald-950/20 dark:to-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Coach Me</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Find a coach or Performance Team member that fits your goals.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-3 dark:border-gray-700">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
            {visibleTabs.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`px-4 py-2 text-sm ${
                  tab === item.id
                    ? "bg-cyan-600 text-white"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                {item.label}
                {item.id === "incoming" && incoming.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">
                    {incoming.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setTab("mine");
                setWizardOpen(true);
                setFocusedRequestId(null);
                setFocusedIncomingRequestId(null);
              }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              New request
            </button>
          )}
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="overflow-y-auto p-6">
          {loading && <div className="py-8 text-center text-sm text-gray-500">Loading...</div>}

          {!loading && wizardOpen && (
            <ServiceRequestWizard
              onClose={() => setWizardOpen(false)}
              onSubmitted={handleWizardSubmitted}
            />
          )}

          {!loading && !wizardOpen && tab === "mine" && focusedRequestId && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setFocusedRequestId(null)}
                className="inline-flex items-center gap-1 text-sm font-medium text-cyan-700 hover:underline dark:text-cyan-300"
              >
                <ChevronLeft className="h-4 w-4" />
                All requests
              </button>
              {focusedRequest ? (
                <>
                  <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                    Review the offer below and pick a provider to start messaging.
                  </div>
                  {renderMyRequestCard(focusedRequest)}
                </>
              ) : (
                <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
                  This request is no longer available.
                </p>
              )}
            </div>
          )}

          {!loading && !wizardOpen && tab === "mine" && !focusedRequestId && (
            <div className="space-y-4">
              {myRequests.length === 0 && (
                <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
                  No service requests yet. Use{" "}
                  <span className="font-medium text-gray-900 dark:text-white">New request</span>{" "}
                  to send a request to a coach or Performance Team member.
                </p>
              )}
              {myRequests.map((request) => renderMyRequestCard(request))}
            </div>
          )}

          {!loading && !wizardOpen && tab === "incoming" && (
            <div className="space-y-4">
              {incoming.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
                  No incoming service requests for your provider profile.
                </p>
              ) : focusedIncomingRequestId ? (
                <>
                  <button
                    type="button"
                    onClick={() => setFocusedIncomingRequestId(null)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-cyan-700 hover:underline dark:text-cyan-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    All incoming requests
                  </button>
                  {focusedIncomingRequest ? (
                    renderIncomingDetail(focusedIncomingRequest)
                  ) : (
                    <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
                      This request is no longer available.
                    </p>
                  )}
                </>
              ) : (
                renderIncomingSummaryList()
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
