"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";
import { getLevelDefinition } from "@/app/lib/level-definitions";
import {
  questionsForTarget,
  type ServiceRequestQuestion,
  type ServiceRequestTargetType,
} from "@/app/lib/service-request-questions";

const PERFORMANCE_BRANCHES = [
  { value: "manager", label: "Manager" },
  { value: "psychologist", label: "Psychologist" },
  { value: "dietitian", label: "Dietitian" },
  { value: "psychotherapist", label: "Psychotherapist" },
] as const;

type SportGroup = { _id: string; name: string };
type Sport = { _id: string; name: string; group: string };

type Props = {
  onClose: () => void;
  onSubmitted: () => void;
};

type LocationFields = {
  country: string;
  city: string;
  district: string;
};

type SportFields = {
  sportGroupId: string;
  sportGroupName: string;
  sportId: string;
  sportName: string;
};

function formatLocation(fields: LocationFields) {
  return [fields.country, fields.city, fields.district].filter(Boolean).join(" / ");
}

function validateStep(
  stepKey: string,
  question: ServiceRequestQuestion | null,
  values: {
    targetType: ServiceRequestTargetType;
    performanceBranch: string;
    sport: SportFields;
    useProfileLevel: boolean;
    skillLevel: number;
    singleValues: Record<string, string>;
    multiValues: Record<string, string[]>;
    location: LocationFields;
    additionalDetails: string;
    emailConsent: boolean;
    budgetAmount: string;
  }
): string | null {
  if (stepKey === "target") {
    if (values.targetType === "performance" && !values.performanceBranch) {
      return "Please select a Performance Team branch.";
    }
    return null;
  }

  if (!question) return null;

  switch (question.type) {
    case "sport_select":
      if (!values.sport.sportGroupId || !values.sport.sportId) {
        return "Please select both sport group and branch.";
      }
      return null;
    case "level_confirm":
      if (!values.useProfileLevel && !values.skillLevel) {
        return "Please confirm your level.";
      }
      return null;
    case "single_choice":
      if (!values.singleValues[question.key]?.trim()) {
        return "Please select an option.";
      }
      if (question.key === "budget" && values.singleValues.budget === "I have set a monthly budget") {
        if (!values.budgetAmount.trim()) {
          return "Please enter your monthly budget amount.";
        }
      }
      return null;
    case "location":
      if (!values.location.country.trim() || !values.location.city.trim() || !values.location.district.trim()) {
        return "Country, city, and district are required.";
      }
      return null;
    case "multi_choice":
      if (!(values.multiValues[question.key]?.length > 0)) {
        return "Please select at least one option.";
      }
      return null;
    case "textarea":
      if (!values.additionalDetails.trim()) {
        return "Please add a short answer or write \"None\".";
      }
      return null;
    case "consent":
      if (!values.emailConsent) {
        return "You must allow email contact to submit this request.";
      }
      return null;
    default:
      return null;
  }
}

