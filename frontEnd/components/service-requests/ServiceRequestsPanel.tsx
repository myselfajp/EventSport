"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, MessageSquare, X } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

const PERFORMANCE_BRANCHES = [
  { value: "manager", label: "Manager" },
  { value: "psychologist", label: "Psychologist" },
  { value: "dietitian", label: "Dietitian" },
  { value: "psychotherapist", label: "Psychotherapist" },
];

const FALLBACK_QUESTIONS = [
  { key: "skillLevel", question: "What is your current skill level?" },
  { key: "goal", question: "What goal do you want to achieve?" },
  { key: "sessionFormat", question: "Do you prefer private sessions or group sessions?" },
  { key: "locationPreference", question: "Where would you like to receive the service?" },
  { key: "budget", question: "Do you have a budget, and if so, how much?" },
  { key: "availability", question: "Which days and times are you available?" },
  { key: "experience", question: "Have you received support in this area before?" },
  { key: "duration", question: "How long do you want to receive support?" },
  { key: "communicationPreference", question: "Do you prefer online or in-person sessions?" },
  { key: "notes", question: "Is there anything else you want to add?" },
];

type Question = {
  key: string;
  question: string;
};

type ServiceRequestResponse = {
  _id: string;
  providerUser?: {
    _id: string;
    firstName?: string;
    lastName?: string;
  };
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
};

function providerLabel(response: ServiceRequestResponse) {
  const userName = `${response.providerUser?.firstName || ""} ${response.providerUser?.lastName || ""}`.trim();
  return (
    response.coach?.name ||
    response.performanceMember?.name ||
    userName ||
    "Provider"
  );
}

function requestTargetLabel(request: ServiceRequest) {
  if (request.targetType === "coach") return "Coach";
  const match = PERFORMANCE_BRANCHES.find((b) => b.value === request.performanceBranch);
  return match ? match.label : "Performance Team";
}

