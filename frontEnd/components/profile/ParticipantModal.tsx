"use client";

import React, { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { EP } from "@/app/lib/endpoints";
import { fetchJSON } from "@/app/lib/api";
import { useMe } from "@/app/hooks/useAuth";

interface ParticipantModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: (formData: ParticipantFormData) => void;
  renderInline?: boolean;
}

interface ParticipantFormData {
  sportGroup: string;
  mainSport: string;
  skillLevel: number;
  sportGoal: string;
}

interface SportGroup {
  _id: string;
  name: string;
}

interface Sport {
  _id: string;
  name: string;
  group: string;
  groupName: string;
}

interface SportGoal {
  _id: string;
  name: string;
}

const ParticipantModal: React.FC<ParticipantModalProps> = ({
  isOpen = false,
  onClose,
  onSubmit,
  renderInline = false,
}) => {
  const { data: user, isLoading: userLoading } = useMe();
  const participantId = user?.participant;

  const [formData, setFormData] = useState<ParticipantFormData>({
    sportGroup: "",
    mainSport: "",
    skillLevel: 5,
    sportGoal: "",
  });

  const [sportGroups, setSportGroups] = useState<SportGroup[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportGoals, setSportGoals] = useState<SportGoal[]>([]);

  const [showSportGroupDropdown, setShowSportGroupDropdown] = useState(false);
  const [showSportDropdown, setShowSportDropdown] = useState(false);
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  const [selectedSportGroupName, setSelectedSportGroupName] = useState("");
  const [selectedSportName, setSelectedSportName] = useState("");
  const [selectedGoalName, setSelectedGoalName] = useState("");

  const skillLevels = [
    { value: 1, label: "Beginner (1-2)", range: [1, 2] },
    { value: 3, label: "Beginner+ (3-4)", range: [3, 4] },
    { value: 5, label: "Intermediate (5-6)", range: [5, 6] },
    { value: 7, label: "Advanced (7-8)", range: [7, 8] },
    { value: 9, label: "Professional (9-10)", range: [9, 10] },
  ];

  const isVisible = renderInline ? true : isOpen;

  useEffect(() => {
    if (isVisible && !userLoading) {
      loadData();
    }
  }, [isVisible, participantId, userLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".dropdown-container")) {
        setShowSportGroupDropdown(false);
        setShowSportDropdown(false);
        setShowGoalDropdown(false);
      }
    };

    if (showSportGroupDropdown || showSportDropdown || showGoalDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSportGroupDropdown, showSportDropdown, showGoalDropdown]);

  const loadData = async () => {
    setInitializing(true);
    try {
      if (participantId) {
        await fetchParticipantData();
        setIsEditMode(true);
      } else {
        resetForm();
      }
    } finally {
      setInitializing(false);
    }
  };

  const fetchParticipantData = async () => {
    if (!participantId) return;

    try {
      const res = await fetchJSON(EP.PARTICIPANT.getDetails(participantId), {
        method: "GET",
      });

      if (res.success && res.data) {
        const participantData = res.data.participant || res.data;

        const mainSportId =
          typeof participantData.mainSport === "string"
            ? participantData.mainSport
            : participantData.mainSport?._id || "";

        const sportGroupId = participantData.mainSport?.group || "";

        const sportGoalId =
          typeof participantData.sportGoal === "string"
            ? participantData.sportGoal
            : participantData.sportGoal?._id || "";

        const skillLevel = participantData.skillLevel || 5;

        const sportGroupName = participantData.mainSport?.groupName || "";
        const sportName = participantData.mainSport?.name || "";
        const goalName = participantData.sportGoal?.name || "";

        setSelectedSportGroupName(sportGroupName);
        setSelectedSportName(sportName);
        setSelectedGoalName(goalName);

        setFormData({
          sportGroup: sportGroupId,
          mainSport: mainSportId,
          skillLevel: skillLevel,
          sportGoal: sportGoalId,
        });

        if (sportGroupId) {
          await fetchSportsInGroup(sportGroupId);
        }

        console.log("Loaded participant data with names:", {
          sportGroup: sportGroupId,
          sportGroupName: sportGroupName,
          mainSport: mainSportId,
          sportName: sportName,
          skillLevel: skillLevel,
          sportGoal: sportGoalId,
          goalName: goalName,
        });
      }
    } catch (err) {
      console.error("Error fetching participant data:", err);
    }
  };

  const fetchSportGroups = async () => {
    setLoading(true);
    try {
      const res = await fetchJSON(EP.REFERENCE.sportGroup, {
        method: "POST",
        body: { perPage: 20, pageNumber: 1 },
      });

      if (res.success && res.data) {
        setSportGroups(res.data);
      }
    } catch (err) {
      console.error("Error fetching sport groups:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSportsInGroup = async (groupId: string) => {
    setLoading(true);
    try {
      const res = await fetchJSON(EP.REFERENCE.sport, {
        method: "POST",
        body: {
          perPage: 50,
          pageNumber: 1,
          groupId: groupId,
        },
      });

      if (res.success && res.data) {
        setSports(res.data);
      }
    } catch (err) {
      console.error("Error fetching sports for group:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSportGoals = async () => {
    setLoading(true);
    try {
      const res = await fetchJSON(EP.REFERENCE.sportGoal, {
        method: "POST",
        body: { perPage: 20, pageNumber: 1 },
      });

      if (res.success && res.data) {
        setSportGoals(res.data);
      }
    } catch (err) {
      console.error("Error fetching sport goals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showSportGroupDropdown && sportGroups.length === 0) {
      fetchSportGroups();
    }
  }, [showSportGroupDropdown]);

  useEffect(() => {
    if (formData.sportGroup) {
      fetchSportsInGroup(formData.sportGroup);
    } else {
      setSports([]);
    }
  }, [formData.sportGroup]);

  useEffect(() => {
    if (showGoalDropdown && sportGoals.length === 0) {
      fetchSportGoals();
    }
  }, [showGoalDropdown]);

  const handleInputChange = (
    field: keyof ParticipantFormData,
    value: string | number,
    displayName?: string
  ) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };

      if (field === "sportGroup") {
        updated.mainSport = "";
        setSelectedSportName("");
        if (displayName) setSelectedSportGroupName(displayName);
      }

      if (field === "mainSport" && displayName) {
        setSelectedSportName(displayName);
      }

      if (field === "sportGoal" && displayName) {
        setSelectedGoalName(displayName);
      }

      return updated;
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !formData.sportGroup ||
      !formData.mainSport ||
      !formData.sportGoal ||
      !formData.skillLevel
    ) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isEditMode
        ? EP.PARTICIPANT.editProfile
        : EP.PARTICIPANT.createProfile;

      const payload = {
        mainSport: formData.mainSport,
        skillLevel: formData.skillLevel,
        sportGoal: formData.sportGoal,
      };

      const res = await fetchJSON(endpoint, {
        method: "POST",
        body: payload,
      });

      if (res.success) {
        onSubmit(formData);
        setIsEditMode(true);
        if (!renderInline) {
          handleClose();
        }
      } else {
        setError(res.message || "Failed to save participant profile");
      }
    } catch (err) {
      console.error("Error saving participant profile:", err);
      setError("Failed to save participant profile");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sportGroup: "",
      mainSport: "",
      skillLevel: 5,
      sportGoal: "",
    });
    setIsEditMode(false);
    setSelectedSportGroupName("");
    setSelectedSportName("");
    setSelectedGoalName("");
  };

  const handleClose = () => {
    onClose();
    setError("");
    resetForm();
  };

  const getSelectedSportGroupName = () => {
    if (!formData.sportGroup) return "Select Sport Group";
    if (selectedSportGroupName) return selectedSportGroupName;
    const group = sportGroups.find((g) => g._id === formData.sportGroup);
    return group ? group.name : "Select Sport Group";
  };

  const getSelectedSportName = () => {
    if (!formData.mainSport) return "Select Sport";
    if (selectedSportName) return selectedSportName;
    const sport = sports.find((s) => s._id === formData.mainSport);
    return sport ? sport.name : "Select Sport";
  };

  const getSelectedGoalName = () => {
    if (!formData.sportGoal) return "Select Goal";
    if (selectedGoalName) return selectedGoalName;
    const goal = sportGoals.find((g) => g._id === formData.sportGoal);
    return goal ? goal.name : "Select Goal";
  };

  const getSkillLevelLabel = () => {
    const level = skillLevels.find(
      (l) =>
        formData.skillLevel >= l.range[0] && formData.skillLevel <= l.range[1]
    );
    return level ? level.label : `Level ${formData.skillLevel}`;
  };

  if (!isVisible) return null;

  if (userLoading || !user) {
    return null;
  }

  const formClasses = renderInline
    ? "p-4 sm:p-5 space-y-4"
    : "p-6 space-y-4 dark:bg-gray-800";

  const formContent = (
    <form onSubmit={handleSubmit} className={formClasses}>
      {initializing && (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Loading profile...
            </p>
          </div>
        </div>
      )}

      <div
        className={initializing ? "opacity-0 pointer-events-none" : "space-y-4"}
      >
        {/* Sport Group Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sport Group <span className="text-red-500">*</span>
          </label>
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={() => setShowSportGroupDropdown(!showSportGroupDropdown)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-left flex items-center justify-between bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || initializing}
            >
              <span
                className={
                  formData.sportGroup
                    ? "text-gray-800 dark:text-white"
                    : "text-gray-400 dark:text-gray-500"
                }
              >
                {getSelectedSportGroupName()}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </button>

            {showSportGroupDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {loading ? (
                  <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    Loading...
                  </div>
                ) : sportGroups.length > 0 ? (
                  sportGroups.map((group) => (
                    <button
                      key={group._id}
                      type="button"
                      onClick={() => {
                        handleInputChange("sportGroup", group._id, group.name);
                        setShowSportGroupDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors first:rounded-t-lg last:rounded-b-lg dark:text-white"
                    >
                      {group.name}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No sport groups available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Sport Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Main Sport <span className="text-red-500">*</span>
          </label>
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={() => {
                if (formData.sportGroup) {
                  setShowSportDropdown(!showSportDropdown);
                }
              }}
              className={`w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-left flex items-center justify-between bg-white dark:bg-gray-700 ${
                !formData.sportGroup || loading || initializing
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              disabled={loading || !formData.sportGroup || initializing}
            >
              <span
                className={
                  formData.mainSport
                    ? "text-gray-800 dark:text-white"
                    : "text-gray-400 dark:text-gray-500"
                }
              >
                {getSelectedSportName()}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </button>

            {showSportDropdown && formData.sportGroup && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {loading ? (
                  <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    Loading...
                  </div>
                ) : sports.length > 0 ? (
                  sports.map((sport) => (
                    <button
                      key={sport._id}
                      type="button"
                      onClick={() => {
                        handleInputChange("mainSport", sport._id, sport.name);
                        setShowSportDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors first:rounded-t-lg last:rounded-b-lg dark:text-white"
                    >
                      {sport.name}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No sports in this group
                  </div>
                )}
              </div>
            )}
          </div>
          {!formData.sportGroup && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Please select a sport group first
            </p>
          )}
        </div>

        {/* Skill Level Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Skill Level <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="10"
              value={formData.skillLevel}
              onChange={(e) =>
                handleInputChange("skillLevel", Number(e.target.value))
              }
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || initializing}
            />
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Beginner (1)</span>
              <span className="font-medium text-cyan-600 dark:text-cyan-400">
                {getSkillLevelLabel()}
              </span>
              <span>Pro (10)</span>
            </div>
          </div>
        </div>

        {/* Sport Goal Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sport Goal <span className="text-red-500">*</span>
          </label>
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={() => setShowGoalDropdown(!showGoalDropdown)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-left flex items-center justify-between bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || initializing}
            >
              <span
                className={
                  formData.sportGoal
                    ? "text-gray-800 dark:text-white"
                    : "text-gray-400 dark:text-gray-500"
                }
              >
                {getSelectedGoalName()}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </button>

            {showGoalDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {loading ? (
                  <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    Loading...
                  </div>
                ) : sportGoals.length > 0 ? (
                  sportGoals.map((goal) => (
                    <button
                      key={goal._id}
                      type="button"
                      onClick={() => {
                        handleInputChange("sportGoal", goal._id, goal.name);
                        setShowGoalDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors first:rounded-t-lg last:rounded-b-lg dark:text-white"
                    >
                      {goal.name}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No goals available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={renderInline ? resetForm : handleClose}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || initializing}
        >
          {renderInline ? "Reset" : "Cancel"}
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || initializing}
        >
          {loading ? "Saving..." : isEditMode ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );

  if (renderInline) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">
              {isEditMode ? "Participant Profile" : "Create Participant Profile"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Save your participant preferences to personalize events.
            </p>
          </div>
          {isEditMode && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 rounded">
              In use
            </span>
          )}
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {isEditMode
              ? "Edit Participant Profile"
              : "Create Participant Profile"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {formContent}
      </div>
    </div>
  );
};

export default ParticipantModal;