export default function ServiceRequestWizard({ onClose, onSubmitted }: Props) {
  const { data: user } = useMe();
  const [targetType, setTargetType] = useState<ServiceRequestTargetType>("coach");
  const [performanceBranch, setPerformanceBranch] = useState("dietitian");
  const [stepIndex, setStepIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"forward" | "back">("forward");
  const [stepVisible, setStepVisible] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sportGroups, setSportGroups] = useState<SportGroup[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [skillLevel, setSkillLevel] = useState(5);
  const [useProfileLevel, setUseProfileLevel] = useState(true);
  const [sport, setSport] = useState<SportFields>({
    sportGroupId: "",
    sportGroupName: "",
    sportId: "",
    sportName: "",
  });
  const [location, setLocation] = useState<LocationFields>({
    country: "",
    city: "",
    district: "",
  });
  const [singleValues, setSingleValues] = useState<Record<string, string>>({});
  const [multiValues, setMultiValues] = useState<Record<string, string[]>>({});
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");

  const answerSteps = useMemo(() => questionsForTarget(targetType), [targetType]);
  const steps = useMemo(
    () => [{ id: "target" as const }, ...answerSteps.map((q) => ({ id: q.key, question: q }))],
    [answerSteps]
  );
  const totalSteps = steps.length;
  const currentStep = steps[stepIndex];
  const currentQuestion = "question" in currentStep ? currentStep.question : null;
  const wizardTitle = targetType === "coach" ? "Coach Me" : "Performance Team Request";

  useEffect(() => {
    void fetchJSON(EP.PUBLIC.sportGroups({ page: 1, limit: 100 }), { method: "GET" }, { skipAuth: true }).then(
      (res) => {
        if (res?.success && Array.isArray(res.data)) setSportGroups(res.data);
      }
    );
  }, []);

  useEffect(() => {
    if (!sport.sportGroupId) {
      setSports([]);
      return;
    }
    void fetchJSON(
      EP.PUBLIC.sports({ page: 1, limit: 100, sportGroup: sport.sportGroupId }),
      { method: "GET" },
      { skipAuth: true }
    ).then((res) => {
      setSports(res?.success && Array.isArray(res.data) ? res.data : []);
    });
  }, [sport.sportGroupId]);

  useEffect(() => {
    const userLocation = user?.location as
      | {
          country?: string;
          state?: string;
          city?: string;
          district?: string | { name?: string };
          districtName?: string;
        }
      | undefined;

    const districtName =
      typeof userLocation?.district === "object"
        ? userLocation.district.name || ""
        : userLocation?.districtName || String(userLocation?.district || "");

    setLocation({
      country: userLocation?.country || "",
      city: userLocation?.city || userLocation?.state || "",
      district: districtName,
    });
  }, [user?.location]);

  useEffect(() => {
    if (!user?.participant) return;
    let cancelled = false;
    void fetchJSON(EP.PARTICIPANT.getDetails(String(user.participant)), { method: "GET" }).then((res) => {
      if (cancelled || !res?.success || !res.data) return;
      const participant = res.data.participant || res.data;
      if (participant.skillLevel) setSkillLevel(Number(participant.skillLevel));

      const sportGroupId = participant.mainSportGroup || participant.mainSport?.group || "";
      const sportGroupName = participant.mainSportGroupName || participant.mainSport?.groupName || "";
      const sportId = participant.mainSport?._id || participant.mainSport || "";
      const sportName = participant.mainSportName || participant.mainSport?.name || "";

      if (sportGroupId || sportId) {
        setSport({
          sportGroupId: String(sportGroupId),
          sportGroupName: String(sportGroupName),
          sportId: String(sportId),
          sportName: String(sportName),
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.participant]);

  useEffect(() => {
    setStepIndex(0);
    setError("");
    setStepVisible(true);
  }, [targetType]);

  const transitionToStep = (nextIndex: number, direction: "forward" | "back") => {
    setSlideDirection(direction);
    setStepVisible(false);
    window.setTimeout(() => {
      setStepIndex(nextIndex);
      setStepVisible(true);
    }, 180);
  };

  const goNext = () => {
    const validationError = validateStep(currentStep.id, currentQuestion, {
      targetType,
      performanceBranch,
      sport,
      useProfileLevel,
      skillLevel,
      singleValues,
      multiValues,
      location,
      additionalDetails,
      emailConsent,
      budgetAmount,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    transitionToStep(Math.min(totalSteps - 1, stepIndex + 1), "forward");
  };

  const goBack = () => {
    setError("");
    transitionToStep(Math.max(0, stepIndex - 1), "back");
  };

  const toggleMulti = (key: string, option: string) => {
    setMultiValues((prev) => {
      const current = prev[key] || [];
      return {
        ...prev,
        [key]: current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
      };
    });
  };

  const buildPayloadAnswers = () => {
    const levelDef = getLevelDefinition(skillLevel);
    const levelAnswer =
      useProfileLevel && levelDef
        ? `Level ${levelDef.level} – ${levelDef.label}: ${levelDef.description}`
        : `Level ${skillLevel}`;

    const budgetChoice = singleValues.budget || "";
    const budgetAnswer =
      budgetChoice === "I have set a monthly budget"
        ? `${budgetChoice}: ${budgetAmount.trim()}`
        : budgetChoice;

    const payload: Record<string, string | string[]> = {
      level: levelAnswer,
      sportsGoal: singleValues.sportsGoal || "",
      sessionFormat: singleValues.sessionFormat || "",
      instructorGender: singleValues.instructorGender || "",
      location: formatLocation(location),
      budget: budgetAnswer,
      availableDays: multiValues.availableDays || [],
      availableTimes: multiValues.availableTimes || [],
      facilityPreference: singleValues.facilityPreference || "",
      additionalDetails: additionalDetails.trim(),
      emailConsent: emailConsent ? "Yes, I allow email contact" : "",
    };

    if (targetType === "coach") {
      payload.sportGroupBranch = `${sport.sportGroupName} / ${sport.sportName}`.trim();
    }

    return payload;
  };

  const handleSubmit = async () => {
    const validationError = validateStep(currentStep.id, currentQuestion, {
      targetType,
      performanceBranch,
      sport,
      useProfileLevel,
      skillLevel,
      singleValues,
      multiValues,
      location,
      additionalDetails,
      emailConsent,
      budgetAmount,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      const res = await fetchJSON(EP.SERVICE_REQUESTS.create, {
        method: "POST",
        body: {
          targetType,
          performanceBranch: targetType === "performance" ? performanceBranch : undefined,
          title: wizardTitle,
          answers: buildPayloadAnswers(),
        },
      });
      if (res?.success === false) {
        throw new Error(res?.message || "Service request could not be created.");
      }
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Service request could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const renderQuestionBody = (question: ServiceRequestQuestion) => {
    switch (question.type) {
      case "sport_select":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sport group</span>
              <select
                value={sport.sportGroupId}
                onChange={(event) => {
                  const group = sportGroups.find((item) => item._id === event.target.value);
                  setSport({
                    sportGroupId: event.target.value,
                    sportGroupName: group?.name || "",
                    sportId: "",
                    sportName: "",
                  });
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700"
              >
                <option value="">Select sport group</option>
                {sportGroups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Branch</span>
              <select
                value={sport.sportId}
                disabled={!sport.sportGroupId}
                onChange={(event) => {
                  const selected = sports.find((item) => item._id === event.target.value);
                  setSport((prev) => ({
                    ...prev,
                    sportId: event.target.value,
                    sportName: selected?.name || "",
                  }));
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700"
              >
                <option value="">Select branch</option>
                {sports.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        );
      case "level_confirm": {
        const levelDef = getLevelDefinition(skillLevel);
        return (
          <div className="space-y-4">
            <label className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50/70 p-4 dark:border-cyan-900 dark:bg-cyan-950/20">
              <input
                type="checkbox"
                checked={useProfileLevel}
                onChange={(event) => setUseProfileLevel(event.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                  Use my profile level
                </span>
                <span className="block text-sm text-gray-600 dark:text-gray-300">
                  {levelDef
                    ? `Level ${levelDef.level} – ${levelDef.label}: ${levelDef.description}`
                    : `Level ${skillLevel}`}
                </span>
              </span>
            </label>
            {!useProfileLevel && (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Adjust level (1–10)</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={skillLevel}
                  onChange={(event) => setSkillLevel(Number(event.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {getLevelDefinition(skillLevel)?.label || `Level ${skillLevel}`}
                </div>
              </label>
            )}
          </div>
        );
      }
      case "single_choice":
        return (
          <div className="space-y-3">
            <div className="grid gap-2">
              {(question.options || []).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSingleValues((prev) => ({ ...prev, [question.key]: option }))}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                    singleValues[question.key] === option
                      ? "border-cyan-500 bg-cyan-50 text-cyan-900 shadow-sm dark:bg-cyan-950/30 dark:text-cyan-100"
                      : "border-gray-200 hover:border-cyan-300 dark:border-gray-700"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {question.key === "budget" && singleValues.budget === "I have set a monthly budget" && (
              <input
                value={budgetAmount}
                onChange={(event) => setBudgetAmount(event.target.value)}
                placeholder="Enter your monthly budget"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700"
              />
            )}
          </div>
        );
      case "location":
        return (
          <div className="grid gap-4 sm:grid-cols-3">
            {(["country", "city", "district"] as const).map((field) => (
              <label key={field} className="space-y-2">
                <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{field}</span>
                <input
                  value={location[field]}
                  onChange={(event) => setLocation((prev) => ({ ...prev, [field]: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700"
                />
              </label>
            ))}
          </div>
        );
      case "multi_choice":
        return (
          <div className="flex flex-wrap gap-2">
            {(question.options || []).map((option) => {
              const selected = (multiValues[question.key] || []).includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleMulti(question.key, option)}
                  className={`rounded-full border px-4 py-2 text-sm transition-all ${
                    selected
                      ? "border-cyan-500 bg-cyan-600 text-white"
                      : "border-gray-200 text-gray-700 hover:border-cyan-300 dark:border-gray-700 dark:text-gray-200"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        );
      case "textarea":
        return (
          <textarea
            value={additionalDetails}
            onChange={(event) => setAdditionalDetails(event.target.value)}
            rows={5}
            placeholder="Share anything else providers should know..."
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700"
          />
        );
      case "consent":
        return (
          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <input
              type="checkbox"
              checked={emailConsent}
              onChange={(event) => setEmailConsent(event.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-gray-700 dark:text-gray-200">
              I allow sports coaches and providers to contact me via email about this request.
            </span>
          </label>
        );
      default:
        return null;
    }
  };

  const renderStepContent = () => {
    if (currentStep.id === "target") {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTargetType("coach")}
              className={`rounded-2xl border p-5 text-left transition-all ${
                targetType === "coach"
                  ? "border-cyan-500 bg-cyan-50 shadow-md dark:bg-cyan-950/30"
                  : "border-gray-200 hover:border-cyan-300 dark:border-gray-700"
              }`}
            >
              <div className="text-lg font-semibold text-gray-900 dark:text-white">Coach</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Request coaching support for your sport branch.
              </div>
            </button>
            <div
              className={`rounded-2xl border p-5 transition-all ${
                targetType === "performance"
                  ? "border-cyan-500 bg-cyan-50 shadow-md dark:bg-cyan-950/30"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <button type="button" onClick={() => setTargetType("performance")} className="w-full text-left">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">Performance Team</div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Request support from manager, psychologist, dietitian, or psychotherapist.
                </div>
              </button>
              {targetType === "performance" && (
                <select
                  value={performanceBranch}
                  onChange={(event) => setPerformanceBranch(event.target.value)}
                  className="mt-4 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700"
                >
                  {PERFORMANCE_BRANCHES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (!currentQuestion) return null;

    return (
      <div className="space-y-4">
        {currentQuestion.helperText && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{currentQuestion.helperText}</p>
        )}
        {renderQuestionBody(currentQuestion)}
      </div>
    );
  };

  const stepTitle = currentStep.id === "target" ? "Choose request type" : currentQuestion?.question || "";

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-cyan-200 bg-gradient-to-br from-white to-cyan-50/40 shadow-lg dark:border-cyan-900 dark:from-gray-800 dark:to-cyan-950/20">
      <div className="flex items-center justify-between border-b border-cyan-100 px-5 py-4 dark:border-cyan-900/50">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
            {wizardTitle}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{stepTitle}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Step {stepIndex + 1} of {totalSteps}
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-5 pt-4">
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-cyan-600 transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="overflow-hidden px-5 pb-5">
        <div
          className={`transform transition-all duration-300 ease-out ${
            stepVisible
              ? "translate-x-0 opacity-100"
              : slideDirection === "forward"
                ? "-translate-x-6 opacity-0"
                : "translate-x-6 opacity-0"
          }`}
        >
          {renderStepContent()}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={goBack}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm disabled:opacity-50 dark:border-gray-600"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          {stepIndex < totalSteps - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-700"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? "Submitting..." : "Submit request"}
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