export default function ServiceRequestsPanel({
  isOpen,
  onClose,
  hasGamerProfile,
  isProvider,
  preferredTab = null,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"mine" | "incoming">("mine");
  const [questions, setQuestions] = useState<Question[]>(FALLBACK_QUESTIONS);
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  const [incoming, setIncoming] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [targetType, setTargetType] = useState<"coach" | "performance">("performance");
  const [performanceBranch, setPerformanceBranch] = useState("dietitian");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [interestMessage, setInterestMessage] = useState<Record<string, string>>({});

  const activeQuestion = questions[step];
  const canCreate = hasGamerProfile;
  const visibleTabs = useMemo(
    () => [
      ...(hasGamerProfile ? [{ id: "mine" as const, label: "My Requests" }] : []),
      ...(isProvider ? [{ id: "incoming" as const, label: "Incoming Requests" }] : []),
    ],
    [hasGamerProfile, isProvider]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (preferredTab && visibleTabs.find((item) => item.id === preferredTab)) {
      setTab(preferredTab);
      return;
    }
    if (!visibleTabs.find((item) => item.id === tab)) {
      setTab(visibleTabs[0]?.id || "mine");
    }
  }, [isOpen, preferredTab, tab, visibleTabs]);

  useEffect(() => {
    if (!isOpen) return;
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const questionRes = await fetchJSON(EP.SERVICE_REQUESTS.questions, {
        method: "GET",
      });
      if (questionRes?.success && Array.isArray(questionRes.data)) {
        setQuestions(questionRes.data);
      }

      if (hasGamerProfile && tab === "mine") {
        const res = await fetchJSON(EP.SERVICE_REQUESTS.mine, { method: "GET" });
        if (res?.success) setMyRequests(res.data || []);
      }

      if (isProvider && tab === "incoming") {
        const res = await fetchJSON(EP.SERVICE_REQUESTS.incoming, { method: "GET" });
        if (res?.success) setIncoming(res.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Service requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const submitWizard = async () => {
    try {
      setLoading(true);
      setError("");
      const payload = {
        targetType,
        performanceBranch: targetType === "performance" ? performanceBranch : undefined,
        title:
          targetType === "coach"
            ? "Coach service request"
            : `${requestTargetLabel({
                _id: "",
                targetType,
                performanceBranch,
                status: "open",
              })} service request`,
        answers,
      };
      const res = await fetchJSON(EP.SERVICE_REQUESTS.create, {
        method: "POST",
        body: payload,
      });
      if (res?.success === false) {
        throw new Error(res?.message || "Service request could not be created.");
      }
      setWizardOpen(false);
      setStep(0);
      setAnswers({});
      setTab("mine");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Service request could not be created.");
    } finally {
      setLoading(false);
    }
  };

  const respond = async (requestId: string) => {
    try {
      setError("");
      const res = await fetchJSON(EP.SERVICE_REQUESTS.respond(requestId), {
        method: "POST",
        body: { message: interestMessage[requestId] || "" },
      });
      if (res?.success === false) {
        throw new Error(res?.message || "Interest could not be sent.");
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Interest could not be sent.");
    }
  };

  const selectProvider = async (requestId: string, responseId: string) => {
    try {
      setError("");
      const res = await fetchJSON(
        EP.SERVICE_REQUESTS.selectResponse(requestId, responseId),
        { method: "POST" }
      );
      if (res?.success === false) {
        throw new Error(res?.message || "Provider could not be selected.");
      }
      const conversationId = res?.data?.conversation?._id;
      if (conversationId) {
        router.push(`/messaging?conversationId=${conversationId}`);
        onClose();
      } else {
        await loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provider could not be selected.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Service Requests
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Gamers create requests, providers show interest, gamer chooses.
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
                onClick={() => setTab(item.id)}
                className={`px-4 py-2 text-sm ${
                  tab === item.id
                    ? "bg-cyan-600 text-white"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              Open Service Request
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
            <div className="mb-6 rounded-xl border border-cyan-200 bg-cyan-50 p-5 dark:border-cyan-900 dark:bg-cyan-950/20">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Step {step + 1} / {questions.length}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {step === 0 ? "Choose request target, then answer the questions." : activeQuestion.question}
                  </p>
                </div>
                <button onClick={() => setWizardOpen(false)} className="text-gray-500">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {step === 0 && (
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setTargetType("coach")}
                    className={`rounded-lg border p-3 text-left ${
                      targetType === "coach"
                        ? "border-cyan-500 bg-white dark:bg-gray-800"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    Coach
                  </button>
                  <div
                    className={`rounded-lg border p-3 ${
                      targetType === "performance"
                        ? "border-cyan-500 bg-white dark:bg-gray-800"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setTargetType("performance")}
                      className="mb-2 block w-full text-left"
                    >
                      Performance Team
                    </button>
                    <select
                      value={performanceBranch}
                      onChange={(e) => {
                        setTargetType("performance");
                        setPerformanceBranch(e.target.value);
                      }}
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                    >
                      {PERFORMANCE_BRANCHES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {activeQuestion.question}
              </label>
              <textarea
                value={answers[activeQuestion.key] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [activeQuestion.key]: e.target.value }))
                }
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
              />

              <div className="mt-4 flex justify-between">
                <button
                  type="button"
                  disabled={step === 0}
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                {step < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(questions.length - 1, s + 1))}
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm text-white"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submitWizard}
                    className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm text-white"
                  >
                    <Check className="h-4 w-4" />
                    Submit
                  </button>
                )}
              </div>
            </div>
          )}

          {!loading && tab === "mine" && (
            <div className="space-y-4">
              {myRequests.length === 0 && (
                <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
                  No service requests yet.
                </p>
              )}
              {myRequests.map((request) => (
                <div key={request._id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {request.title || requestTargetLabel(request)}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {requestTargetLabel(request)} · {request.status}
                      </p>
                    </div>
                    <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-100">
                      {request.responses?.length || 0} interested
                    </span>
                  </div>
                  <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
                    {(request.answers || []).slice(0, 4).map((answer) => (
                      <div key={answer.key} className="rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                        <div className="text-xs text-gray-500">{answer.question}</div>
                        <div className="text-gray-800 dark:text-gray-100">{answer.answer || "-"}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {(request.responses || []).map((response) => (
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
                          disabled={request.status !== "open" || response.status !== "interested"}
                          onClick={() => selectProvider(request._id, response._id)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Choose & Message
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === "incoming" && (
            <div className="space-y-4">
              {incoming.length === 0 && (
                <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
                  No incoming service requests for your provider profile.
                </p>
              )}
              {incoming.map((request) => (
                <div key={request._id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {request.title || requestTargetLabel(request)}
                      </h3>
                      <p className="text-xs text-gray-500">
                        From {`${request.requester?.firstName || ""} ${request.requester?.lastName || ""}`.trim() || "Gamer"}
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
                        <div className="text-gray-800 dark:text-gray-100">{answer.answer || "-"}</div>
                      </div>
                    ))}
                  </div>
                  {request.myResponse ? (
                    <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-200">
                      You already showed interest. Status: {request.myResponse.status}
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
                        placeholder="Short message to gamer..."
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => respond(request._id)}
                        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                      >
                        I am interested
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
